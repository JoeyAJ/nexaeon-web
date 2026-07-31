import assert from 'node:assert/strict';
import test from 'node:test';

import { ADMIN_SESSION_COOKIE, createAdminSession, readAdminSession, requireAdminCsrf } from '../lib/agent/adminSession.js';
import { createAirtableAuditRepository, createMemoryAuditRepository } from '../lib/agent/auditRepository.js';
import { createOperationPreview, executeConfirmedOperation, resetOperationStoreForTests } from '../lib/agent/toolExecutionRuntime.js';

const env = {
  AIRTABLE_API_KEY: 'airtable-server-secret', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_PROJECTS_TABLE_ID: 'tbl-projects',
  NEXAEON_TOOL_EXECUTION_SECRET: 'tool-signing-secret', NEXAEON_ADMIN_ACTOR_ID: 'joey-admin',
  NEXAEON_ADMIN_ACCESS_SECRET: 'correct-access-code', NEXAEON_ADMIN_SESSION_SECRET: 'independent-session-secret',
};

function request(cookie = '', csrf = '') {
  return { headers: { cookie, 'x-nexaeon-csrf': csrf, origin: 'https://nexaeon-web.vercel.app', 'user-agent': 'audit-test', 'x-forwarded-for': '203.0.113.10' } };
}

test.beforeEach(resetOperationStoreForTests);

test('admin login produces a short HttpOnly Secure SameSite session and validates CSRF', () => {
  const now = Date.UTC(2026, 7, 1);
  const created = createAdminSession({ actorId: 'joey-admin', accessSecret: 'correct-access-code' }, { env, now });
  assert.match(created.cookie, new RegExp(`^${ADMIN_SESSION_COOKIE}=`));
  assert.match(created.cookie, /HttpOnly/); assert.match(created.cookie, /Secure/); assert.match(created.cookie, /SameSite=Strict/);
  assert.equal(created.claims.role, 'admin'); assert.ok(created.claims.expiresAt - now <= 15 * 60 * 1000);
  const cookie = created.cookie.split(';')[0];
  const session = readAdminSession(request(cookie), { env, now: now + 1 });
  assert.equal(session.actorId, 'joey-admin'); assert.equal(requireAdminCsrf(request(cookie, session.csrfToken), session).sessionId, session.sessionId);
  assert.throws(() => requireAdminCsrf(request(cookie, 'wrong'), session), { code: 'CSRF_INVALID' });
  assert.throws(() => readAdminSession(request(cookie), { env, now: created.claims.expiresAt + 1 }), { code: 'AUTH_SESSION_EXPIRED' });
  assert.throws(() => createAdminSession({ actorId: 'visitor', accessSecret: 'correct-access-code' }, { env }), { code: 'AUTH_INVALID_CREDENTIALS' });
});

test('anonymous users cannot preview and confirmation is bound to the same actor session', async () => {
  const req = request();
  const payload = { title: 'Persistent audit', description: 'Verify actor binding.' };
  const actor = { actorId: 'joey-admin', role: 'admin', sessionId: 'session-a' };
  await assert.rejects(createOperationPreview({ payload, req, env }), { code: 'AUTH_REQUIRED' });
  const preview = await createOperationPreview({ payload, req, actor, env, operationId: 'bound-operation' });
  await assert.rejects(executeConfirmedOperation({
    body: { operationId: preview.operationId, agentId: preview.agentId, toolId: preview.toolId, targetDataSource: preview.targetDataSource, payload: preview.payload, idempotencyKey: preview.idempotencyKey, confirmationToken: preview.confirmationToken },
    req, actor: { ...actor, sessionId: 'session-b' }, env, createDraft: async () => ({ externalRecordId: 'rec-blocked', replayed: false }),
  }), { code: 'ACTOR_SESSION_MISMATCH' });
});

test('memory audit repository is append-only, filterable, and never mutates the preview event', async () => {
  const repository = createMemoryAuditRepository();
  const first = await repository.createAuditRecord({ operationId: 'op-1', timestamp: '2026-08-01T00:00:00.000Z', agentId: 'orchestrator', toolId: 'createActionDraft', executionStatus: 'previewed', sanitizedInput: { password: 'remove-me', title: 'Safe' } });
  const second = await repository.updateAuditExecutionResult('op-1', { timestamp: '2026-08-01T00:00:01.000Z', agentId: 'orchestrator', toolId: 'createActionDraft', executionStatus: 'succeeded' });
  assert.notEqual(first.auditRecordId, second.auditRecordId);
  const records = await repository.listAuditRecords({ executionStatus: 'previewed' });
  assert.equal(records.length, 1); assert.equal(records[0].executionStatus, 'previewed');
  assert.equal('password' in records[0].sanitizedInput, false);
});

test('Airtable audit adapter appends fixed fields and shared fallback rows remain hidden from public Action queries', async () => {
  const calls = [];
  const repository = createAirtableAuditRepository({ env, fetchImpl: async (_url, options) => {
    calls.push(options);
    return { ok: true, json: async () => ({ records: [{ id: 'rec-audit-1' }] }) };
  } });
  const result = await repository.createAuditRecord({ operationId: 'op-fixed', executionStatus: 'previewed', sanitizedInput: { title: 'Safe' } });
  const body = JSON.parse(calls[0].body);
  assert.equal(result.auditRecordId, 'rec-audit-1'); assert.equal(result.persistence, 'airtable-shared-hidden');
  assert.deepEqual(Object.keys(body.records[0].fields).sort(), ['Project Name', 'Public Summary']);
  assert.match(body.records[0].fields['Project Name'], /^\[Audit /);
  assert.equal('Visibility' in body.records[0].fields, false); assert.equal('Status' in body.records[0].fields, false);
});

