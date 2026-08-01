import assert from 'node:assert/strict';
import test from 'node:test';

import { ADMIN_SESSION_COOKIE, createAdminSession, readAdminSession, requireAdminCsrf } from '../lib/agent/adminSession.js';
import { ACTION_DRAFT_FIELD_NAMES, getActionDraftFields, validateActionDraftSchema } from '../lib/agent/actionDraftDataSource.js';
import { AUDIT_FIELD_NAMES, createAirtableAuditRepository, createMemoryAuditRepository, validateAuditSchema } from '../lib/agent/auditRepository.js';
import { migrateLegacyAuditRecords } from '../lib/agent/auditMigration.js';
import { createOperationPreview, executeConfirmedOperation, resetOperationStoreForTests } from '../lib/agent/toolExecutionRuntime.js';

const env = {
  AIRTABLE_API_KEY: 'airtable-server-secret', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_PROJECTS_TABLE_ID: 'tbl-projects', AIRTABLE_AUDIT_TABLE_ID: 'tbl-audit',
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
    body: { operationId: preview.operationId, agentId: preview.agentId, toolId: preview.toolId, targetDataSource: preview.targetDataSource, payload: preview.payload, idempotencyKey: preview.idempotencyKey, auditRecordId: preview.auditRecordId, confirmationToken: preview.confirmationToken },
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

test('Airtable audit adapter appends only the dedicated formal schema', async () => {
  const calls = [];
  const repository = createAirtableAuditRepository({ env, fetchImpl: async (_url, options) => {
    calls.push(options);
    return { ok: true, json: async () => ({ records: [{ id: 'rec-audit-1' }] }) };
  } });
  const result = await repository.createAuditRecord({ operationId: 'op-fixed', executionStatus: 'previewed', sanitizedInput: { title: 'Safe' }, sanitizedOutput: { requestId: 'request-safe' }, source: 'xchange-write-preview' });
  const body = JSON.parse(calls[0].body);
  assert.equal(result.auditRecordId, 'rec-audit-1'); assert.equal(result.persistence, 'airtable-dedicated');
  assert.equal(body.records[0].fields['Operation ID'], 'op-fixed');
  assert.equal(body.records[0].fields['Schema Version'], 'v1'); assert.equal(body.records[0].fields['Record Type'], 'formal');
  assert.deepEqual(JSON.parse(body.records[0].fields['Sanitized Output']), { requestId: 'request-safe', source: 'xchange-write-preview' });
  assert.equal('Project Name' in body.records[0].fields, false); assert.equal('Public Summary' in body.records[0].fields, false);
});

test('dedicated repository fails closed without table configuration and validates both formal schemas', () => {
  assert.throws(() => createAirtableAuditRepository({ env: { ...env, AIRTABLE_AUDIT_TABLE_ID: '' } }), { code: 'AUDIT_TABLE_NOT_CONFIGURED' });
  assert.equal(validateAuditSchema(AUDIT_FIELD_NAMES), true);
  assert.throws(() => validateAuditSchema(AUDIT_FIELD_NAMES.filter((name) => name !== 'Operation ID')), { code: 'AUDIT_TABLE_SCHEMA_INVALID' });
  assert.equal(validateActionDraftSchema(ACTION_DRAFT_FIELD_NAMES), true);
  assert.throws(() => validateActionDraftSchema(['Project Name', 'Public Summary']), { code: 'ACTION_SCHEMA_INVALID' });
});

test('formal Action mapping enforces safe status values and fixed server fields', () => {
  const fields = getActionDraftFields({ title: 'Safe draft', description: 'Review only.' }, 'idem-1', { operationId: 'op-1', createdBy: 'admin-1', confirmationTimestamp: '2026-08-01T00:00:00.000Z' });
  assert.equal(fields['Draft Status'], 'Draft'); assert.equal(fields['Execution Status'], 'Succeeded');
  assert.equal(fields['Created Via Agent'], 'orchestrator'); assert.equal(fields['Source Tool ID'], 'createActionDraft');
  assert.equal(fields['Operation ID'], 'op-1'); assert.equal(fields['Idempotency Key'], 'idem-1'); assert.equal(fields['Created By'], 'admin-1');
  assert.throws(() => getActionDraftFields({ title: 'Unsafe', description: 'No.' }, 'idem-2', { draftStatus: 'Approved' }), { code: 'ACTION_STATUS_NOT_ALLOWED' });
});

test('legacy audit migration is rerunnable and skips duplicates by Audit ID', async () => {
  const repository = createMemoryAuditRepository();
  const legacy = [{ auditId: 'legacy-audit-1', operationId: 'legacy-op-1', executionStatus: 'succeeded', timestamp: '2026-07-31T00:00:00.000Z' }];
  const first = await migrateLegacyAuditRecords({ legacyRecords: legacy, repository });
  const second = await migrateLegacyAuditRecords({ legacyRecords: legacy, repository });
  assert.deepEqual(first, { scanned: 1, migrated: 1, duplicateSkipped: 0, failed: 0, errors: [] });
  assert.equal(second.migrated, 0); assert.equal(second.duplicateSkipped, 1); assert.equal(second.failed, 0);
});

test('Action success with audit failure is partial and never retries the Action write', async () => {
  const repository = {
    async createAuditRecord() { return { auditRecordId: 'rec-audit-anchor', persistence: 'airtable-dedicated' }; },
    async updateAuditExecutionResult() { throw Object.assign(new Error('audit unavailable'), { code: 'AUDIT_REQUEST_FAILED' }); },
  };
  const req = request(); const actor = { actorId: 'joey-admin', role: 'admin', sessionId: 'partial-session' };
  const preview = await createOperationPreview({ payload: { title: 'Partial', description: 'One Action only.' }, req, actor, env, operationId: 'partial-op', auditRepository: repository, logger: () => {} });
  let writes = 0;
  const result = await executeConfirmedOperation({
    body: { operationId: preview.operationId, agentId: preview.agentId, toolId: preview.toolId, targetDataSource: preview.targetDataSource, payload: preview.payload, idempotencyKey: preview.idempotencyKey, auditRecordId: preview.auditRecordId, confirmationToken: preview.confirmationToken },
    req, actor, env, auditRepository: repository, createDraft: async () => { writes += 1; return { externalRecordId: 'rec-action-partial', replayed: false }; }, linkDraft: async () => ({}), logger: () => {},
  });
  assert.equal(writes, 1); assert.equal(result.actionWriteStatus, 'succeeded'); assert.equal(result.auditPersistenceStatus, 'partial');
});

test('Action failure appends a failed audit event without creating another Action', async () => {
  const repository = createMemoryAuditRepository();
  const req = request(); const actor = { actorId: 'joey-admin', role: 'admin', sessionId: 'failed-session' };
  const preview = await createOperationPreview({ payload: { title: 'Failure', description: 'Audit the failure.' }, req, actor, env, operationId: 'failed-op', auditRepository: repository, logger: () => {} });
  let writes = 0;
  await assert.rejects(executeConfirmedOperation({
    body: { operationId: preview.operationId, agentId: preview.agentId, toolId: preview.toolId, targetDataSource: preview.targetDataSource, payload: preview.payload, idempotencyKey: preview.idempotencyKey, auditRecordId: preview.auditRecordId, confirmationToken: preview.confirmationToken },
    req, actor, env, auditRepository: repository, createDraft: async () => { writes += 1; throw Object.assign(new Error('rejected'), { code: 'DATA_SOURCE_REJECTED' }); }, logger: () => {},
  }), { code: 'DATA_SOURCE_REJECTED' });
  const failed = await repository.listAuditRecordsForAdmin({ executionStatus: 'failed' });
  assert.equal(writes, 1); assert.equal(failed.length, 1); assert.equal(failed[0].errorCode, 'DATA_SOURCE_REJECTED');
});
