import assert from 'node:assert/strict';
import test from 'node:test';

import { createN8nToolAuditCollector } from '../lib/agent/n8nToolAudit.js';
import { createN8nToolClient } from '../lib/agent/n8nToolClient.js';
import { MAX_N8N_TOOL_RESPONSE_BYTES } from '../lib/agent/n8nToolContracts.js';
import { N8N_TOOL_CONTRACT_VERSION } from '../lib/agent/toolExecutionRegistry.js';

const env = Object.freeze({
  NEXAEON_N8N_SERVICE_TOKEN: 'stage-54b-current-service-token',
  NEXAEON_N8N_SERVICE_TOKEN_PREVIOUS: 'stage-54b-previous-service-token',
  N8N_EXPLORER_WEBHOOK_URL: 'https://n8n.example.test/webhook/explorer-production',
});
const base = Object.freeze({
  requestId: 'req_stage54b_http_001', traceId: 'trace_stage54b_http_001',
  agentId: 'explorer', toolId: 'web.search', taskType: 'research.search',
  input: { query: '  trustworthy AI  ', maxResults: 3, language: 'ko-KR' },
});

function validPayload(request, overrides = {}) {
  return {
    ok: true,
    contractVersion: N8N_TOOL_CONTRACT_VERSION,
    requestId: request.requestId,
    traceId: request.traceId,
    toolId: request.toolId,
    data: { results: [{
      title: 'Trustworthy AI', url: 'https://example.test/research', snippet: 'A normalized result.',
      publishedAt: '2026-08-10T12:00:00Z', source: 'example.test', score: 0.91,
    }] },
    warnings: [],
    executionMetadata: { provider: 'n8n', workflow: 'explorer-web-search', durationMs: 21, externalExecutionId: null },
    ...overrides,
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

function client(fetchImpl, auditLines = []) {
  return createN8nToolClient({
    env,
    fetchImpl,
    auditCollector: createN8nToolAuditCollector({ logger: (line) => auditLines.push(line) }),
  });
}

test('real HTTP adapter sends one fixed POST with service auth, contract headers, normalized input, and correlated IDs', async () => {
  const calls = [];
  const payload = await client(async (url, options) => {
    calls.push({ url, options });
    return json(validPayload(JSON.parse(options.body)));
  }).execute(base);

  assert.equal(payload.requestId, base.requestId);
  assert.equal(payload.traceId, base.traceId);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, env.N8N_EXPLORER_WEBHOOK_URL);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${env.NEXAEON_N8N_SERVICE_TOKEN}`);
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[0].options.headers['X-NexAeon-Request-ID'], base.requestId);
  assert.equal(calls[0].options.headers['X-NexAeon-Trace-ID'], base.traceId);
  assert.equal(calls[0].options.headers['X-NexAeon-Contract-Version'], N8N_TOOL_CONTRACT_VERSION);
  assert.deepEqual(JSON.parse(calls[0].options.body).input, { query: 'trustworthy AI', maxResults: 3, language: 'ko' });
});

test('real HTTP adapter maps 401, 403, 429, and 500 without retrying', async () => {
  for (const [status, code] of [[401, 'N8N_TOOL_UNAUTHORIZED'], [403, 'N8N_TOOL_FORBIDDEN'], [429, 'N8N_TOOL_RATE_LIMITED'], [500, 'N8N_TOOL_UPSTREAM_ERROR']]) {
    let calls = 0;
    const transport = client(async () => { calls += 1; return json({ error: 'upstream' }, status); });
    await assert.rejects(transport.execute(base), { code });
    assert.equal(calls, 1);
  }
});

test('real HTTP adapter maps aborts, network failures, and invalid JSON safely', async () => {
  const cases = [
    [Object.assign(new Error('aborted'), { name: 'AbortError' }), 'N8N_TOOL_TIMEOUT'],
    [new TypeError('network failed'), 'N8N_TOOL_NETWORK_ERROR'],
  ];
  for (const [failure, code] of cases) {
    await assert.rejects(client(async () => { throw failure; }).execute(base), { code });
  }
  await assert.rejects(client(async () => new Response('{invalid', { status: 200 })).execute(base), { code: 'N8N_TOOL_BAD_RESPONSE' });
});

test('real HTTP adapter rejects wrong requestId, wrong traceId, and injected top-level URLs', async () => {
  const mutations = [
    (request) => validPayload(request, { requestId: 'req_wrong_http_001' }),
    (request) => validPayload(request, { traceId: 'trace_wrong_http_001' }),
    (request) => ({ ...validPayload(request), callbackUrl: 'https://evil.example/callback' }),
  ];
  for (const mutate of mutations) {
    await assert.rejects(client(async (_url, options) => {
      const request = JSON.parse(options.body);
      return json(mutate(request));
    }).execute(base), { code: 'N8N_TOOL_CONTRACT_MISMATCH' });
  }
});

test('malformed individual search results and invalid result URLs are dropped with warnings', async () => {
  const payload = await client(async (_url, options) => {
    const request = JSON.parse(options.body);
    return json(validPayload(request, { data: { results: [
      { title: 'Valid', url: 'https://safe.example/item', snippet: 'Safe.', publishedAt: null, source: 'safe.example' },
      { title: 'Bad URL', url: 'javascript:alert(1)', snippet: 'Bad.', publishedAt: null, source: 'unsafe' },
      { title: 'Missing source', url: 'https://safe.example/other', snippet: 'Bad.', publishedAt: null },
    ] } }));
  }).execute(base);
  assert.deepEqual(payload.data.results.map(({ title }) => title), ['Valid']);
  assert.match(payload.warnings[0], /Dropped 2 malformed/);
});

test('response results cannot exceed the request maxResults ceiling', async () => {
  const payload = await client(async (_url, options) => {
    const request = JSON.parse(options.body);
    const results = Array.from({ length: 5 }, (_, index) => ({
      title: `Result ${index}`, url: `https://safe.example/${index}`, snippet: 'Safe.', publishedAt: null, source: 'safe.example',
    }));
    return json(validPayload(request, { data: { results } }));
  }).execute({ ...base, input: { ...base.input, maxResults: 3 } });
  assert.equal(payload.data.results.length, 3);
  assert.match(payload.warnings[0], /Dropped 2 malformed or excess/);
});

test('oversized and whole-contract malformed responses fail closed', async () => {
  await assert.rejects(client(async () => new Response('x'.repeat(MAX_N8N_TOOL_RESPONSE_BYTES + 1), { status: 200 })).execute(base), { code: 'N8N_TOOL_BAD_RESPONSE' });
  await assert.rejects(client(async (_url, options) => json(validPayload(JSON.parse(options.body), { data: { items: [] } }))).execute(base), { code: 'N8N_TOOL_CONTRACT_MISMATCH' });
});

test('HTTP transport audit stores resultCount and external execution ID without content or secrets', async () => {
  const audits = [];
  const payload = await client(async (_url, options) => {
    const request = JSON.parse(options.body);
    return json(validPayload(request, { executionMetadata: {
      provider: 'n8n', workflow: 'explorer-web-search', durationMs: 10, externalExecutionId: 'exec-54b-001',
    } }));
  }, audits).execute(base);
  assert.equal(payload.ok, true);
  const audit = JSON.parse(audits[0]);
  assert.equal(audit.resultCount, 1);
  assert.equal(audit.externalExecutionId, 'exec-54b-001');
  assert.equal(JSON.stringify(audit).includes('A normalized result'), false);
  assert.equal(JSON.stringify(audit).includes(env.NEXAEON_N8N_SERVICE_TOKEN), false);
});

test('client input cannot alter HTTP destination, method, auth, or workflow binding', async () => {
  for (const forbidden of ['url', 'endpoint', 'baseUrl', 'webhook', 'callback', 'workflowUrl', 'workflowId', 'headers', 'authorization', 'credential', 'serviceToken']) {
    let calls = 0;
    await assert.rejects(client(async () => { calls += 1; }).execute({ ...base, input: { query: 'safe', [forbidden]: 'https://evil.example' } }), { code: 'N8N_TOOL_INVALID_REQUEST' });
    assert.equal(calls, 0);
  }
  await assert.rejects(client(async () => {}).execute({ ...base, input: { query: 'safe', metadata: { url: 'https://evil.example' } } }), { code: 'N8N_TOOL_INVALID_REQUEST' });
});
