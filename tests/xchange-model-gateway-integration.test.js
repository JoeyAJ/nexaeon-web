import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryAuditRepository } from '../lib/agent/auditRepository.js';
import { extractStructuredRequirements, generateCourseContent } from '../lib/agent/xchangeStructuredContent.js';
import { createXchangeDraftPreview, resetXchangePreviewStoreForTests } from '../lib/agent/xchangeWriteContract.js';

const actor = { actorId: 'gateway-admin', role: 'admin', sessionId: 'gateway-session' };
const req = { headers: { origin: 'https://nexaeon-web.vercel.app', 'user-agent': 'gateway-test', 'x-forwarded-for': '127.0.0.1' } };
const env = { NEXAEON_TOOL_EXECUTION_SECRET: 'gateway-test-secret', NEXAEON_XCHANGE_MODEL_MODE: 'live', NEXAEON_MODEL_PROVIDER: 'openai', NEXAEON_MODEL_FALLBACK: 'mock' };
const body = {
  agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials',
  draftType: 'course', language: 'en', contractVersion: 'v1', schemaVersion: 'v1',
  payload: { title: 'Evidence-based teaching', summary: 'Create a 90 minute workshop for university students.', teachingCategory: 'Course', format: ['Workshop'], targetAudience: ['University students'], durationMinutes: 90, difficulty: 'Beginner', language: ['en'], tags: ['Teaching'] },
};

test.beforeEach(() => resetXchangePreviewStoreForTests());

test('Xchange uses gateway output, applies existing quality validation, persists model metadata, and performs zero Notion writes', async () => {
  const auditRepository = createMemoryAuditRepository(); let calls = 0; let notionWrites = 0;
  const normalized = { ...body.payload, draftStatus: 'Draft', visibility: 'Private', published: false, createdViaAgent: 'xchange' };
  const content = generateCourseContent(normalized, extractStructuredRequirements('course', normalized));
  const modelGateway = { structuredGenerate: async ({ task, schemaName, instructions, input }) => {
    calls += 1; assert.equal(task, 'xchange.course_draft'); assert.match(schemaName, /course_draft_v1/u);
    assert.match(instructions, /cannot approve, publish, persist, or execute/u); assert.equal(input.includes('gateway-test-secret'), false);
    return { output: content, metadata: { provider: 'openai', model: 'test-model', generationMode: 'real', fallbackUsed: false, requestId: 'gateway-request', generatedAt: '2027-01-15T00:00:00.000Z', latencyMs: 42, tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } } };
  } };
  const preview = await createXchangeDraftPreview({ body, req, actor, auditRepository, env, modelGateway, operationId: 'gateway-op', requestId: 'gateway-request', now: 1_800_000_000_000 });
  assert.equal(calls, 1); assert.equal(notionWrites, 0); assert.equal(preview.writesPerformed, 0);
  assert.equal(preview.modelGeneration.provider, 'openai'); assert.equal(preview.modelGeneration.schemaValidationStatus, 'passed');
  assert.match(preview.modelGeneration.qualityValidationStatus, /^Complete/u); assert.equal(preview.canExecute, true);
  const audit = (await auditRepository.getAuditLifecycleByOperationId('gateway-op'))[0];
  assert.equal(audit.agentId, 'xchange'); assert.equal(audit.actionType, 'create');
  assert.deepEqual(audit.sanitizedOutput.modelGeneration.tokenUsage, { inputTokens: 10, outputTokens: 20, totalTokens: 30 });
  assert.equal(JSON.stringify(audit).includes('gateway-test-secret'), false);
});

test('quality-invalid real output safely falls back and is never presented as a real generation', async () => {
  const auditRepository = createMemoryAuditRepository();
  const normalized = { ...body.payload, draftStatus: 'Draft', visibility: 'Private', published: false, createdViaAgent: 'xchange' };
  const invalid = generateCourseContent(normalized, extractStructuredRequirements('course', normalized));
  invalid.sessionPlan[0].durationMinutes = 999;
  const preview = await createXchangeDraftPreview({
    body, req, actor, auditRepository, env, operationId: 'quality-fallback', requestId: 'quality-request', now: 1_800_000_000_000,
    modelGateway: { structuredGenerate: async () => ({ output: invalid, metadata: { provider: 'openai', model: 'test-model', generationMode: 'real', fallbackUsed: false, requestId: 'quality-request', generatedAt: '2027-01-15T00:00:00.000Z', latencyMs: 20, tokenUsage: null } }) },
  });
  assert.equal(preview.modelGeneration.provider, 'mock'); assert.equal(preview.modelGeneration.generationMode, 'live_fallback');
  assert.equal(preview.modelGeneration.fallbackUsed, true); assert.equal(preview.modelGeneration.fallbackReason, 'MODEL_QUALITY_INVALID');
  assert.equal(preview.durationValidation.valid, true); assert.equal(preview.writesPerformed, 0);
});

test('unrecoverable generation failure creates a redacted zero-write Audit and no formal Action or Notion write', async () => {
  const auditRepository = createMemoryAuditRepository(); let notionWrites = 0;
  await assert.rejects(() => createXchangeDraftPreview({
    body, req, actor, auditRepository, env: { ...env, NEXAEON_MODEL_FALLBACK: 'disabled' }, operationId: 'gateway-failed', requestId: 'failed-request', now: 1_800_000_000_000,
    modelGateway: { structuredGenerate: async () => { throw Object.assign(new Error('Authorization: Bearer sk-private-secret-123456'), { code: 'MODEL_TIMEOUT' }); } },
  }), { code: 'MODEL_TIMEOUT' });
  const lifecycle = await auditRepository.getAuditLifecycleByOperationId('gateway-failed');
  assert.equal(lifecycle.length, 1); assert.equal(lifecycle[0].actionType, 'create'); assert.equal(lifecycle[0].permissionLevel, 'WRITE_CONFIRM'); assert.equal(lifecycle[0].errorCode, 'MODEL_TIMEOUT');
  assert.equal(lifecycle[0].sanitizedOutput.auditEvent, 'model_generation_failed'); assert.equal(lifecycle[0].sanitizedOutput.generationAction, 'generate');
  assert.equal(lifecycle[0].sanitizedOutput.writesPerformed, 0); assert.equal(notionWrites, 0);
  assert.equal(JSON.stringify(lifecycle).includes('sk-private-secret'), false);
});
