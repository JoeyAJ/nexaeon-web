import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryAuditRepository } from '../lib/agent/auditRepository.js';
import { buildShadowQualityDiagnostic } from '../lib/agent/xchangeQualityDiagnostics.js';
import { XCHANGE_COURSE_DRAFT_SCHEMA, XCHANGE_COURSE_SCHEMA_NAME } from '../lib/agent/xchangeCourseSchema.js';
import { applyExtractedRequirements, extractStructuredRequirements, generateCourseContent, validateStructuredContent } from '../lib/agent/xchangeStructuredContent.js';
import { createXchangeDraftPreview, resetXchangePreviewStoreForTests } from '../lib/agent/xchangeWriteContract.js';
import { getModelConfiguration, MODEL_GATEWAY_LIMITS } from '../lib/model/modelConfig.js';
import { createModelGateway } from '../lib/model/modelGateway.js';
import { createModelProviderRegistry } from '../lib/model/providerRegistry.js';
import { createOpenAIModelProvider } from '../lib/model/providers/openaiProvider.js';
import { validateStrictSchema } from '../lib/model/schemaValidation.js';
import { createModelUsageCollector, createModelUsageRecord } from '../lib/model/modelUsage.js';

const simpleSchema = Object.freeze({ type: 'object', properties: { title: { type: 'string' } }, required: ['title'], additionalProperties: false });
const simpleRequest = Object.freeze({
  requestId: 'hardening-request', traceId: 'hardening-trace', agentId: 'xchange', task: 'xchange.hardening',
  promptVersion: 'test-prompt-v1', schemaVersion: 'v1', validatorVersion: 'locale-semantic-v1',
  instructions: 'Return JSON.', input: '{}', schemaName: 'hardening_schema', schema: simpleSchema,
  mockResult: () => ({ title: 'Safe fallback' }),
});
const clientWith = (create) => ({ responses: { create } });

function silentCollector(records = []) {
  return createModelUsageCollector({ logger: (line) => records.push(JSON.parse(line)) });
}

const LOCALES = Object.freeze({
  zh: { title: '生成式 AI 與行銷策略', audience: '大學生', summary: '請建立給大學生的 90 分鐘「生成式 AI 與行銷策略」Workshop，使用繁體中文，包含學習目標、課程流程、小組活動、評量、AI 風險與倫理。' },
  ko: { title: '생성형 AI와 마케팅 전략', audience: '대학생', summary: '대학생을 대상으로 하는 90분 「생성형 AI와 마케팅 전략」수업을 한국어로 만들고 학습 목표, 그룹 활동, 평가, 윤리와 위험을 포함해 주세요.' },
  en: { title: 'Generative AI and Marketing Strategy', audience: 'University students', summary: 'Create a 90 minute “Generative AI and Marketing Strategy” workshop in English for university students with learning objectives, group activity, assessment, AI risks, and ethics.' },
});

function localeFixture(locale) {
  const item = LOCALES[locale];
  const raw = { title: item.title, summary: item.summary, teachingCategory: 'Course', format: ['Workshop'], targetAudience: [item.audience], durationMinutes: 90, difficulty: 'Beginner', language: [locale], tags: ['AI', 'marketing'] };
  const requirements = extractStructuredRequirements('course', raw);
  const payload = applyExtractedRequirements('course', raw, requirements);
  return { raw, requirements, payload, content: generateCourseContent(payload, requirements) };
}

test.beforeEach(() => resetXchangePreviewStoreForTests());

test('provider 401, 429, 500, timeout, disconnect, and malformed output map once without automatic retry', async () => {
  const cases = [
    ['401', Object.assign(new Error('Authorization: Bearer sk-provider-secret-123456'), { status: 401 }), 'MODEL_CONFIGURATION_INVALID', false],
    ['429', Object.assign(new Error('rate limited'), { status: 429 }), 'MODEL_RATE_LIMITED', true],
    ['500', Object.assign(new Error('upstream failed'), { status: 500 }), 'MODEL_PROVIDER_UNAVAILABLE', true],
    ['timeout', Object.assign(new Error('late'), { name: 'TimeoutError' }), 'MODEL_TIMEOUT', true],
    ['disconnect', Object.assign(new Error('socket reset'), { code: 'ECONNRESET' }), 'MODEL_PROVIDER_ERROR', true],
  ];
  for (const [name, failure, expectedCode, retryable] of cases) {
    let calls = 0; const usage = [];
    const gateway = createModelGateway({
      env: { NEXAEON_MODEL_PROVIDER: 'openai', NEXAEON_MODEL_FALLBACK: 'disabled', OPENAI_API_KEY: 'test' },
      openaiClient: clientWith(async () => { calls += 1; throw failure; }), usageCollector: silentCollector(usage),
    });
    await assert.rejects(() => gateway.structuredGenerate(simpleRequest), (error) => {
      assert.equal(error.code, expectedCode, name); assert.equal(error.retryable, retryable, name);
      assert.equal(JSON.stringify(error).includes('sk-provider-secret'), false); return true;
    });
    assert.equal(calls, 1, name); assert.equal(usage.length, 1, name); assert.equal(usage[0].status, 'failed');
    assert.equal(usage[0].errorCode, expectedCode); assert.equal(usage[0].retryCount, 0);
  }

  let malformedCalls = 0; const malformedUsage = [];
  const malformed = createModelGateway({
    env: { NEXAEON_MODEL_PROVIDER: 'openai', NEXAEON_MODEL_FALLBACK: 'disabled', OPENAI_API_KEY: 'test' },
    openaiClient: clientWith(async () => { malformedCalls += 1; return { output_text: 'not-json' }; }), usageCollector: silentCollector(malformedUsage),
  });
  await assert.rejects(() => malformed.structuredGenerate(simpleRequest), { code: 'MODEL_JSON_INVALID' });
  assert.equal(malformedCalls, 1); assert.equal(malformedUsage[0].errorCode, 'MODEL_JSON_INVALID');
});

test('gateway timeout and cost ceilings are finite and expose no fabricated usage or cost', async () => {
  assert.deepEqual(MODEL_GATEWAY_LIMITS, { maxPrimaryAttempts: 1, maxRetryAttempts: 0, maxFallbackAttempts: 1, maxRepairAttempts: 0, maxTotalAttempts: 2 });
  const config = getModelConfiguration({ NEXAEON_MODEL_TIMEOUT_MS: '999999', NEXAEON_MODEL_MAX_OUTPUT_TOKENS: '999999' });
  assert.equal(config.timeoutMs, 25_000); assert.equal(config.maxOutputTokens, 8_000);

  const registry = createModelProviderRegistry([{
    id: 'openai', health: () => ({ provider: 'openai', status: 'ready' }),
    structuredGenerate: () => new Promise(() => {}), textGenerate: () => new Promise(() => {}),
  }]);
  const startedAt = Date.now();
  const gateway = createModelGateway({
    env: { NEXAEON_MODEL_PROVIDER: 'openai', NEXAEON_MODEL_FALLBACK: 'disabled', NEXAEON_MODEL_TIMEOUT_MS: '1000' }, registry,
    usageCollector: silentCollector(),
  });
  await assert.rejects(() => gateway.structuredGenerate(simpleRequest), { code: 'MODEL_TIMEOUT' });
  assert.equal(Date.now() - startedAt < 2_500, true);

  const provider = createOpenAIModelProvider({ config: { apiKey: 'test', model: 'test', maxOutputTokens: 500, timeoutMs: 1000 }, client: clientWith(async () => ({ output_text: '{"title":"ok"}', usage: {} })) });
  assert.deepEqual((await provider.structuredGenerate(simpleRequest)).usage, { inputTokens: null, outputTokens: null, totalTokens: null });
});

test('single deterministic fallback preserves one trace and records distinguishable bounded attempts', async () => {
  const usage = []; let primaryCalls = 0;
  const gateway = createModelGateway({
    env: { NEXAEON_MODEL_PROVIDER: 'openai', NEXAEON_MODEL_FALLBACK: 'mock', OPENAI_API_KEY: 'test' },
    openaiClient: clientWith(async () => { primaryCalls += 1; throw Object.assign(new Error('busy'), { status: 429 }); }),
    usageCollector: silentCollector(usage),
  });
  const result = await gateway.structuredGenerate(simpleRequest);
  assert.equal(primaryCalls, 1); assert.equal(result.output.title, 'Safe fallback'); assert.equal(result.metadata.fallbackUsed, true);
  assert.equal(result.metadata.retryCount, 0); assert.equal(result.metadata.attempts.length, 2); assert.equal(usage.length, 2);
  assert.deepEqual(usage.map(({ provider, status, fallbackUsed }) => ({ provider, status, fallbackUsed })), [
    { provider: 'openai', status: 'failed', fallbackUsed: false }, { provider: 'mock', status: 'succeeded', fallbackUsed: true },
  ]);
  assert.equal(usage.every(({ requestId, traceId }) => requestId === 'hardening-request' && traceId === 'hardening-trace'), true);
  assert.equal(usage.every(({ estimatedCost }) => estimatedCost === null), true);
});

test('model usage records are allowlisted, redacted, and contain no prompt, credential, or invented cost', () => {
  const secret = 'sk-usage-secret-123456';
  const record = createModelUsageRecord({
    requestId: `Authorization: Bearer ${secret}`, traceId: 'trace', taskType: 'xchange.course_draft', provider: 'openai', model: 'test',
    promptVersion: 'v1', schemaVersion: 'v1', validatorVersion: 'v1', tokenUsage: {}, status: 'failed', errorCode: 'MODEL_TIMEOUT',
    prompt: `private ${secret}`, apiKey: secret, arbitrary: secret,
  });
  assert.equal(JSON.stringify(record).includes(secret), false); assert.equal(record.estimatedCost, null);
  assert.equal(record.inputTokens, null); assert.equal('prompt' in record, false); assert.equal('apiKey' in record, false); assert.equal('arbitrary' in record, false);
});

test('strict model schema rejects hallucinated publish, write, and confirmation authority before Preview', async () => {
  const { raw, content } = localeFixture('en');
  for (const extra of [{ action: 'publish' }, { writeToNotion: true }, { bypassConfirmation: true }]) {
    assert.throws(() => validateStrictSchema({ ...content, ...extra }, XCHANGE_COURSE_DRAFT_SCHEMA), { code: 'MODEL_SCHEMA_INVALID' });
  }
  const auditRepository = createMemoryAuditRepository(); let providerCalls = 0;
  await assert.rejects(() => createXchangeDraftPreview({
    body: { agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials', draftType: 'course', language: 'en', payload: raw, contractVersion: 'v1', schemaVersion: 'v1' },
    req: { headers: {} }, actor: { actorId: 'admin', role: 'admin', sessionId: 'session' }, auditRepository,
    env: { NEXAEON_TOOL_EXECUTION_SECRET: 'test-secret', NEXAEON_XCHANGE_MODEL_MODE: 'live', NEXAEON_MODEL_PROVIDER: 'openai', NEXAEON_MODEL_FALLBACK: 'disabled', OPENAI_API_KEY: 'test' },
    modelGateway: createModelGateway({
      env: { NEXAEON_MODEL_PROVIDER: 'openai', NEXAEON_MODEL_FALLBACK: 'disabled', OPENAI_API_KEY: 'test' },
      openaiClient: clientWith(async () => { providerCalls += 1; return { output_text: JSON.stringify({ ...content, bypassConfirmation: true }) }; }),
      usageCollector: silentCollector(),
    }),
  }), { code: 'MODEL_SCHEMA_INVALID' });
  assert.equal(providerCalls, 1); const [audit] = await auditRepository.listAuditRecords();
  assert.equal(audit.errorCode, 'MODEL_SCHEMA_INVALID'); assert.equal(audit.sanitizedOutput.writesPerformed, 0);
  assert.equal(audit.sanitizedOutput.modelGeneration.attempts[0].errorCode, 'MODEL_SCHEMA_INVALID');
});

test('zh, ko, and en keep all six content-validation failures fail-closed', () => {
  const nonMeasurable = { zh: ['生成式 AI 概念', '受眾分析知識', '品牌語調原理'], ko: ['생성형 AI 개념 이해', '고객 분석 지식', '브랜드 원리'], en: ['Knowledge of generative AI', 'Awareness of audience analysis', 'Understanding of brand voice'] };
  const genericMarker = { zh: '先定義問題與預期成果，再提出兩個選項。', ko: '문제를 정의하고 선택지를 제안합니다.', en: 'Define the problem and generate two options.' };
  for (const locale of ['zh', 'ko', 'en']) {
    const { requirements, content } = localeFixture(locale);
    const mutations = [
      ['learning_objective_verbs', (candidate) => { candidate.learningObjectives = nonMeasurable[locale]; }],
      ['ai_marketing_assessment', (candidate) => { candidate.assessment = { method: locale === 'ko' ? '결과 검토' : 'Review', criteria: ['Clarity'], feedbackMethod: 'Feedback' }; }],
      ['ai_marketing_group_activity', (candidate) => { candidate.activities[0].groupFormat = locale === 'zh' ? '個人' : locale === 'ko' ? '개인 활동' : 'Individual'; }],
      ['ai_risk_coverage', (candidate) => { candidate.risksAndNotes = [locale === 'ko' ? '결과를 확인한다.' : 'Review the result.']; }],
      ['topic_specificity', (candidate) => { candidate.coreContent[0].explanation = genericMarker[locale]; }],
    ];
    for (const [failedCheck, mutate] of mutations) {
      const candidate = structuredClone(content); mutate(candidate);
      const diagnostic = buildShadowQualityDiagnostic(validateStructuredContent('course', candidate, { requirements, sourcePrompt: '' }));
      assert.equal(diagnostic.failedChecks.includes(failedCheck), true, `${locale}/${failedCheck}: ${diagnostic.failedChecks.join(',')}`);
    }

    const genericPayload = { ...LOCALES[locale], title: locale === 'ko' ? '일반 문제 해결' : 'General problem solving', summary: 'General evidence workshop', teachingCategory: 'Course', format: ['Workshop'], targetAudience: [LOCALES[locale].audience], durationMinutes: 90, difficulty: 'Beginner', language: [locale], tags: ['general'] };
    const irrelevant = generateCourseContent(genericPayload, extractStructuredRequirements('course', genericPayload));
    irrelevant.overview = { ...irrelevant.overview, courseTitle: requirements.exactTitle, topic: requirements.topic, targetAudience: requirements.targetAudience, format: requirements.format, durationMinutes: requirements.durationMinutes, difficulty: requirements.difficulty, language: requirements.language };
    const topicDiagnostic = buildShadowQualityDiagnostic(validateStructuredContent('course', irrelevant, { requirements, sourcePrompt: '' }));
    assert.equal(topicDiagnostic.failedChecks.includes('topic_relevance'), true, locale);
  }
});

test('schema name remains versioned and unknown client schema versions stay outside gateway authority', () => {
  assert.match(XCHANGE_COURSE_SCHEMA_NAME, /v1/u);
  assert.equal(simpleRequest.schemaVersion, 'v1');
});
