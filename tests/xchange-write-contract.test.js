import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COURSE_DRAFT_FIELDS,
  LEARNING_ACTIVITY_DRAFT_FIELDS,
  XCHANGE_TARGET_DATA_SOURCE,
  createXchangeDraftPreview,
  getXchangeProductionContractConfig,
  resetXchangePreviewStoreForTests,
} from '../lib/agent/xchangeWriteContract.js';

const actor = { actorId: 'admin-1', role: 'admin', sessionId: 'session-1' };
const req = { headers: { origin: 'https://nexaeon-web.vercel.app', 'user-agent': 'contract-test', 'x-forwarded-for': '127.0.0.1' } };

function repository() {
  const records = [];
  return {
    records,
    async createAuditRecord(record) { records.push(record); return { auditRecordId: `audit-${records.length}`, persistence: 'memory' }; },
    async getAuditRecordByIdempotencyKey(key) { return records.findLast((record) => record.idempotencyKey === key) || null; },
  };
}

function course(overrides = {}) {
  return {
    agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create',
    targetDataSource: XCHANGE_TARGET_DATA_SOURCE, draftType: 'course', language: 'en',
    payload: {
      title: 'AI Marketing', summary: 'A coaching-led course.', teachingCategory: 'Course', format: ['Workshop'],
      targetAudience: ['University students'], durationMinutes: 90, difficulty: 'Beginner', language: ['English'], tags: ['AI'],
    },
    contractVersion: 'v1', schemaVersion: 'v1', ...overrides,
  };
}

function activity(overrides = {}) {
  return {
    agentId: 'xchange', toolId: 'createLearningActivityDraft', actionType: 'create',
    targetDataSource: XCHANGE_TARGET_DATA_SOURCE, draftType: 'learning_activity', language: 'zh',
    payload: { activityTitle: '小組討論', activityType: 'Discussion', instructions: '比較兩個 AI 回答並反思。', estimatedTimeMinutes: 30, difficulty: 'Beginner', language: ['繁體中文'] },
    contractVersion: 'v1', schemaVersion: 'v1', ...overrides,
  };
}

async function preview(body = course(), options = {}) {
  return createXchangeDraftPreview({ body, req, actor, auditRepository: options.auditRepository || repository(), now: options.now || 1_800_000_000_000, operationId: options.operationId || 'operation-1', requestId: options.requestId || 'request-1', env: { NEXAEON_TOOL_EXECUTION_SECRET: 'xchange-test-secret' } });
}

test.beforeEach(() => resetXchangePreviewStoreForTests());

test('contract exposes strict schema-backed Course and Learning Activity allowlists', () => {
  assert.deepEqual(COURSE_DRAFT_FIELDS, ['title', 'summary', 'teachingCategory', 'format', 'subTopic', 'targetAudience', 'durationMinutes', 'difficulty', 'language', 'tags', 'fileUrl']);
  assert.deepEqual(LEARNING_ACTIVITY_DRAFT_FIELDS, ['activityTitle', 'activityType', 'instructions', 'targetAudience', 'estimatedTimeMinutes', 'difficulty', 'language', 'tags', 'materialsUrl']);
  assert.deepEqual(getXchangeProductionContractConfig({ NOTION_TEACHING_DATABASE_ID: 'database-id' }), {
    platform: 'notion', databaseEnvKey: 'NOTION_TEACHING_DATABASE_ID', databaseId: 'database-id', targetDataSource: XCHANGE_TARGET_DATA_SOURCE, writeRuntimeEnabled: true,
  });
});

test('valid Course Draft returns the complete v1 preview schema and performs no Learning Coaching write', async () => {
  const audit = repository();
  const result = await preview(course(), { auditRepository: audit });
  assert.equal(result.ok, true);
  assert.equal(result.contractVersion, 'v1'); assert.equal(result.schemaVersion, 'v1');
  assert.equal(result.requestId, 'request-1'); assert.equal(result.operationId, 'operation-1');
  assert.equal(result.permissionLevel, 'WRITE_CONFIRM'); assert.equal(result.confirmationRequired, true);
  assert.equal(result.normalizedPayload.draftStatus, 'Draft'); assert.equal(result.normalizedPayload.visibility, 'Private'); assert.equal(result.normalizedPayload.published, false);
  assert.equal(result.normalizedPayload.createdViaAgent, 'xchange'); assert.equal(result.createPayloadPreview['公開狀態'], 'Private');
  assert.equal(result.estimatedWrites, 1); assert.equal(result.writesPerformed, 0); assert.equal(result.canExecute, true); assert.equal(result.executeEndpointEnabled, true); assert.ok(result.confirmationToken);
  assert.equal(audit.records.length, 1); assert.equal(audit.records[0].executionStatus, 'previewed'); assert.equal(audit.records[0].confirmationStatus, 'pending');
  assert.equal(audit.records[0].sanitizedOutput.writesPerformed, 0); assert.equal(audit.records[0].recordType, 'formal');
});

test('valid Learning Activity Draft normalizes to safe Notion field preview', async () => {
  const result = await preview(activity());
  assert.equal(result.draftType, 'learning_activity');
  assert.equal(result.createPayloadPreview['標題'], '小組討論');
  assert.deepEqual(result.createPayloadPreview['形式'], ['Discussion']);
  assert.equal(result.createPayloadPreview['可講時間(分)'], 30);
  assert.equal(result.writesPerformed, 0);
});

test('missing required field, invalid draft type, language, and schema version are rejected', async () => {
  await assert.rejects(() => preview(course({ payload: { summary: 'Missing title' } })), { code: 'REQUIRED_FIELD_MISSING' });
  await assert.rejects(() => preview(course({ draftType: 'lesson' })), { code: 'INVALID_DRAFT_TYPE' });
  await assert.rejects(() => preview(course({ language: 'fr' })), { code: 'UNSUPPORTED_LANGUAGE' });
  await assert.rejects(() => preview(course({ schemaVersion: 'v2' })), { code: 'SCHEMA_VERSION_INVALID' });
});

test('wrong agent, restricted tool, update, delete, and wrong target fail closed', async () => {
  await assert.rejects(() => preview(course({ agentId: 'orchestrator' })), { code: 'AGENT_NOT_ALLOWED' });
  await assert.rejects(() => preview(course({ toolId: 'deleteCourse' })), { code: 'TOOL_NOT_ALLOWED' });
  await assert.rejects(() => preview(course({ actionType: 'update' })), { code: 'UPDATE_NOT_ALLOWED' });
  await assert.rejects(() => preview(course({ actionType: 'delete' })), { code: 'DELETE_NOT_ALLOWED' });
  await assert.rejects(() => preview(course({ targetDataSource: 'arbitrary-table-id' })), { code: 'TARGET_DATA_SOURCE_NOT_ALLOWED' });
});

test('mass assignment and system-field overrides are rejected', async () => {
  await assert.rejects(() => preview(course({ payload: { title: 'Unsafe', recordId: 'rec123' } })), { code: 'MASS_ASSIGNMENT_REJECTED' });
  await assert.rejects(() => preview(course({ payload: { title: 'Unsafe', Published: true } })), { code: 'MASS_ASSIGNMENT_REJECTED' });
  await assert.rejects(() => preview(course({ payload: { title: 'Unsafe', Visibility: 'Public' } })), { code: 'MASS_ASSIGNMENT_REJECTED' });
  await assert.rejects(() => preview({ ...course(), permissionLevel: 'WRITE_AUTO' }), { code: 'MASS_ASSIGNMENT_REJECTED' });
  await assert.rejects(() => preview({ ...course(), confirmationRequired: false }), { code: 'MASS_ASSIGNMENT_REJECTED' });
});

test('preview hash is stable and identical retry reuses the operation without duplicate audit', async () => {
  const audit = repository();
  const first = await preview(course(), { auditRepository: audit, operationId: 'operation-first' });
  const retry = await preview(course(), { auditRepository: audit, operationId: 'operation-second' });
  assert.equal(retry.operationId, first.operationId);
  assert.equal(retry.previewHash, first.previewHash);
  assert.equal(retry.idempotencyKey, first.idempotencyKey);
  assert.equal(retry.reused, true);
  assert.equal(audit.records.length, 1);
});

test('persistent preview audit safely deduplicates a retry after an in-memory cold start', async () => {
  const audit = repository();
  const first = await preview(course(), { auditRepository: audit, operationId: 'operation-persistent' });
  resetXchangePreviewStoreForTests();
  const retry = await preview(course(), { auditRepository: audit, operationId: 'operation-should-not-be-used' });
  assert.equal(retry.operationId, first.operationId);
  assert.equal(retry.previewId, first.previewId);
  assert.equal(retry.previewHash, first.previewHash);
  assert.equal(retry.reused, true);
  assert.equal(audit.records.length, 1);
});

test('different actor or payload creates a distinct idempotency identity', async () => {
  const audit = repository();
  const first = await preview(course(), { auditRepository: audit, operationId: 'one' });
  const changed = await preview(course({ payload: { ...course().payload, title: 'Changed' } }), { auditRepository: audit, operationId: 'two' });
  const otherActor = await createXchangeDraftPreview({ body: course(), req, actor: { ...actor, actorId: 'admin-2' }, auditRepository: audit, now: 1_800_000_000_000, operationId: 'three', env: { NEXAEON_TOOL_EXECUTION_SECRET: 'xchange-test-secret' } });
  assert.notEqual(first.idempotencyKey, changed.idempotencyKey);
  assert.notEqual(first.idempotencyKey, otherActor.idempotencyKey);
  assert.equal(audit.records.length, 3);
});

test('expired preview is not reused and remains separate from formal record writes', async () => {
  const audit = repository();
  const first = await preview(course(), { auditRepository: audit, now: 1_800_000_000_000, operationId: 'one' });
  const expiredRetry = await preview(course(), { auditRepository: audit, now: new Date(first.previewExpiresAt).getTime() + 1, operationId: 'two' });
  assert.equal(expiredRetry.operationId, 'two');
  assert.equal(expiredRetry.writesPerformed, 0);
  assert.equal(audit.records.every((record) => record.executionStatus === 'previewed'), true);
  assert.equal(audit.records.every((record) => record.externalRecordId === undefined), true);
});

test('sensitive and unknown fields never enter audit and audit failure fails the preview closed', async () => {
  const audit = repository();
  await assert.rejects(() => preview(course({ payload: { ...course().payload, token: 'secret-token' } }), { auditRepository: audit }), { code: 'MASS_ASSIGNMENT_REJECTED' });
  assert.equal(audit.records.length, 0);
  await assert.rejects(() => preview(course(), { auditRepository: { async createAuditRecord() { throw Object.assign(new Error('down'), { code: 'AUDIT_TIMEOUT' }); } } }), { code: 'AUDIT_TIMEOUT' });
});

test('unauthenticated actor cannot create a preview', async () => {
  await assert.rejects(() => createXchangeDraftPreview({ body: course(), req, actor: null, auditRepository: repository() }), { code: 'AUTH_REQUIRED' });
});
