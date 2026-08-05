import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';

import {
  AUDIT_JSON_BYTE_LIMIT,
  AUDIT_SELECT_VALUES,
  auditUtf8Bytes,
  createAirtableAuditRepository,
  fromAirtableRecord,
  normalizeAuditRecord,
  normalizeAuditSelectValue,
  safeAuditJson,
  sanitizeAuditValue,
  toAirtableFields,
} from '../lib/agent/auditRepository.js';
import {
  createXchangeDraftPreview,
  projectXchangeAuditInput,
  projectXchangePreviewAuditOutput,
  resetXchangePreviewStoreForTests,
} from '../lib/agent/xchangeWriteContract.js';

const env = {
  AIRTABLE_API_KEY: 'fake-airtable-key', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_AUDIT_TABLE_ID: 'tbl-audit',
};

const localeText = {
  zh: { title: '生成式 AI 行銷', objective: ['說明生成式 AI 的用途', '比較兩種提示策略', '設計品牌內容草案', '評估內容風險'], word: '繁體中文課程內容與可評量證據' },
  ko: { title: 'AI Marking', objective: ['설명 AI 평가의 핵심 원리', '비교 두 가지 평가 전략', '설계 검증 가능한 평가안', '평가 결과와 위험 요소'], word: '한국어 과정 내용과 관찰 가능한 평가 증거' },
  en: { title: 'AI Marking', objective: ['Explain the core AI marking principles', 'Compare two marking strategies', 'Design a verifiable marking plan', 'Evaluate results and risks'], word: 'English course content with observable assessment evidence' },
};

function fullCourse(language) {
  const text = localeText[language];
  return {
    overview: { courseTitle: text.title, topic: text.title, purpose: text.word.repeat(3), targetAudience: ['University students'], difficulty: 'Beginner', durationMinutes: 90, language, format: ['Workshop'] },
    learningObjectives: text.objective,
    learningOutcomes: [`${text.word} — portfolio and reflection evidence`],
    sessionPlan: [10, 15, 15, 20, 20, 10].map((durationMinutes, index) => ({ title: `${text.word} ${index + 1}`, durationMinutes, teacherActions: [`${text.word} teacher ${index + 1}`], learnerActions: [`${text.word} learner ${index + 1}`], output: `${text.word} output ${index + 1}` })),
    coreContent: [1, 2, 3].map((index) => ({ title: `${text.word} core ${index}`, explanation: text.word.repeat(6), keyPoints: [`${text.word} A`, `${text.word} B`, `${text.word} C`] })),
    activities: [1, 2].map((index) => ({ title: `${text.word} activity ${index}`, purpose: text.word.repeat(2), durationMinutes: 20, groupFormat: 'Small group', steps: [`${text.word} step 1`, `${text.word} step 2`, `${text.word} step 3`], teacherGuidance: text.word.repeat(2), learnerOutput: text.word.repeat(2), completionCriteria: [`${text.word} criterion 1`, `${text.word} criterion 2`] })),
    discussionQuestions: [`${text.word}?`, `${text.word}?`],
    assessment: { method: text.word.repeat(2), criteria: [`${text.word} criterion A`, `${text.word} criterion B`, `${text.word} criterion C`], feedbackMethod: text.word.repeat(2) },
    resources: { teacherPreparation: [text.word], learnerPreparation: [text.word], materials: [text.word], tools: [text.word], contingencyPlan: text.word.repeat(2) },
    risksAndNotes: [1, 2, 3, 4, 5].map((index) => `${text.word} risk ${index}`),
    extension: { followUpTask: text.word.repeat(2), reflectionQuestions: [`${text.word}?`] },
  };
}

function productionPreview(language) {
  const text = localeText[language];
  const qualityDiagnostic = {
    status: 'passed', errorCodes: [], failedChecks: [], warningCodes: [],
    qualityReasons: ['All multilingual production-shaped checks passed.'], failedPaths: [],
  };
  return {
    previewId: `xpv-${language}`, operationId: `operation-${language}`, requestId: `request-${language}`,
    draftType: 'course', language, contractVersion: 'v1', schemaVersion: 'v1', previewHash: `hash-${language}`,
    previewExpiresAt: '2026-08-05T07:00:00.000Z', estimatedWrites: 1, writesPerformed: 0,
    normalizedPayload: {
      title: text.title, summary: `${text.word.repeat(20)} FULL_PROMPT_DO_NOT_STORE`, targetAudience: ['University students'],
      format: ['Workshop'], durationMinutes: 90, difficulty: 'Beginner', language: [language], tags: ['AI'],
      draftStatus: 'Draft', visibility: 'Private', published: false, createdViaAgent: 'xchange',
      apiKey: 'sk-never-store-123456', secret: 'never-store-secret',
    },
    contentPreview: fullCourse(language),
    createPayloadPreview: { '標題': text.title, '子主題': text.word.repeat(30), '狀態': '未開始', '公開狀態': 'Draft' },
    contentQuality: { status: 'Complete', errors: [], warnings: [], estimatedBodyBlocks: 98 },
    contentSchemaVersion: 'v1', rendererVersion: 'v1', estimatedBodyBlocks: 98,
    durationValidation: { expectedMinutes: 90, actualMinutes: 90, valid: true },
    preservedConstraints: { exactTitle: true, targetAudience: true, format: true, durationMinutes: true, difficulty: true, language: true },
    extractedRequirements: { exactTitle: text.title, topic: text.title, targetAudience: ['University students'], durationMinutes: 90, difficulty: 'Beginner', format: ['Workshop'], language, requiredElements: ['learning objectives', 'session plan', 'group activity', 'assessment', 'AI risks'], subjectKeywords: ['AI', 'assessment'] },
    previewVersion: 1, parentOperationId: null, revisionNumber: 1, revisionReason: 'initial_generation',
    changedPaths: [], preservedPaths: [], regeneratedPaths: [], autoAdjustedPaths: [], changeSummary: null,
    auditEvent: 'preview_created', sourcePreviewHash: null, canExecute: true,
    modelGeneration: { mode: 'shadow', provider: 'mock', requestedProvider: 'openai', actualProvider: 'mock', model: 'deterministic-v1', generationMode: 'shadow', fallbackUsed: false, requestId: `request-${language}`, generatedAt: '2026-08-05T06:39:00.000Z', latencyMs: 0, tokenUsage: null, schemaValidationStatus: 'passed', qualityValidationStatus: 'Complete' },
    shadowComparison: { shadowExecuted: true, provider: 'openai', model: 'gpt-test', requestId: `shadow-${language}`, latencyMs: 8123, tokenUsage: { inputTokens: 2284, outputTokens: 3329, totalTokens: 5613 }, schemaValidationStatus: 'passed', qualityValidationStatus: 'passed', fallbackUsed: false, comparisonStatus: 'completed', schemaPassed: true, qualityPassed: true, requiredSectionCount: 11, sessionDurationValid: true, learningObjectiveCount: 4, sessionCount: 6, activityCount: 2, warningCount: 0, qualityDiagnostic, candidate: fullCourse(language), prompt: 'FULL_SHADOW_PROMPT_DO_NOT_STORE' },
  };
}

function auditRecord(preview) {
  return normalizeAuditRecord({
    operationId: preview.operationId, idempotencyKey: `idem-${preview.language}`, timestamp: '2026-08-05T06:39:00.000Z',
    agentId: 'xchange', toolId: 'createCourseDraft', permissionLevel: 'WRITE_CONFIRM', targetDataSource: 'notion-teaching-materials',
    actionType: 'create', executionStatus: 'previewed', confirmationStatus: 'pending', actorId: 'actor-hash', actorRole: 'admin',
    actorSessionHash: 'session-hash', sanitizedInput: projectXchangeAuditInput(preview),
    sanitizedOutput: projectXchangePreviewAuditOutput(preview), previewHash: preview.previewHash,
    requesterFingerprint: 'requester-hash', source: 'xchange-write-preview',
  });
}

test('zh, ko, and en production-shaped Preview Audits stay byte-bounded, parseable, and round-trip without full content or prompts', async (t) => {
  const measurements = {};
  for (const language of ['zh', 'ko', 'en']) {
    const preview = productionPreview(language);
    assert.equal(preview.contentPreview.sessionPlan.length, 6);
    assert.equal(preview.contentPreview.activities.length, 2);
    const normalized = auditRecord(preview);
    const sanitized = sanitizeAuditValue(normalized);
    const mapped = toAirtableFields(sanitized);
    const outputBytes = auditUtf8Bytes(mapped['Sanitized Output']);
    assert.ok(outputBytes <= AUDIT_JSON_BYTE_LIMIT, `${language} output bytes ${outputBytes}`);
    assert.doesNotThrow(() => JSON.parse(mapped['Sanitized Input']));
    assert.doesNotThrow(() => JSON.parse(mapped['Sanitized Output']));

    let storedFields;
    let requestBodyBytes = 0;
    const repository = createAirtableAuditRepository({ env, fetchImpl: async (_url, options) => {
      requestBodyBytes = Buffer.byteLength(options.body, 'utf8');
      storedFields = JSON.parse(options.body).records[0].fields;
      return { ok: true, status: 200, json: async () => ({ records: [{ id: `rec-${language}` }] }) };
    } });
    await repository.createAuditRecord(normalized);
    const restored = fromAirtableRecord({ id: `rec-${language}`, fields: storedFields });
    const serialized = JSON.stringify(restored);
    assert.deepEqual(restored.sanitizedOutput.qualityDiagnostic, preview.shadowComparison.qualityDiagnostic);
    assert.deepEqual(restored.sanitizedOutput.shadowComparison.tokenUsage, { inputTokens: 2284, outputTokens: 3329, totalTokens: 5613 });
    assert.equal(restored.sanitizedOutput.writesPerformed, 0);
    for (const forbidden of ['contentPreview', 'createPayloadPreview', 'FULL_PROMPT_DO_NOT_STORE', 'FULL_SHADOW_PROMPT_DO_NOT_STORE', 'sk-never-store', 'never-store-secret', 'candidate']) assert.equal(serialized.includes(forbidden), false, `${language} leaked ${forbidden}`);
    assert.equal(restored.sanitizedInput.title, preview.normalizedPayload.title);
    assert.deepEqual(restored.sanitizedInput.targetAudience, ['University students']);
    const legacySerialized = JSON.stringify({
      ...projectXchangePreviewAuditOutput(preview), contentPreview: preview.contentPreview,
      createPayloadPreview: preview.createPayloadPreview, fullPrompt: preview.normalizedPayload.summary,
    });
    measurements[language] = {
      legacyCharacters: legacySerialized.length,
      legacyUtf8Bytes: Buffer.byteLength(legacySerialized, 'utf8'),
      compactCharacters: storedFields['Sanitized Output'].length,
      compactUtf8Bytes: Buffer.byteLength(storedFields['Sanitized Output'], 'utf8'),
      requestBodyBytes,
    };
  }
  assert.ok(measurements.ko.legacyUtf8Bytes > measurements.ko.legacyCharacters);
  t.diagnostic(`multilingual Audit byte measurements: ${JSON.stringify(measurements)}`);
});

test('safe Audit JSON limits UTF-8 bytes and uses a parseable structured compaction instead of slicing JSON', () => {
  const multilingual = { korean: '한글'.repeat(8_000), chinese: '繁體'.repeat(8_000), english: 'A'.repeat(8_000) };
  const serialized = safeAuditJson(multilingual);
  assert.ok(Buffer.byteLength(serialized, 'utf8') <= AUDIT_JSON_BYTE_LIMIT);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.compacted, true);
  assert.equal(parsed.compactReason, 'utf8_byte_limit');
  assert.ok(parsed.originalBytes > serialized.length);
  assert.equal('preview' in parsed, false);
});

test('Audit Select normalization accepts only exact canonical scalar values and never quoted or structured variants', () => {
  assert.equal(normalizeAuditSelectValue('Permission Level', 'WRITE_CONFIRM'), 'WRITE_CONFIRM');
  assert.ok(AUDIT_SELECT_VALUES['Permission Level'].includes('WRITE_CONFIRM'));
  assert.throws(() => normalizeAuditSelectValue('Permission Level', 'PREVIEW_ONLY'), { code: 'AUDIT_SELECT_VALUE_INVALID', fieldName: 'Permission Level' });
  assert.throws(() => normalizeAuditSelectValue('Permission Level', 'READ_VALIDATE'), { code: 'AUDIT_SELECT_VALUE_INVALID', fieldName: 'Permission Level' });
  assert.throws(() => normalizeAuditSelectValue('Permission Level', '"PREVIEW_ONLY"'), { code: 'AUDIT_SELECT_VALUE_INVALID', fieldName: 'Permission Level' });
  assert.throws(() => normalizeAuditSelectValue('Permission Level', "'PREVIEW_ONLY'"), { code: 'AUDIT_SELECT_VALUE_INVALID', fieldName: 'Permission Level' });
  assert.throws(() => normalizeAuditSelectValue('Permission Level', ['PREVIEW_ONLY']), { code: 'AUDIT_SELECT_VALUE_INVALID', fieldName: 'Permission Level', valueType: 'array' });
  assert.throws(() => normalizeAuditSelectValue('Permission Level', { value: 'PREVIEW_ONLY' }), { code: 'AUDIT_SELECT_VALUE_INVALID', fieldName: 'Permission Level', valueType: 'object' });
  assert.throws(() => normalizeAuditSelectValue('Action Type', 'generate'), { code: 'AUDIT_SELECT_VALUE_INVALID', fieldName: 'Action Type' });
});

test('Airtable 422 diagnostics classify safe field causes and retain field/request sizes without payloads', async () => {
  const cases = [
    ['Sanitized Output is too large and exceeds maximum byte size', 'field_too_large', 'Sanitized Output'],
    ['Request body too large', 'request_body_too_large', null],
    ['Field cannot accept the provided value', 'field_type_invalid', null],
    ['Invalid select option for Execution Status', 'select_option_invalid', 'Execution Status'],
    ['Timestamp datetime is invalid', 'invalid_datetime', 'Timestamp'],
    ['Sanitized Output contains invalid JSON', 'invalid_json', 'Sanitized Output'],
    ['Unknown field name: Sanitized Output', 'unknown_field', 'Sanitized Output'],
    ['Unclassified validation failure', 'general_422', null, 'UNCLASSIFIED_ERROR'],
  ];
  for (const [message, reason, rejectedField, type = 'INVALID_VALUE_FOR_COLUMN'] of cases) {
    const repository = createAirtableAuditRepository({ env, fetchImpl: async () => ({ ok: false, status: 422, json: async () => ({ error: { type, message } }) }) });
    await assert.rejects(() => repository.createAuditRecord(auditRecord(productionPreview('ko'))), (error) => {
      assert.equal(error.code, 'AUDIT_SCHEMA_INVALID');
      assert.equal(error.diagnosticReason, reason);
      assert.equal(error.operation, 'append_audit_record');
      assert.ok(error.fieldByteSizes['Sanitized Output'] > 0);
      assert.ok(error.requestBodyBytes > error.fieldByteSizes['Sanitized Output']);
      if (rejectedField) assert.ok(error.rejectedFieldNames.includes(rejectedField));
      assert.equal(JSON.stringify(error).includes('FULL_PROMPT'), false);
      return true;
    });
  }

  const invalidResponse = createAirtableAuditRepository({ env, fetchImpl: async () => ({ ok: false, status: 422, json: async () => { throw new SyntaxError('invalid response'); } }) });
  await assert.rejects(() => invalidResponse.createAuditRecord(auditRecord(productionPreview('ko'))), { code: 'AUDIT_SCHEMA_INVALID', diagnosticReason: 'invalid_json' });
});

test('Airtable request boundary captures the exact 422 text body and logs safe diagnostics before throwing', async () => {
  const logs = [];
  const rawBody = JSON.stringify({
    error: {
      type: 'INVALID_MULTIPLE_CHOICE_OPTIONS',
      message: 'Insufficient permissions to create new select option "검토 중" for field "Execution Status"; token=secret-value',
    },
  });
  const repository = createAirtableAuditRepository({
    env,
    logger: (line) => logs.push(JSON.parse(line)),
    fetchImpl: async () => new Response(rawBody, { status: 422, headers: { 'content-type': 'application/json' } }),
  });

  await assert.rejects(() => repository.createAuditRecord(auditRecord(productionPreview('ko'))), (error) => {
    assert.equal(error.code, 'AUDIT_SCHEMA_INVALID');
    assert.equal(error.status, 422);
    assert.equal(error.airtableErrorType, 'INVALID_MULTIPLE_CHOICE_OPTIONS');
    assert.equal(error.diagnosticReason, 'select_option_invalid');
    assert.match(error.airtableErrorMessage, /검토 중/u);
    assert.doesNotMatch(error.airtableErrorMessage, /secret-value/u);
    assert.match(error.airtableResponseBody, /Execution Status/u);
    assert.equal(error.airtableResponseBodyBytes, Buffer.byteLength(rawBody, 'utf8'));
    assert.match(error.airtableResponseBodyHash, /^[a-f0-9]{24}$/u);
    assert.ok(error.rejectedFieldNames.includes('Execution Status'));
    return true;
  });

  assert.equal(logs.length, 1);
  assert.equal(logs[0].category, 'airtable_request_rejected');
  assert.equal(logs[0].httpStatus, 422);
  assert.equal(logs[0].airtableErrorType, 'INVALID_MULTIPLE_CHOICE_OPTIONS');
  assert.equal(logs[0].diagnosticReason, 'select_option_invalid');
  assert.match(logs[0].airtableResponseBody, /검토 중/u);
  assert.doesNotMatch(JSON.stringify(logs[0]), /secret-value/u);
  assert.ok(logs[0].fieldByteSizes['Sanitized Output'] > 0);
  assert.ok(logs[0].requestBodyBytes > logs[0].fieldByteSizes['Sanitized Output']);
});

test('Airtable request boundary retains non-JSON 422 evidence without calling response.json', async () => {
  const logs = [];
  const rawBody = 'unprocessable entity from Airtable edge';
  const repository = createAirtableAuditRepository({
    env,
    logger: (line) => logs.push(JSON.parse(line)),
    fetchImpl: async () => new Response(rawBody, { status: 422, headers: { 'content-type': 'text/plain' } }),
  });

  await assert.rejects(() => repository.createAuditRecord(auditRecord(productionPreview('ko'))), (error) => {
    assert.equal(error.code, 'AUDIT_SCHEMA_INVALID');
    assert.equal(error.diagnosticReason, 'invalid_json');
    assert.equal(error.airtableResponseBody, rawBody);
    assert.equal(error.airtableResponseBodyBytes, Buffer.byteLength(rawBody, 'utf8'));
    return true;
  });
  assert.equal(logs[0].airtableResponseBody, rawBody);
});

test('Preview Audit failure remains fail closed and does not populate the short-term Preview Store', async () => {
  resetXchangePreviewStoreForTests();
  const body = {
    agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials',
    draftType: 'course', language: 'ko', contractVersion: 'v1', schemaVersion: 'v1',
    payload: { title: 'AI Marking', summary: '대학생을 위한 90분 워크숍', teachingCategory: 'Course', format: ['Workshop'], targetAudience: ['University students'], durationMinutes: 90, difficulty: 'Beginner', language: ['한국어'], tags: ['AI'] },
  };
  const actor = { actorId: 'admin', role: 'admin', sessionId: 'session' };
  const req = { headers: { 'user-agent': 'multilingual-test', 'x-forwarded-for': '127.0.0.1' } };
  const base = { body, req, actor, now: 1_800_000_000_000, env: { NEXAEON_TOOL_EXECUTION_SECRET: 'signing-secret' }, logger: () => {} };
  await assert.rejects(() => createXchangeDraftPreview({ ...base, operationId: 'failed-ko', auditRepository: { createAuditRecord: async () => { throw Object.assign(new Error('reject'), { code: 'AUDIT_SCHEMA_INVALID', status: 422, diagnosticReason: 'field_too_large' }); } } }), { code: 'AUDIT_SCHEMA_INVALID' });
  const records = [];
  const retry = await createXchangeDraftPreview({ ...base, operationId: 'successful-ko', auditRepository: { createAuditRecord: async (record) => { records.push(record); return { auditRecordId: 'rec-ko', persistence: 'fake' }; } } });
  assert.equal(retry.operationId, 'successful-ko');
  assert.equal(retry.reused, false);
  assert.equal(retry.writesPerformed, 0);
  assert.equal(records.length, 1);
});
