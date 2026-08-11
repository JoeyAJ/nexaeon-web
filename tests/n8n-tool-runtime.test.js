import assert from 'node:assert/strict';
import test from 'node:test';

import { buildN8nServiceHeaders, getN8nServiceToken, verifyN8nServiceToken } from '../lib/agent/n8nServiceAuth.js';
import { createN8nToolAuditCollector, createN8nToolAuditRecord } from '../lib/agent/n8nToolAudit.js';
import { createN8nToolClient, executeN8nHttpRequest } from '../lib/agent/n8nToolClient.js';
import {
  MAX_N8N_TOOL_REQUEST_BYTES, createN8nToolRequest, parseN8nToolResponse,
  validateN8nToolRequest, validateN8nToolResponse,
} from '../lib/agent/n8nToolContracts.js';
import { N8N_TOOL_ERROR_CODES, N8nToolError } from '../lib/agent/n8nToolErrors.js';
import { N8N_TOOL_CONTRACT_VERSION, getExecutionTool } from '../lib/agent/toolExecutionRegistry.js';
import { createFakeN8nFetch } from './helpers/fakeN8nTransport.js';

const env = Object.freeze({
  NEXAEON_N8N_SERVICE_TOKEN: 'stage-54a-service-token-current',
  NEXAEON_N8N_SERVICE_TOKEN_PREVIOUS: 'stage-54a-service-token-previous',
  N8N_EXPLORER_WEBHOOK_URL: 'https://n8n.example.test/webhook/explorer',
  N8N_ARCHIVIST_SEARCH_URL: 'https://n8n.example.test/webhook/archivist-search',
});
const base = Object.freeze({
  requestId: 'req_stage54a_001', traceId: 'trace_stage54a_001', agentId: 'explorer',
  toolId: 'web.search', taskType: 'research.search', input: { query: '  AI learning  ', language: 'en-US' },
});

function successResponse(request, overrides = {}) {
  return {
    ok: true, contractVersion: N8N_TOOL_CONTRACT_VERSION, requestId: request.requestId, traceId: request.traceId,
    toolId: request.toolId, data: { results: [{ title: 'Result', url: 'https://example.test', snippet: 'Safe result.', publishedAt: null, source: 'example.test' }] },
    warnings: [], executionMetadata: { provider: 'n8n', workflow: 'explorer-web-search', durationMs: 10, externalExecutionId: null },
    ...overrides,
  };
}

test('single registry defines the three n8n tools with fixed bindings, risk, approval, and timeout policy', () => {
  const web = getExecutionTool('web.search');
  assert.deepEqual({ runtime: web.runtime, agents: web.allowedAgents, tasks: web.allowedTaskTypes, risk: web.riskLevel, approval: web.approvalPolicy, timeout: web.timeoutMs, binding: web.workflowBinding }, {
    runtime: 'n8n', agents: ['explorer'], tasks: ['research.search'], risk: 'read', approval: 'none', timeout: 15_000, binding: 'N8N_EXPLORER_WEBHOOK_URL',
  });
  assert.equal(getExecutionTool('vector.search').timeoutMs, 10_000);
  const ingest = getExecutionTool('vector.ingest');
  assert.deepEqual({ risk: ingest.riskLevel, approval: ingest.approvalPolicy, timeout: ingest.timeoutMs, enabled: ingest.enabled }, { risk: 'write', approval: 'confirm_required', timeout: 20_000, enabled: false });
});

test('service authentication is server-only, constant-time verified, fail-closed, and rotation-aware', () => {
  assert.equal(getN8nServiceToken(env), env.NEXAEON_N8N_SERVICE_TOKEN);
  assert.deepEqual(verifyN8nServiceToken(`Bearer ${env.NEXAEON_N8N_SERVICE_TOKEN}`, env), { type: 'service', source: 'nexaeon' });
  assert.deepEqual(verifyN8nServiceToken(`Bearer ${env.NEXAEON_N8N_SERVICE_TOKEN_PREVIOUS}`, env), { type: 'service', source: 'nexaeon' });
  assert.throws(() => getN8nServiceToken({}), { code: 'N8N_TOOL_NOT_CONFIGURED' });
  assert.throws(() => getN8nServiceToken({ NEXAEON_N8N_SERVICE_TOKEN: 'too-short' }), { code: 'N8N_TOOL_NOT_CONFIGURED' });
  assert.throws(() => verifyN8nServiceToken('', env), { code: 'N8N_TOOL_UNAUTHORIZED' });
  assert.throws(() => verifyN8nServiceToken('Bearer wrong-token', env), { code: 'N8N_TOOL_UNAUTHORIZED' });
  const headers = buildN8nServiceHeaders({ requestId: base.requestId, traceId: base.traceId, env });
  assert.equal(headers.Authorization, `Bearer ${env.NEXAEON_N8N_SERVICE_TOKEN}`);
  assert.equal(headers['X-NexAeon-Trace-ID'], base.traceId);
  assert.equal(headers['X-NexAeon-Contract-Version'], N8N_TOOL_CONTRACT_VERSION);
});

test('valid Explorer web.search request and response preserve the contract and trace through the fake adapter', async () => {
  const calls = []; const audits = [];
  const client = createN8nToolClient({
    env, fetchImpl: createFakeN8nFetch({ env, calls }),
    auditCollector: createN8nToolAuditCollector({ logger: (line) => audits.push(JSON.parse(line)) }),
  });
  const response = await client.execute(base);
  assert.equal(response.ok, true); assert.equal(response.requestId, base.requestId); assert.equal(response.traceId, base.traceId);
  assert.equal(calls.length, 1); assert.equal(calls[0].url, env.N8N_EXPLORER_WEBHOOK_URL);
  const sent = JSON.parse(calls[0].options.body);
  assert.deepEqual(sent.actor, { type: 'service', source: 'nexaeon' }); assert.deepEqual(sent.execution, { timeoutMs: 15_000 });
  assert.deepEqual(sent.input, { query: 'AI learning', maxResults: 5, language: 'en' });
  assert.equal('workflowUrl' in sent, false); assert.equal('credential' in sent, false);
  assert.equal(audits.length, 1); assert.equal(audits[0].status, 'succeeded'); assert.equal(audits[0].resultCount, 1); assert.equal(audits[0].externalExecutionId, null);
});

test('request contract rejects unknown tools, disallowed agents/tasks, invalid input, and arbitrary workflow controls', () => {
  assert.throws(() => createN8nToolRequest({ ...base, toolId: 'unknown.tool' }), { code: 'N8N_TOOL_NOT_ALLOWED' });
  assert.throws(() => createN8nToolRequest({ ...base, agentId: 'xchange' }), { code: 'N8N_TOOL_FORBIDDEN' });
  assert.throws(() => createN8nToolRequest({ ...base, taskType: 'research.delete' }), { code: 'N8N_TOOL_NOT_ALLOWED' });
  assert.throws(() => createN8nToolRequest({ ...base, input: { query: '' } }), { code: 'N8N_TOOL_INVALID_REQUEST' });
  assert.throws(() => createN8nToolRequest({ ...base, input: { query: 'safe', language: 'fr-FR' } }), { code: 'N8N_TOOL_INVALID_REQUEST' });
  assert.throws(() => createN8nToolRequest({ ...base, input: { query: 'safe', workflowUrl: 'https://evil.example' } }), { code: 'N8N_TOOL_INVALID_REQUEST' });
  assert.throws(() => createN8nToolRequest({
    requestId: 'req_ingest_bad_001', traceId: 'trace_ingest_bad_001', agentId: 'archivist', toolId: 'vector.ingest', taskType: 'knowledge.ingest',
    input: { documentId: 'doc-1', content: 'safe', metadata: { serviceUrl: 'https://evil.example' } }, idempotencyKey: 'idem_ingest_bad_001',
    authority: { approved: true, source: 'nexaeon_control_plane' },
  }), { code: 'N8N_TOOL_INVALID_REQUEST' });
  const request = createN8nToolRequest(base);
  for (const override of [
    { ...request, workflowId: 'arbitrary' },
    { ...request, serviceUrl: 'https://evil.example' },
    { ...request, execution: { timeoutMs: 300_000 } },
  ]) assert.throws(() => validateN8nToolRequest(override), { code: 'N8N_TOOL_INVALID_REQUEST' });
});

test('request contract rejects oversized input before any network call', async () => {
  let calls = 0;
  const client = createN8nToolClient({ env, fetchImpl: async () => { calls += 1; }, auditCollector: createN8nToolAuditCollector({ logger: () => {} }) });
  await assert.rejects(client.execute({ ...base, input: { query: 'x'.repeat(MAX_N8N_TOOL_REQUEST_BYTES) } }), { code: 'N8N_TOOL_INVALID_REQUEST' });
  assert.equal(calls, 0);
});

test('AbortController timeout is finite and maps to N8N_TOOL_TIMEOUT', async () => {
  let signal;
  const startedAt = Date.now();
  await assert.rejects(executeN8nHttpRequest({
    fetchImpl: async (_url, options) => { signal = options.signal; return new Promise(() => {}); },
    url: 'https://n8n.example.test', options: {}, timeoutMs: 20, details: base,
  }), { code: 'N8N_TOOL_TIMEOUT' });
  assert.equal(signal.aborted, true); assert.equal(Date.now() - startedAt < 500, true);
});

test('network, malformed JSON, 401, 429, and upstream errors use the safe taxonomy', async () => {
  const cases = [
    ['network', 'N8N_TOOL_NETWORK_ERROR'], ['malformed', 'N8N_TOOL_BAD_RESPONSE'],
    ['unauthorized', 'N8N_TOOL_UNAUTHORIZED'], ['rate_limited', 'N8N_TOOL_RATE_LIMITED'],
  ];
  for (const [mode, code] of cases) {
    const client = createN8nToolClient({ env, fetchImpl: createFakeN8nFetch({ env, mode }), auditCollector: createN8nToolAuditCollector({ logger: () => {} }) });
    await assert.rejects(client.execute(base), (error) => error.code === code && !JSON.stringify(error).includes(env.NEXAEON_N8N_SERVICE_TOKEN));
  }
  const upstream = createN8nToolClient({ env, fetchImpl: async () => new Response('failure', { status: 500 }), auditCollector: createN8nToolAuditCollector({ logger: () => {} }) });
  await assert.rejects(upstream.execute(base), { code: 'N8N_TOOL_UPSTREAM_ERROR' });
});

test('response requestId, traceId, toolId, workflow, and unexpected fields fail closed', async () => {
  const mutations = [
    (value) => ({ ...value, requestId: 'req_mismatch_001' }),
    (value) => ({ ...value, traceId: 'trace_mismatch_001' }),
    (value) => ({ ...value, toolId: 'vector.search' }),
    (value) => ({ ...value, executionMetadata: { ...value.executionMetadata, workflow: 'arbitrary-workflow' } }),
    (value) => ({ ...value, approved: true }),
  ];
  for (const mutateResponse of mutations) {
    const client = createN8nToolClient({ env, fetchImpl: createFakeN8nFetch({ env, mutateResponse }), auditCollector: createN8nToolAuditCollector({ logger: () => {} }) });
    await assert.rejects(client.execute(base), { code: 'N8N_TOOL_CONTRACT_MISMATCH' });
  }
});

test('response schema rejects unexpected result fields and redacts safe failure messages', () => {
  const request = createN8nToolRequest(base);
  const response = successResponse(request);
  assert.equal(validateN8nToolResponse(structuredClone(response), request).ok, true);
  assert.throws(() => validateN8nToolResponse({ ...structuredClone(response), data: { results: [{ title: 'x', url: 'https://example.test', snippet: 'x', credential: 'no' }] } }, request), { code: 'N8N_TOOL_CONTRACT_MISMATCH' });
  assert.throws(() => validateN8nToolResponse({ ...structuredClone(response), data: { results: [{ title: 'x', url: 'javascript:alert(1)', snippet: 'x' }] } }, request), { code: 'N8N_TOOL_CONTRACT_MISMATCH' });
  const failed = parseN8nToolResponse(JSON.stringify({
    ok: false, contractVersion: N8N_TOOL_CONTRACT_VERSION, requestId: request.requestId, traceId: request.traceId,
    toolId: request.toolId, error: { code: 'N8N_TOOL_TIMEOUT', message: 'Authorization: Bearer should-not-leak' },
  }), request);
  assert.equal(failed.error.message.includes('should-not-leak'), false);
});

test('write tool requires separate NexAeon authority and remains disabled before network execution', async () => {
  const write = { requestId: 'req_ingest_001', traceId: 'trace_ingest_001', agentId: 'archivist', toolId: 'vector.ingest', taskType: 'knowledge.ingest', input: { documentId: 'doc-1', content: 'content' }, idempotencyKey: 'idem_ingest_001' };
  assert.throws(() => createN8nToolRequest(write), { code: 'N8N_TOOL_FORBIDDEN' });
  assert.throws(() => createN8nToolRequest({ ...write, authority: { approved: true, source: 'n8n' } }), { code: 'N8N_TOOL_FORBIDDEN' });
  assert.throws(() => createN8nToolRequest({ ...write, authority: { approved: true, source: 'nexaeon_control_plane' } }), { code: 'N8N_TOOL_NOT_ALLOWED' });
  let calls = 0;
  const client = createN8nToolClient({ env: { ...env, N8N_ARCHIVIST_INGEST_URL: 'https://n8n.example.test/ingest' }, fetchImpl: async () => { calls += 1; }, auditCollector: createN8nToolAuditCollector({ logger: () => {} }) });
  await assert.rejects(client.execute(write), { code: 'N8N_TOOL_FORBIDDEN' }); assert.equal(calls, 0);
});

test('missing configuration fails safely before transport and audit records are allowlisted and secret-free', async () => {
  let calls = 0; const audits = [];
  const client = createN8nToolClient({ env: { NEXAEON_N8N_SERVICE_TOKEN: env.NEXAEON_N8N_SERVICE_TOKEN }, fetchImpl: async () => { calls += 1; }, auditCollector: createN8nToolAuditCollector({ logger: (line) => audits.push(line) }) });
  await assert.rejects(client.execute(base), { code: 'N8N_TOOL_NOT_CONFIGURED' }); assert.equal(calls, 0);
  const record = createN8nToolAuditRecord({ ...base, status: 'failed', errorCode: 'N8N_TOOL_NETWORK_ERROR', token: env.NEXAEON_N8N_SERVICE_TOKEN, input: { credential: 'secret' }, externalExecutionId: undefined });
  assert.equal(record.externalExecutionId, null); assert.equal('input' in record, false); assert.equal('token' in record, false);
  assert.equal(JSON.stringify(record).includes(env.NEXAEON_N8N_SERVICE_TOKEN), false);
  assert.equal(audits.length, 1); assert.equal(audits[0].includes(env.NEXAEON_N8N_SERVICE_TOKEN), false);
});

test('error taxonomy contains every Stage 5-4A contract code and never exposes raw stack text', () => {
  for (const code of ['N8N_TOOL_NOT_CONFIGURED', 'N8N_TOOL_UNAUTHORIZED', 'N8N_TOOL_FORBIDDEN', 'N8N_TOOL_INVALID_REQUEST', 'N8N_TOOL_NOT_ALLOWED', 'N8N_TOOL_TIMEOUT', 'N8N_TOOL_NETWORK_ERROR', 'N8N_TOOL_BAD_RESPONSE', 'N8N_TOOL_RATE_LIMITED', 'N8N_TOOL_UPSTREAM_ERROR', 'N8N_TOOL_CONTRACT_MISMATCH']) assert.equal(N8N_TOOL_ERROR_CODES.includes(code), true);
  const error = new N8nToolError('N8N_TOOL_NETWORK_ERROR', { details: { requestId: 'Authorization: Bearer secret-value', traceId: base.traceId, toolId: base.toolId } });
  assert.equal(error.message, 'n8n_tool_network_error'); assert.equal(JSON.stringify(error).includes('secret-value'), false);
});
