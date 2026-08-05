import assert from 'node:assert/strict';
import test from 'node:test';

import { createAirtableAuditRepository, createMemoryAuditRepository } from '../lib/agent/auditRepository.js';
import { extractStructuredRequirements, generateCourseContent } from '../lib/agent/xchangeStructuredContent.js';
import { createXchangeDraftPreview, resetXchangePreviewStoreForTests } from '../lib/agent/xchangeWriteContract.js';
import { getXchangeModelMode } from '../lib/model/modelConfig.js';
import { getModelReadiness } from '../lib/model/modelReadiness.js';

const actor = { actorId: 'mode-admin', role: 'admin', sessionId: 'mode-session' };
const req = { headers: { 'user-agent': 'mode-test', 'x-forwarded-for': '127.0.0.1' } };
const body = {
  agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials',
  draftType: 'course', language: 'en', contractVersion: 'v1', schemaVersion: 'v1',
  payload: { title: 'Model rollout workshop', summary: 'Create a 90 minute workshop for university students.', teachingCategory: 'Course', format: ['Workshop'], targetAudience: ['University students'], durationMinutes: 90, difficulty: 'Beginner', language: ['en'], tags: ['AI'] },
};
const baseEnv = { NEXAEON_TOOL_EXECUTION_SECRET: 'mode-secret', NEXAEON_MODEL_PROVIDER: 'openai', NEXAEON_MODEL_FALLBACK: 'mock' };

function content() {
  const normalized = { ...body.payload, draftStatus: 'Draft', visibility: 'Private', published: false, createdViaAgent: 'xchange' };
  return generateCourseContent(normalized, extractStructuredRequirements('course', normalized));
}

function metadata(overrides = {}) {
  return { provider: 'openai', requestedProvider: 'openai', actualProvider: 'openai', model: 'fake-model', requestId: 'fake-request', generatedAt: '2027-01-15T00:00:00.000Z', latencyMs: 17, tokenUsage: { inputTokens: 11, outputTokens: 22, totalTokens: 33 }, fallbackUsed: false, ...overrides };
}

test.beforeEach(() => resetXchangePreviewStoreForTests());

test('mode defaults to rules and rejects unsupported server configuration', () => {
  assert.equal(getXchangeModelMode({}), 'rules');
  assert.throws(() => getXchangeModelMode({ NEXAEON_XCHANGE_MODEL_MODE: 'browser-choice' }), { code: 'MODEL_MODE_INVALID' });
});

test('invalid mode creates a zero-write configuration Failure Audit and Audit failure remains fail-closed', async () => {
  const auditRepository = createMemoryAuditRepository();
  await assert.rejects(() => createXchangeDraftPreview({
    body, req, actor, auditRepository, env: { ...baseEnv, NEXAEON_XCHANGE_MODEL_MODE: 'unsupported' }, operationId: 'invalid-mode',
  }), { code: 'MODEL_MODE_INVALID' });
  const records = await auditRepository.getAuditLifecycleByOperationId('invalid-mode');
  assert.equal(records.length, 1); assert.equal(records[0].sanitizedOutput.writesPerformed, 0);

  await assert.rejects(() => createXchangeDraftPreview({
    body, req, actor, env: { ...baseEnv, NEXAEON_XCHANGE_MODEL_MODE: 'disabled' },
    auditRepository: { createAuditRecord: async () => { throw Object.assign(new Error('unavailable'), { code: 'AUDIT_REQUEST_FAILED' }); } },
  }), { code: 'AUDIT_REQUEST_FAILED' });
});

test('rules never invokes a provider and records consistent rules metadata', async () => {
  let calls = 0;
  const preview = await createXchangeDraftPreview({
    body, req, actor, auditRepository: createMemoryAuditRepository(), env: baseEnv,
    modelGateway: { structuredGenerate: async () => { calls += 1; throw new Error('must not run'); } },
  });
  assert.equal(calls, 0); assert.equal(preview.modelGeneration.mode, 'rules');
  assert.equal(preview.modelGeneration.actualProvider, 'mock'); assert.equal(preview.writesPerformed, 0);
});

test('client mode, provider, and model controls are rejected by the existing request allowlist', async () => {
  for (const field of ['mode', 'provider', 'model']) {
    await assert.rejects(() => createXchangeDraftPreview({
      body: { ...body, [field]: 'openai' }, req, actor, auditRepository: createMemoryAuditRepository(), env: baseEnv,
    }), (error) => error.code === 'MASS_ASSIGNMENT_REJECTED' && error.rejectedFields.includes(field));
  }
});

test('shadow keeps the rules Preview, stores only objective comparison metadata, and creates one Audit', async () => {
  const auditRepository = createMemoryAuditRepository();
  const rulesCandidate = content();
  const alteredCandidate = structuredClone(rulesCandidate);
  alteredCandidate.learningObjectives[0] = 'A different but valid measurable objective for comparison';
  const preview = await createXchangeDraftPreview({
    body, req, actor, auditRepository, env: { ...baseEnv, NEXAEON_XCHANGE_MODEL_MODE: 'shadow' },
    modelGateway: { structuredGenerate: async () => ({ output: alteredCandidate, metadata: metadata() }) },
  });
  assert.deepEqual(preview.contentPreview, rulesCandidate);
  assert.equal(preview.shadowComparison.shadowExecuted, true); assert.equal(preview.shadowComparison.comparisonStatus, 'completed');
  assert.equal(preview.shadowComparison.learningObjectiveCount, alteredCandidate.learningObjectives.length);
  const lifecycle = await auditRepository.getAuditLifecycleByOperationId(preview.operationId);
  assert.equal(lifecycle.length, 1); assert.equal(lifecycle[0].sanitizedOutput.writesPerformed, 0);
  const serialized = JSON.stringify(lifecycle);
  assert.equal(serialized.includes(alteredCandidate.learningObjectives[0]), false);
  assert.equal(serialized.includes('instructions'), false);
});

test('shadow timeout is normalized in metadata and never blocks the rules Preview', async () => {
  const preview = await createXchangeDraftPreview({
    body, req, actor, auditRepository: createMemoryAuditRepository(), env: { ...baseEnv, NEXAEON_XCHANGE_MODEL_MODE: 'shadow' },
    modelGateway: { structuredGenerate: async () => { throw Object.assign(new Error('Authorization: Bearer sk-shadow-secret-123456'), { code: 'MODEL_TIMEOUT' }); } },
  });
  assert.equal(preview.ok, true); assert.equal(preview.modelGeneration.mode, 'shadow');
  assert.equal(preview.shadowComparison.comparisonStatus, 'failed'); assert.equal(preview.shadowComparison.errorCode, 'MODEL_TIMEOUT');
  assert.equal(JSON.stringify(preview).includes('sk-shadow-secret'), false);
});

test('shadow comparison token usage survives the Airtable Audit round-trip without candidate content', async () => {
  let storedFields = null;
  const repository = createAirtableAuditRepository({
    env: { AIRTABLE_API_KEY: 'test-key', AIRTABLE_BASE_ID: 'test-base', AIRTABLE_AUDIT_TABLE_ID: 'test-audit' },
    fetchImpl: async (_url, options = {}) => {
      if (options.method === 'POST') {
        storedFields = JSON.parse(options.body).records[0].fields;
        return { ok: true, json: async () => ({ records: [{ id: 'rec-shadow' }] }) };
      }
      return { ok: true, json: async () => ({ records: storedFields ? [{ id: 'rec-shadow', fields: storedFields }] : [] }) };
    },
  });
  await repository.createAuditRecord({
    operationId: 'shadow-round-trip', agentId: 'xchange', toolId: 'createCourseDraft', executionStatus: 'previewed',
    sanitizedOutput: { shadowComparison: { shadowExecuted: true, comparisonStatus: 'completed', tokenUsage: { inputTokens: 7, outputTokens: 9, totalTokens: 16 }, learningObjectiveCount: 4, qualityDiagnostic: { status: 'failed', errorCodes: ['AI_RISK_COVERAGE_INSUFFICIENT'], failedChecks: ['ai_risk_coverage'], warningCodes: [], qualityReasons: ['At least four AI risk categories are required.'], failedPaths: ['risksAndNotes'] } }, writesPerformed: 0 },
    source: 'xchange-write-preview',
  });
  const restored = await repository.getAuditRecordByOperationId('shadow-round-trip');
  assert.deepEqual(restored.sanitizedOutput.shadowComparison.tokenUsage, { inputTokens: 7, outputTokens: 9, totalTokens: 16 });
  assert.deepEqual(restored.sanitizedOutput.shadowComparison.qualityDiagnostic.errorCodes, ['AI_RISK_COVERAGE_INSUFFICIENT']);
  assert.ok(storedFields['Sanitized Output'].length < 12_000);
  assert.equal(restored.sanitizedOutput.writesPerformed, 0);
  assert.equal(JSON.stringify(restored).includes('contentPreview'), false);
});

test('live accepts a valid candidate, preserves usage metadata, and retry reuses one Preview', async () => {
  const auditRepository = createMemoryAuditRepository(); let calls = 0;
  const modelGateway = { structuredGenerate: async () => { calls += 1; return { output: content(), metadata: metadata() }; } };
  const options = { body, req, actor, auditRepository, env: { ...baseEnv, NEXAEON_XCHANGE_MODEL_MODE: 'live' }, modelGateway, now: 1_800_000_000_000 };
  const first = await createXchangeDraftPreview({ ...options, operationId: 'live-one', requestId: 'live-request-one' });
  const retry = await createXchangeDraftPreview({ ...options, operationId: 'live-two', requestId: 'live-request-two' });
  assert.equal(first.modelGeneration.mode, 'live'); assert.deepEqual(first.modelGeneration.tokenUsage, metadata().tokenUsage);
  assert.equal(retry.operationId, first.operationId); assert.equal(retry.reused, true); assert.equal(calls, 1);
  assert.equal((await auditRepository.listAuditRecords()).length, 1);
});

test('live invalid JSON, schema, quality, and fallback failures create no Preview and zero-write failure Audits', async () => {
  for (const code of ['MODEL_JSON_INVALID', 'MODEL_SCHEMA_INVALID', 'MODEL_PROVIDER_UNAVAILABLE']) {
    resetXchangePreviewStoreForTests();
    const auditRepository = createMemoryAuditRepository();
    await assert.rejects(() => createXchangeDraftPreview({
      body, req, actor, auditRepository, env: { ...baseEnv, NEXAEON_XCHANGE_MODEL_MODE: 'live', NEXAEON_MODEL_FALLBACK: 'disabled' },
      modelGateway: { structuredGenerate: async () => { throw Object.assign(new Error('raw provider detail'), { code }); } },
    }), { code });
    const records = await auditRepository.listAuditRecords();
    assert.equal(records.length, 1); assert.equal(records[0].sanitizedOutput.writesPerformed, 0);
    assert.equal(records[0].executionStatus, 'failed');
    assert.equal(records[0].permissionLevel, 'WRITE_CONFIRM'); assert.equal(records[0].actionType, 'create');
    assert.equal(records[0].sanitizedOutput.auditEvent, 'model_generation_failed');
    assert.equal(records[0].sanitizedOutput.generationAction, 'generate');
  }
  const invalid = content(); invalid.sessionPlan[0].durationMinutes = 999;
  const qualityAudit = createMemoryAuditRepository();
  await assert.rejects(() => createXchangeDraftPreview({
    body, req, actor, auditRepository: qualityAudit,
    env: { ...baseEnv, NEXAEON_XCHANGE_MODEL_MODE: 'live', NEXAEON_MODEL_FALLBACK: 'disabled' },
    modelGateway: { structuredGenerate: async () => ({ output: invalid, metadata: metadata() }) },
  }), { code: 'CONTENT_VALIDATION_FAILED' });
  assert.equal((await qualityAudit.listAuditRecords())[0].sanitizedOutput.writesPerformed, 0);
});

test('live fallback produces exactly one Preview with explicit provider identity', async () => {
  const preview = await createXchangeDraftPreview({
    body, req, actor, auditRepository: createMemoryAuditRepository(),
    env: { ...baseEnv, NEXAEON_XCHANGE_MODEL_MODE: 'live' },
    modelGateway: { structuredGenerate: async () => ({ output: content(), metadata: metadata({ provider: 'mock', actualProvider: 'mock', model: 'deterministic-v1', fallbackUsed: true, fallbackReason: 'MODEL_TIMEOUT' }) }) },
  });
  assert.equal(preview.modelGeneration.mode, 'live_fallback'); assert.equal(preview.modelGeneration.fallbackUsed, true);
  assert.equal(preview.modelGeneration.requestedProvider, 'openai'); assert.equal(preview.modelGeneration.actualProvider, 'mock');
});

test('disabled invokes no provider, creates no Preview, and persists a zero-write failure Audit', async () => {
  const auditRepository = createMemoryAuditRepository(); let calls = 0;
  await assert.rejects(() => createXchangeDraftPreview({
    body, req, actor, auditRepository, env: { ...baseEnv, NEXAEON_XCHANGE_MODEL_MODE: 'disabled' },
    modelGateway: { structuredGenerate: async () => { calls += 1; } }, operationId: 'disabled-operation',
  }), { code: 'MODEL_DISABLED' });
  const records = await auditRepository.getAuditLifecycleByOperationId('disabled-operation');
  assert.equal(calls, 0); assert.equal(records.length, 1); assert.equal(records[0].sanitizedOutput.writesPerformed, 0);
  assert.equal(records[0].sanitizedOutput.modelGeneration.mode, 'disabled');
  assert.equal(records[0].permissionLevel, 'WRITE_CONFIRM'); assert.equal(records[0].actionType, 'create');
});

test('readiness evaluates all modes without exposing credentials or raw environment values', () => {
  const secret = 'sk-readiness-secret-123456';
  const rules = getModelReadiness({ NEXAEON_XCHANGE_MODEL_MODE: 'rules', NEXAEON_MODEL_PROVIDER: 'mock' });
  const shadow = getModelReadiness({ NEXAEON_XCHANGE_MODEL_MODE: 'shadow', NEXAEON_MODEL_PROVIDER: 'openai', OPENAI_API_KEY: secret });
  const liveMissing = getModelReadiness({ NEXAEON_XCHANGE_MODEL_MODE: 'live', NEXAEON_MODEL_PROVIDER: 'openai' });
  const disabled = getModelReadiness({ NEXAEON_XCHANGE_MODEL_MODE: 'disabled', NEXAEON_MODEL_PROVIDER: 'disabled' });
  const invalidFallback = getModelReadiness({ NEXAEON_XCHANGE_MODEL_MODE: 'live', NEXAEON_MODEL_PROVIDER: 'mock', NEXAEON_MODEL_FALLBACK: 'unlisted' });
  assert.equal(rules.xchange.readyForRules, true); assert.equal(shadow.xchange.readyForShadow, true);
  assert.equal(liveMissing.xchange.readyForLive, false); assert.equal(disabled.xchange.readyForLive, false);
  assert.equal(invalidFallback.xchange.readyForLive, false);
  assert.equal(JSON.stringify(shadow).includes(secret), false); assert.equal('apiKey' in shadow.xchange, false);
});
