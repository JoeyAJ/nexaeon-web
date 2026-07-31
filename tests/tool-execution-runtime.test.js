import assert from 'node:assert/strict';
import test from 'node:test';

import { createAirtableActionDraft } from '../lib/agent/actionDraftDataSource.js';
import {
  ACTION_DRAFT_DATA_SOURCE,
  ACTION_DRAFT_TOOL_ID,
  TOOL_PERMISSION,
  TOOL_REGISTRY,
  assertToolAccess,
  getExecutionTool,
} from '../lib/agent/toolExecutionRegistry.js';
import {
  CONFIRMATION_TTL_MS,
  cancelOperation,
  createOperationPreview,
  executeConfirmedOperation,
  logToolAudit,
  redactSecrets,
  resetOperationStoreForTests,
  sanitizeActionDraftInput,
  validateActionDraftOutput,
} from '../lib/agent/toolExecutionRuntime.js';

const env = { AIRTABLE_API_KEY: 'server-only-test-key', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_PROJECTS_TABLE_ID: 'tbl-test' };
const req = { headers: { origin: 'https://nexaeon-web.vercel.app', 'user-agent': 'tool-runtime-test', 'x-forwarded-for': '203.0.113.8' } };
const payload = { title: 'Ship Stage 5-3A', description: 'Create a controlled task draft.' };

function executionBody(preview, overrides = {}) {
  return {
    operationId: preview.operationId, agentId: preview.agentId, toolId: preview.toolId,
    targetDataSource: preview.targetDataSource, payload: preview.payload,
    idempotencyKey: preview.idempotencyKey, confirmationToken: preview.confirmationToken,
    ...overrides,
  };
}

test.beforeEach(resetOperationStoreForTests);

test('tool registry loads READ, WRITE_CONFIRM, and RESTRICTED permission classes', () => {
  assert.ok(TOOL_REGISTRY.length >= 9);
  assert.deepEqual(new Set(TOOL_REGISTRY.map(({ permissionLevel }) => permissionLevel)), new Set(Object.values(TOOL_PERMISSION)));
  const tool = getExecutionTool(ACTION_DRAFT_TOOL_ID);
  assert.equal(tool.agentId, 'orchestrator'); assert.equal(tool.requiresConfirmation, true);
  assert.equal(tool.rollbackSupport, false); assert.deepEqual(tool.allowedDataSources, [ACTION_DRAFT_DATA_SOURCE]);
});

test('only Orchestrator may access createActionDraft and arbitrary tool or data source is rejected', () => {
  assert.equal(assertToolAccess({ toolId: ACTION_DRAFT_TOOL_ID, agentId: 'orchestrator', targetDataSource: ACTION_DRAFT_DATA_SOURCE }).toolId, ACTION_DRAFT_TOOL_ID);
  for (const agentId of ['navigator', 'explorer', 'xchange', 'archivist', 'engineer', 'networker']) {
    assert.throws(() => assertToolAccess({ toolId: ACTION_DRAFT_TOOL_ID, agentId, targetDataSource: ACTION_DRAFT_DATA_SOURCE }), { code: 'AGENT_NOT_ALLOWED' });
  }
  assert.throws(() => assertToolAccess({ toolId: 'runShell', agentId: 'orchestrator' }), { code: 'TOOL_NOT_ALLOWED' });
  assert.throws(() => assertToolAccess({ toolId: ACTION_DRAFT_TOOL_ID, agentId: 'orchestrator', targetDataSource: 'notion' }), { code: 'DATA_SOURCE_NOT_ALLOWED' });
});

test('server preview includes fixed Draft fields, bounded schema, hash, token, and expiry', () => {
  const now = Date.UTC(2026, 7, 1);
  const preview = createOperationPreview({ payload, req, env, now, operationId: 'operation-1' });
  assert.equal(preview.executionStatus, 'previewed'); assert.equal(preview.permissionLevel, 'WRITE_CONFIRM');
  assert.deepEqual(Object.keys(preview.fieldsToWrite).sort(), ['Project Name', 'Public Summary', 'Visibility']);
  assert.equal(preview.fieldsToWrite.Visibility, 'Draft'); assert.match(preview.fieldsToWrite['Public Summary'], /idempotency:/);
  assert.equal(new Date(preview.expiresAt).getTime(), now + CONFIRMATION_TTL_MS);
  assert.match(preview.previewHash, /^[a-f0-9]{64}$/); assert.ok(preview.confirmationToken);
  assert.equal(JSON.stringify(preview).includes(env.AIRTABLE_API_KEY), false);
  assert.equal(JSON.stringify(preview).includes(env.AIRTABLE_BASE_ID), false);
});

test('empty fields, status injection, mass assignment, and oversized payload fail closed', () => {
  assert.throws(() => sanitizeActionDraftInput({ title: '', description: 'x' }), { code: 'INVALID_INPUT' });
  assert.throws(() => sanitizeActionDraftInput({ title: 'x', description: 'y', status: 'Active' }), { code: 'MASS_ASSIGNMENT_REJECTED' });
  assert.throws(() => sanitizeActionDraftInput({ title: 'x', description: 'y', owner: 'admin' }), { code: 'MASS_ASSIGNMENT_REJECTED' });
  assert.throws(() => sanitizeActionDraftInput({ title: 'x', description: 'a'.repeat(9000) }), { code: 'PAYLOAD_TOO_LARGE' });
});

test('confirmation is required, payload mutation invalidates token, and expired tokens cannot write', async () => {
  const now = Date.UTC(2026, 7, 1);
  const preview = createOperationPreview({ payload, req, env, now, operationId: 'operation-2' });
  let writes = 0;
  const createDraft = async () => { writes += 1; return { externalRecordId: 'rec-test', replayed: false }; };
  await assert.rejects(executeConfirmedOperation({ body: executionBody(preview, { confirmationToken: '' }), req, env, now, createDraft }), { code: 'CONFIRMATION_INVALID' });
  await assert.rejects(executeConfirmedOperation({ body: executionBody(preview, { payload: { ...preview.payload, description: 'modified' } }), req, env, now, createDraft }), { code: 'CONFIRMATION_MISMATCH' });
  await assert.rejects(executeConfirmedOperation({ body: executionBody(preview), req, env, now: now + CONFIRMATION_TTL_MS + 1, createDraft }), { code: 'CONFIRMATION_EXPIRED' });
  assert.equal(writes, 0);
});

test('confirmed success returns a real record ID and repeated confirmation does not call create twice', async () => {
  const preview = createOperationPreview({ payload, req, env, operationId: 'operation-3' });
  let writes = 0;
  const createDraft = async () => { writes += 1; return { externalRecordId: 'rec-real-123', replayed: false }; };
  const first = await executeConfirmedOperation({ body: executionBody(preview), req, env, createDraft, logger: () => {} });
  const second = await executeConfirmedOperation({ body: executionBody(preview), req, env, createDraft, logger: () => {} });
  assert.equal(first.externalRecordId, 'rec-real-123'); assert.equal(first.replayed, false);
  assert.equal(second.externalRecordId, 'rec-real-123'); assert.equal(second.replayed, true); assert.equal(writes, 1);
});

test('tool output schema rejects fabricated success without a real Airtable record ID', () => {
  assert.throws(() => validateActionDraftOutput({ ok: true, executionStatus: 'succeeded', targetDataSource: ACTION_DRAFT_DATA_SOURCE, externalRecordId: '', replayed: false }), { code: 'INVALID_TOOL_OUTPUT' });
});

test('cancel prevents later execution and an external error is returned as failure', async () => {
  const cancelled = createOperationPreview({ payload, req, env, operationId: 'operation-4' });
  assert.equal(cancelOperation({ body: { operationId: cancelled.operationId }, logger: () => {} }).executionStatus, 'cancelled');
  await assert.rejects(executeConfirmedOperation({ body: executionBody(cancelled), req, env, createDraft: async () => ({ externalRecordId: 'rec-no' }), logger: () => {} }), { code: 'OPERATION_CANCELLED' });
  const failed = createOperationPreview({ payload: { title: 'Failure', description: 'External failure' }, req, env, operationId: 'operation-5' });
  await assert.rejects(executeConfirmedOperation({ body: executionBody(failed), req, env, createDraft: async () => { throw Object.assign(new Error('no'), { code: 'DATA_SOURCE_REJECTED' }); }, logger: () => {} }), { code: 'DATA_SOURCE_REJECTED' });
});

test('Airtable adapter recovers existing idempotency result without creating another record', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    return { ok: true, json: async () => ({ records: [{ id: 'rec-existing' }] }) };
  };
  const result = await createAirtableActionDraft({ payload, idempotencyKey: 'same-key', env, fetchImpl });
  assert.deepEqual(result, { externalRecordId: 'rec-existing', replayed: true });
  assert.deepEqual(calls.map(({ method }) => method), ['GET']);
});

test('Airtable adapter creates only fixed fields and maps rejection and timeout errors', async () => {
  const calls = [];
  const fetchImpl = async (_url, options) => {
    calls.push(options);
    if (!options.method) return { ok: true, json: async () => ({ records: [] }) };
    return { ok: true, json: async () => ({ records: [{ id: 'rec-created' }], createdRecords: ['rec-created'] }) };
  };
  const result = await createAirtableActionDraft({ payload, idempotencyKey: 'new-key', env, fetchImpl });
  const body = JSON.parse(calls[1].body);
  assert.equal(result.externalRecordId, 'rec-created'); assert.equal(calls[1].method, 'PATCH');
  assert.deepEqual(Object.keys(body.records[0].fields).sort(), ['Project Name', 'Public Summary', 'Visibility']);
  assert.equal(body.records[0].fields.Visibility, 'Draft'); assert.equal(body.typecast, false);
  await assert.rejects(createAirtableActionDraft({ payload, idempotencyKey: 'reject', env, fetchImpl: async () => ({ ok: false, status: 422 }) }), { code: 'DATA_SOURCE_REJECTED' });
  await assert.rejects(createAirtableActionDraft({ payload, idempotencyKey: 'timeout', env, fetchImpl: async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); } }), { code: 'DATA_SOURCE_TIMEOUT' });
});

test('secret redaction and audit log exclude credentials and private contact details', () => {
  const safe = redactSecrets({ apiKey: 'do-not-log', description: 'token=abc123456 user@example.com', nested: { cookie: 'nope' } });
  assert.equal('apiKey' in safe, false); assert.equal('cookie' in safe.nested, false);
  assert.equal(JSON.stringify(safe).includes('user@example.com'), false);
  const lines = [];
  const event = logToolAudit({ operationId: 'op', agentId: 'orchestrator', toolId: ACTION_DRAFT_TOOL_ID, permissionLevel: 'WRITE_CONFIRM', targetDataSource: ACTION_DRAFT_DATA_SOURCE, userConfirmation: true, sanitizedInput: { description: 'password=hunter123 test@example.com' }, executionStatus: 'failed', errorCode: 'TEST', idempotencyKey: 'key' }, (line) => lines.push(line));
  assert.equal(lines.length, 1); assert.equal(JSON.stringify(event).includes('hunter123'), false); assert.equal(JSON.stringify(event).includes('test@example.com'), false);
});
