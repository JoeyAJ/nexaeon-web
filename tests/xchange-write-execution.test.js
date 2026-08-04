import assert from 'node:assert/strict';
import test from 'node:test';

import { createAirtableAuditRepository, createMemoryAuditRepository } from '../lib/agent/auditRepository.js';
import { createXchangeDraftPreview, executeXchangeDraft, resetXchangePreviewStoreForTests } from '../lib/agent/xchangeWriteContract.js';
import { buildXchangeNotionProperties, createXchangeNotionDraft, validateXchangeNotionSchema } from '../lib/agent/xchangeNotionWriter.js';
import { createStructuredContent } from '../lib/agent/xchangeStructuredContent.js';
import { isPublishedNotionPage } from '../lib/publicFilters.js';

const env = { NEXAEON_TOOL_EXECUTION_SECRET: 'confirmed-write-test-secret' };
const actor = { actorId: 'admin@example.test', role: 'admin', sessionId: 'session-a' };
const req = { headers: { origin: 'https://nexaeon-web.vercel.app', 'user-agent': 'execution-test', 'x-forwarded-for': '127.0.0.1' } };
const now = 1_800_000_000_000;

function course() {
  return {
    agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials',
    draftType: 'course', language: 'en', contractVersion: 'v1', schemaVersion: 'v1',
    payload: { title: 'AI Marketing', summary: 'Coach a campaign.', teachingCategory: 'Course', format: ['Workshop'], targetAudience: ['Students'], durationMinutes: 90, difficulty: 'Beginner', language: ['English'], tags: ['AI'] },
  };
}

function activity() {
  return {
    agentId: 'xchange', toolId: 'createLearningActivityDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials',
    draftType: 'learning_activity', language: 'zh', contractVersion: 'v1', schemaVersion: 'v1',
    payload: { activityTitle: '比較活動', activityType: 'Discussion', instructions: '比較兩個回答。', targetAudience: ['學生'], estimatedTimeMinutes: 30, difficulty: 'Beginner', language: ['繁體中文'], tags: ['AI'] },
  };
}

async function setup(body = course(), options = {}) {
  resetXchangePreviewStoreForTests();
  const auditRepository = options.auditRepository || createMemoryAuditRepository();
  const preview = await createXchangeDraftPreview({ body, req, actor, auditRepository, now, operationId: options.operationId || 'execute-operation', requestId: 'execute-request', env });
  const executeBody = {
    operationId: preview.operationId, agentId: preview.agentId, toolId: preview.toolId,
    targetDataSource: preview.targetDataSource, draftType: preview.draftType, language: preview.language,
    payload: preview.normalizedPayload, previewHash: preview.previewHash, idempotencyKey: preview.idempotencyKey,
    confirmationToken: preview.confirmationToken, confirm: true,
    contractVersion: preview.contractVersion, schemaVersion: preview.schemaVersion,
  };
  return { auditRepository, preview, executeBody };
}

test.beforeEach(() => resetXchangePreviewStoreForTests());

test('confirmed Course Draft writes exactly once with forced private draft fields and hashed actor audit', async () => {
  const { auditRepository, executeBody } = await setup();
  const calls = [];
  const result = await executeXchangeDraft({ body: executeBody, req, actor, auditRepository, now: now + 1000, env, notionWriter: async (input) => {
    calls.push(input);
    return { externalRecordId: 'notion-page-1', createdAt: '2027-01-15T08:00:01.000Z' };
  } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].targetDataSource, 'notion-teaching-materials');
  assert.equal(calls[0].payload.draftStatus, 'Draft');
  assert.equal(calls[0].payload.visibility, 'Private');
  assert.equal(calls[0].payload.published, false);
  assert.equal(calls[0].payload.createdViaAgent, 'xchange');
  assert.deepEqual(result, { ok: true, operationId: 'execute-operation', executionStatus: 'succeeded', writes: 1, writesPerformed: 1, draftStatus: 'Draft', visibility: 'Private', published: false, externalRecordId: 'notion-page-1', createdAt: '2027-01-15T08:00:01.000Z', notPublished: true, replayed: false, notionPageCreated: true, bodyComplete: true, bodyBlocksWritten: 0, bodyAppendBatches: 0, partialExternalWrite: false });
  const lifecycle = await auditRepository.getAuditLifecycleByOperationId('execute-operation');
  assert.deepEqual(lifecycle.map((event) => event.executionStatus), ['previewed', 'executing', 'succeeded']);
  assert.equal(lifecycle.every((event) => event.actorId !== actor.actorId), true);
  assert.equal(lifecycle.at(-1).sanitizedOutput.writesPerformed, 1);
});

test('confirmation, payload, tool, target, unknown-field, actor-session, missing operation, and expiry checks fail before Notion', async () => {
  const variants = [
    [{ confirm: false }, 'CONFIRMATION_REQUIRED'],
    [{ payload: { title: 'changed' } }, 'CONFIRMATION_MISMATCH'],
    [{ toolId: 'deleteCourse' }, 'TOOL_NOT_ALLOWED'],
    [{ targetDataSource: 'client-database' }, 'DATA_SOURCE_NOT_ALLOWED'],
    [{ databaseId: 'forbidden' }, 'MASS_ASSIGNMENT_REJECTED'],
  ];
  for (const [patch, code] of variants) {
    const { auditRepository, executeBody } = await setup(course(), { operationId: `validation-${code}` });
    let writes = 0;
    await assert.rejects(() => executeXchangeDraft({ body: { ...executeBody, ...patch }, req, actor, auditRepository, now: now + 1000, env, notionWriter: async () => { writes += 1; } }), { code });
    assert.equal(writes, 0);
  }
  const missing = createMemoryAuditRepository();
  await assert.rejects(() => executeXchangeDraft({ body: { operationId: 'missing' }, req, actor, auditRepository: missing, now, env }), { code: 'PREVIEW_NOT_FOUND' });
  const differentSession = await setup(course(), { operationId: 'different-session' });
  await assert.rejects(() => executeXchangeDraft({ body: differentSession.executeBody, req, actor: { ...actor, sessionId: 'session-b' }, auditRepository: differentSession.auditRepository, now: now + 1000, env }), { code: 'CONFIRMATION_REQUESTER_MISMATCH' });
  const expired = await setup(course(), { operationId: 'expired' });
  await assert.rejects(() => executeXchangeDraft({ body: expired.executeBody, req, actor, auditRepository: expired.auditRepository, now: new Date(expired.preview.previewExpiresAt).getTime() + 1, env }), { code: 'PREVIEW_EXPIRED' });
});

test('success replay and parallel execute never create a second Notion page', async () => {
  const serial = await setup(course(), { operationId: 'serial-idempotency' });
  let serialWrites = 0;
  const writer = async () => ({ externalRecordId: `page-${++serialWrites}`, createdAt: '2027-01-15T08:00:02.000Z' });
  const first = await executeXchangeDraft({ body: serial.executeBody, req, actor, auditRepository: serial.auditRepository, now: now + 1000, env, notionWriter: writer });
  const replay = await executeXchangeDraft({ body: serial.executeBody, req, actor, auditRepository: serial.auditRepository, now: now + 2000, env, notionWriter: writer });
  assert.equal(serialWrites, 1); assert.equal(first.replayed, false); assert.equal(replay.replayed, true); assert.equal(replay.externalRecordId, first.externalRecordId);

  const parallel = await setup(course(), { operationId: 'parallel-idempotency' });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let parallelWrites = 0;
  const pending = executeXchangeDraft({ body: parallel.executeBody, req, actor, auditRepository: parallel.auditRepository, now: now + 1000, env, notionWriter: async () => { parallelWrites += 1; await gate; return { externalRecordId: 'parallel-page', createdAt: '2027-01-15T08:00:03.000Z' }; } });
  await assert.rejects(() => executeXchangeDraft({ body: parallel.executeBody, req, actor, auditRepository: parallel.auditRepository, now: now + 1001, env, notionWriter: async () => { parallelWrites += 1; } }), { code: 'EXECUTION_IN_PROGRESS' });
  release();
  await pending;
  assert.equal(parallelWrites, 1);
});

test('each persisted superseded lifecycle signal blocks execution before the lock and Notion writer', async () => {
  const variants = [
    { sanitizedOutput: { auditEvent: 'preview_superseded', writesPerformed: 0 } },
    { source: 'xchange-preview-superseded', sanitizedOutput: { writesPerformed: 0 } },
    { confirmationStatus: 'superseded', sanitizedOutput: { writesPerformed: 0 } },
    { executionStatus: 'cancelled', sanitizedOutput: { newOperationId: 'replacement-preview', writesPerformed: 0 } },
  ];
  for (const [index, variant] of variants.entries()) {
    const current = await setup(course(), { operationId: `superseded-signal-${index}` });
    await current.auditRepository.updateAuditExecutionResult(current.preview.operationId, {
      operationId: current.preview.operationId, agentId: 'xchange', toolId: current.preview.toolId,
      executionStatus: 'previewed', confirmationStatus: 'pending', ...variant,
    });
    let writes = 0;
    await assert.rejects(() => executeXchangeDraft({ body: current.executeBody, req, actor, auditRepository: current.auditRepository, now: now + 1000, env, notionWriter: async () => { writes += 1; } }), { code: 'PREVIEW_SUPERSEDED' });
    assert.equal(writes, 0);
    assert.equal((await current.auditRepository.getAuditLifecycleByOperationId(current.preview.operationId)).some((event) => event.source === 'xchange-execution-claim'), false);
  }
});

test('persistent Airtable execution claim uses atomic Audit ID upsert and only the creator acquires it', async () => {
  const requests = [];
  let call = 0;
  const auditRepository = createAirtableAuditRepository({
    env: { AIRTABLE_API_KEY: 'audit-secret', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_AUDIT_TABLE_ID: 'tbl-audit' },
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body); requests.push({ method: options.method, body });
      call += 1;
      return { ok: true, json: async () => ({ records: [{ id: 'rec-lock' }], ...(call === 1 ? { createdRecords: ['rec-lock'], updatedRecords: [] } : { createdRecords: [], updatedRecords: ['rec-lock'] }) }) };
    },
  });
  const event = { auditId: 'xchange-lock-persistent', operationId: 'persistent', agentId: 'xchange', toolId: 'createCourseDraft', targetDataSource: 'notion-teaching-materials', executionStatus: 'executing', confirmationStatus: 'confirmed', actorId: 'actor_hash', actorSessionHash: 'session_hash' };
  const first = await auditRepository.acquireExecutionLock(event);
  const second = await auditRepository.acquireExecutionLock(event);
  assert.equal(first.acquired, true); assert.equal(second.acquired, false);
  assert.equal(requests.every(({ method }) => method === 'PATCH'), true);
  assert.equal(requests.every(({ body }) => body.performUpsert.fieldsToMergeOn[0] === 'Audit ID'), true);
  assert.equal(requests.every(({ body }) => body.records[0].fields['Audit ID'] === 'xchange-lock-persistent'), true);
  assert.equal(JSON.stringify(requests).includes('audit-secret'), false);
});

test('Airtable execution claim accepts record-ID objects and classifies missing outcome arrays as lock failure', async () => {
  const event = { auditId: 'xchange-lock-shape', operationId: 'shape', agentId: 'xchange', toolId: 'createCourseDraft', targetDataSource: 'notion-teaching-materials', executionStatus: 'executing' };
  const objectShape = createAirtableAuditRepository({
    env: { AIRTABLE_API_KEY: 'secret', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_AUDIT_TABLE_ID: 'tbl-audit' },
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ records: [{ id: 'rec-lock' }], createdRecords: [{ id: 'rec-lock' }], updatedRecords: [] }) }),
  });
  assert.equal((await objectShape.acquireExecutionLock(event)).acquired, true);

  const missingOutcome = createAirtableAuditRepository({
    env: { AIRTABLE_API_KEY: 'secret', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_AUDIT_TABLE_ID: 'tbl-audit' },
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ records: [{ id: 'rec-lock' }] }) }),
  });
  await assert.rejects(() => missingOutcome.acquireExecutionLock(event), (error) => {
    assert.equal(error.code, 'AUDIT_LOCK_FAILED'); assert.equal(error.causeCode, 'AUDIT_INVALID_RESPONSE');
    assert.equal(error.diagnosticReason, 'missing_upsert_outcome_arrays'); return true;
  });
});

test('Airtable lock diagnostics distinguish auth, permission, missing table, unknown field, and unusable merge field', async () => {
  const cases = [
    [401, { error: { type: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } }, 'AUDIT_REQUEST_REJECTED', 'authentication_failed'],
    [403, { error: { type: 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND', message: 'Invalid permissions' } }, 'AUDIT_REQUEST_REJECTED', 'permission_denied'],
    [404, { error: { type: 'NOT_FOUND', message: 'Could not find table' } }, 'AUDIT_REQUEST_REJECTED', 'base_or_table_not_found'],
    [422, { error: { type: 'UNKNOWN_FIELD_NAME', message: 'Unknown field name: Audit ID' } }, 'AUDIT_SCHEMA_INVALID', 'field_missing'],
    [422, { error: { type: 'INVALID_REQUEST', message: 'fieldsToMergeOn cannot contain a computed field' } }, 'AUDIT_SCHEMA_INVALID', 'merge_field_invalid'],
    [422, { error: { type: 'INVALID_REQUEST', message: 'Invalid performUpsert parameter validation' } }, 'AUDIT_SCHEMA_INVALID', 'upsert_payload_invalid'],
    [422, { error: { type: 'INVALID_VALUE_FOR_COLUMN', message: 'Field cannot accept the provided value' } }, 'AUDIT_SCHEMA_INVALID', 'field_type_invalid'],
  ];
  for (const [status, payload, causeCode, diagnosticReason] of cases) {
    const repository = createAirtableAuditRepository({
      env: { AIRTABLE_API_KEY: 'never-log-secret', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_AUDIT_TABLE_ID: 'tbl-audit' },
      fetchImpl: async () => ({ ok: false, status, json: async () => payload }),
    });
    await assert.rejects(() => repository.acquireExecutionLock({ auditId: `lock-${status}-${diagnosticReason}`, operationId: 'diagnostic', agentId: 'xchange' }), (error) => {
      assert.equal(error.code, 'AUDIT_LOCK_FAILED'); assert.equal(error.causeCode, causeCode);
      assert.equal(error.status, status); assert.equal(error.diagnosticReason, diagnosticReason);
      assert.equal(JSON.stringify(error).includes('never-log-secret'), false); return true;
    });
  }
});

test('Notion failure records failed with zero writes and an Audit claim failure prevents Notion', async () => {
  const failed = await setup(activity(), { operationId: 'notion-failure' });
  await assert.rejects(() => executeXchangeDraft({ body: failed.executeBody, req, actor, auditRepository: failed.auditRepository, now: now + 1000, env, notionWriter: async () => { throw Object.assign(new Error('private upstream detail'), { code: 'NOTION_REQUEST_FAILED' }); } }), { code: 'NOTION_REQUEST_FAILED' });
  const lifecycle = await failed.auditRepository.getAuditLifecycleByOperationId('notion-failure');
  assert.equal(lifecycle.at(-1).executionStatus, 'failed'); assert.equal(lifecycle.at(-1).sanitizedOutput.writesPerformed, 0);

  const closed = await setup(course(), { operationId: 'audit-failure' });
  closed.auditRepository.acquireExecutionLock = async () => { throw Object.assign(new Error('audit unavailable'), { code: 'AUDIT_LOCK_FAILED', causeCode: 'AUDIT_SCHEMA_INVALID', status: 422, diagnosticReason: 'merge_field_invalid', airtableErrorType: 'INVALID_REQUEST' }); };
  let notionCalls = 0;
  const logs = [];
  await assert.rejects(() => executeXchangeDraft({ body: closed.executeBody, req, actor, auditRepository: closed.auditRepository, now: now + 1000, env, notionWriter: async () => { notionCalls += 1; }, logger: (line) => logs.push(line) }), { code: 'AUDIT_PERSISTENCE_FAILED', internalErrorCode: 'AUDIT_LOCK_FAILED' });
  assert.equal(notionCalls, 0);
  assert.equal(logs.length, 1); assert.match(logs[0], /"internalErrorCode":"AUDIT_LOCK_FAILED"/); assert.match(logs[0], /"httpStatus":422/); assert.match(logs[0], /"diagnosticReason":"merge_field_invalid"/);
  assert.equal(logs[0].includes('audit unavailable'), false);
});

function productionSchema() {
  return {
    '標題': { type: 'title', title: {} }, '教學分類': { type: 'select', select: { options: ['AI', '商業', '心理', '教育', '跨域'].map((name) => ({ name })) } },
    '形式': { type: 'multi_select', multi_select: { options: ['PPT', '課堂講義', '案例', '影片', '問卷', 'Workshop'].map((name) => ({ name })) } },
    '子主題': { type: 'rich_text', rich_text: {} },
    '對象': { type: 'multi_select', multi_select: { options: ['大學生', '研究生', '中國學生', '韓國學生', '在職人員'].map((name) => ({ name })) } },
    '可講時間(分)': { type: 'number', number: {} },
    '難度': { type: 'select', select: { options: ['初級', '中級', '高級'].map((name) => ({ name })) } },
    '語言': { type: 'multi_select', multi_select: { options: ['中文', '韓文', '英文'].map((name) => ({ name })) } },
    '標籤': { type: 'multi_select', multi_select: { options: ['重要', '熱門', '實驗中', '核心'].map((name) => ({ name })) } },
    '檔案連結': { type: 'url', url: {} }, '狀態': { type: 'status', status: { options: ['未開始', '進行中', '完成'].map((name) => ({ name })) } },
    '公開狀態': { type: 'select', select: { options: ['Hidden', 'Draft', 'Published'].map((name) => ({ name })) } },
  };
}

test('Production Notion schema validates and maps select, status, multi-select, rich text, number, and URL safely', () => {
  const schema = productionSchema();
  assert.equal(validateXchangeNotionSchema(schema).missingProperties.length, 0);
  const courseProperties = buildXchangeNotionProperties({ draftType: 'course', payload: { ...course().payload, fileUrl: 'https://example.test/course' }, schema });
  assert.equal(courseProperties['標題'].title[0].text.content, 'AI Marketing');
  assert.equal(courseProperties['教學分類'].select.name, '教育'); assert.deepEqual(courseProperties['形式'].multi_select, [{ name: 'Workshop' }]);
  assert.equal(courseProperties['難度'].select.name, '初級'); assert.deepEqual(courseProperties['語言'].multi_select, [{ name: '英文' }]);
  assert.equal(courseProperties['狀態'].status.name, '未開始'); assert.equal(courseProperties['公開狀態'].select.name, 'Draft');
  assert.equal(courseProperties['檔案連結'].url, 'https://example.test/course'); assert.equal('標籤' in courseProperties, false);

  const activityProperties = buildXchangeNotionProperties({ draftType: 'learning_activity', payload: { ...activity().payload, materialsUrl: 'https://example.test/activity' }, schema });
  assert.equal(activityProperties['標題'].title[0].text.content, '比較活動'); assert.equal(activityProperties['教學分類'].select.name, '教育');
  assert.equal(activityProperties['子主題'].rich_text[0].text.content, '比較兩個回答。'); assert.deepEqual(activityProperties['形式'].multi_select, [{ name: 'Workshop' }]);
  assert.equal(isPublishedNotionPage({ properties: activityProperties }, ['公開狀態']), false);
});

test('schema diagnostics fail closed for missing title, wrong type, and missing Draft visibility option', () => {
  const missingTitle = { ...productionSchema() }; delete missingTitle['標題'];
  assert.throws(() => validateXchangeNotionSchema(missingTitle), (error) => {
    assert.equal(error.code, 'SCHEMA_MISMATCH'); assert.deepEqual(error.schemaDiagnostics.missingProperties, ['標題']); return true;
  });
  assert.throws(() => validateXchangeNotionSchema({ ...productionSchema(), '狀態': { type: 'checkbox', checkbox: {} } }), (error) => {
    assert.deepEqual(error.schemaDiagnostics.mismatchedProperties, [{ property: '狀態', expectedType: ['status'], actualType: 'checkbox' }]); return true;
  });
  assert.throws(() => validateXchangeNotionSchema({ ...productionSchema(), '狀態': { type: 'status', status: { options: [{ name: '進行中' }, { name: '完成' }] } } }), (error) => {
    assert.deepEqual(error.schemaDiagnostics.missingRequiredOptions[0], { property: '狀態', requiredOption: '未開始', availableOptions: ['進行中', '完成'] }); return true;
  });
  assert.throws(() => validateXchangeNotionSchema({ ...productionSchema(), '公開狀態': { type: 'select', select: { options: [{ name: 'Hidden' }, { name: 'Published' }] } } }), (error) => {
    assert.deepEqual(error.schemaDiagnostics.missingRequiredOptions[0], { property: '公開狀態', requiredOption: 'Draft', availableOptions: ['Hidden', 'Published'] }); return true;
  });
});

test('missing optional properties are omitted without weakening required Draft visibility', () => {
  const schema = productionSchema();
  for (const name of ['形式', '對象', '標籤', '檔案連結']) delete schema[name];
  const diagnostics = validateXchangeNotionSchema(schema);
  assert.deepEqual(diagnostics.optionalPropertiesOmitted, ['形式', '對象', '標籤', '檔案連結']);
  const properties = buildXchangeNotionProperties({ draftType: 'course', payload: { ...course().payload, fileUrl: 'https://example.test/course' }, schema });
  for (const name of ['形式', '對象', '標籤', '檔案連結']) assert.equal(name in properties, false);
  assert.equal(properties['公開狀態'].select.name, 'Draft'); assert.equal(isPublishedNotionPage({ properties }, ['公開狀態']), false);
});

test('schema mismatch logs safe property diagnostics and never calls pages.create', async () => {
  const logs = [];

  let creates = 0;
  const notionClient = {
    databases: { retrieve: async () => ({ data_sources: [{ id: 'server-data-source' }] }) },
    dataSources: { retrieve: async () => ({ properties: { ...productionSchema(), '狀態': { type: 'checkbox', checkbox: {} } } }) },
    pages: { create: async () => { creates += 1; } },
  };
  await assert.rejects(() => createXchangeNotionDraft({ draftType: 'course', payload: course().payload, env: { NOTION_API_KEY: 'secret', NOTION_TEACHING_DATABASE_ID: 'server-database' }, notionClient, logger: (line) => logs.push(line) }), { code: 'SCHEMA_MISMATCH' });
  assert.equal(creates, 0);
  assert.match(logs[0], /"property":"狀態"/); assert.match(logs[0], /"expectedType":\["status"\]/); assert.match(logs[0], /"actualType":"checkbox"/);
  assert.equal(logs[0].includes('server-database'), false); assert.equal(logs[0].includes('secret'), false);
});

test('valid Production schema calls pages.create exactly once and returns a Private Draft result', async () => {
  const createCalls = [];
  let updates = 0; let deletes = 0; let publishes = 0;
  const validClient = {
    databases: { retrieve: async (input) => { assert.deepEqual(input, { database_id: 'server-database' }); return { data_sources: [{ id: 'server-data-source' }] }; } },
    dataSources: { retrieve: async () => ({ properties: productionSchema() }) },
    pages: {
      create: async (input) => { createCalls.push(input); return { id: 'created-notion-page', created_time: '2027-01-15T08:00:04.000Z' }; },
      update: async () => { updates += 1; }, delete: async () => { deletes += 1; }, publish: async () => { publishes += 1; },
    },
  };
  const content = createStructuredContent('learning_activity', activity().payload).content;
  const written = await createXchangeNotionDraft({ draftType: 'learning_activity', payload: activity().payload, content, env: { NOTION_API_KEY: 'not-returned-secret', NOTION_TEACHING_DATABASE_ID: 'server-database' }, notionClient: validClient });
  assert.equal(createCalls.length, 1); assert.deepEqual(createCalls[0].parent, { data_source_id: 'server-data-source' });
  assert.equal(createCalls[0].properties['狀態'].status.name, '未開始'); assert.equal(createCalls[0].properties['公開狀態'].select.name, 'Draft');
  assert.equal(isPublishedNotionPage({ properties: createCalls[0].properties }, ['公開狀態']), false);
  assert.equal(createCalls[0].children.length > 0, true);
  assert.deepEqual({ updates, deletes, publishes }, { updates: 0, deletes: 0, publishes: 0 });
  assert.deepEqual(written, { externalRecordId: 'created-notion-page', createdAt: '2027-01-15T08:00:04.000Z', properties: createCalls[0].properties, notionPageCreated: true, pageCreated: true, bodyComplete: true, bodyBlocksWritten: createCalls[0].children.length, bodyAppendBatches: 0, partialExternalWrite: false });
  assert.equal(JSON.stringify(written).includes('not-returned-secret'), false);
});
