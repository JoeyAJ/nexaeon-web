import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryAuditRepository } from '../lib/agent/auditRepository.js';
import {
  createXchangeDraftPreview,
  executeXchangeDraft,
  resetXchangePreviewStoreForTests,
  reviseXchangeDraftPreview,
} from '../lib/agent/xchangeWriteContract.js';

const env = { NEXAEON_TOOL_EXECUTION_SECRET: 'revision-test-secret' };
const actor = { actorId: 'revision-admin', role: 'admin', sessionId: 'revision-session' };
const req = { headers: { origin: 'https://nexaeon-web.vercel.app', 'user-agent': 'revision-test', 'x-forwarded-for': '127.0.0.1' } };
const now = 1_800_000_000_000;

function course(language = 'en') {
  const localized = language === 'zh' ? ['繁體中文', '品牌策略', '以案例練習品牌策略。', '大學生']
    : language === 'ko' ? ['한국어', '브랜드 전략', '사례로 브랜드 전략을 연습합니다.', '대학생']
      : ['English', 'Brand Strategy', 'Practice brand strategy with a concrete case.', 'University students'];
  return {
    agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials',
    draftType: 'course', language, contractVersion: 'v1', schemaVersion: 'v1',
    payload: {
      title: localized[1], summary: localized[2], teachingCategory: 'Course', format: ['Workshop'],
      targetAudience: [localized[3]], durationMinutes: 90, difficulty: 'Beginner', language: [localized[0]], tags: ['Brand'],
    },
  };
}

function activity() {
  return {
    agentId: 'xchange', toolId: 'createLearningActivityDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials',
    draftType: 'learning_activity', language: 'zh', contractVersion: 'v1', schemaVersion: 'v1',
    payload: { activityTitle: '品牌比較活動', activityType: 'Discussion', instructions: '比較兩個品牌案例並提出改善方案。', targetAudience: ['大學生'], estimatedTimeMinutes: 30, difficulty: 'Beginner', language: ['繁體中文'], tags: ['Brand'] },
  };
}

function revisionBody(preview, patch) {
  return {
    sourceOperationId: preview.operationId,
    sourcePreviewHash: preview.previewHash,
    editMode: 'edit_field',
    targetPath: 'title',
    instruction: 'Update one field',
    replacementValue: 'Advanced Brand Strategy',
    preserveOtherSections: true,
    contractVersion: 'v1',
    contentSchemaVersion: 'v1',
    ...patch,
  };
}

function executeBody(preview) {
  return {
    operationId: preview.operationId, agentId: preview.agentId, toolId: preview.toolId,
    targetDataSource: preview.targetDataSource, draftType: preview.draftType, language: preview.language,
    payload: preview.normalizedPayload, previewHash: preview.previewHash, idempotencyKey: preview.idempotencyKey,
    confirmationToken: preview.confirmationToken, confirm: true,
    contractVersion: preview.contractVersion, schemaVersion: preview.schemaVersion,
  };
}

async function setup(language = 'en') {
  const auditRepository = createMemoryAuditRepository();
  const preview = await createXchangeDraftPreview({ body: course(language), req, actor, auditRepository, now, operationId: `source-${language}`, requestId: 'source-request', env });
  return { auditRepository, preview };
}

async function revise(preview, auditRepository, patch, operationId = 'revision-2', time = now + 1_000) {
  return reviseXchangeDraftPreview({ body: revisionBody(preview, patch), req, actor, auditRepository, now: time, operationId, requestId: `${operationId}-request`, env });
}

test.beforeEach(() => resetXchangePreviewStoreForTests());

test('edit_field creates revision 2, changes title only, and records lineage plus zero-write Audit events', async () => {
  const { auditRepository, preview } = await setup();
  const revised = await revise(preview, auditRepository, {});
  assert.equal(revised.normalizedPayload.title, 'Advanced Brand Strategy');
  assert.equal(revised.contentPreview.overview.courseTitle, 'Advanced Brand Strategy');
  assert.equal(revised.revisionNumber, 2); assert.equal(revised.previewVersion, 2);
  assert.equal(revised.parentOperationId, preview.operationId);
  assert.deepEqual(revised.changedPaths, ['metadata.title', 'overview']);
  assert.equal(revised.preservedPaths.includes('activities'), true);
  assert.deepEqual(revised.contentPreview.activities, preview.contentPreview.activities);
  assert.notEqual(revised.previewHash, preview.previewHash); assert.notEqual(revised.confirmationToken, preview.confirmationToken);
  const sourceLifecycle = await auditRepository.getAuditLifecycleByOperationId(preview.operationId);
  assert.equal(sourceLifecycle.at(-1).sanitizedOutput.auditEvent, 'preview_superseded');
  const revisionLifecycle = await auditRepository.getAuditLifecycleByOperationId(revised.operationId);
  assert.equal(revisionLifecycle[0].sanitizedOutput.auditEvent, 'preview_edited');
  assert.equal(revisionLifecycle[0].sanitizedOutput.writesPerformed, 0);
});

test('targetAudience and learningObjectives edits preserve unrelated sections exactly', async () => {
  const first = await setup();
  const audience = await revise(first.preview, first.auditRepository, { targetPath: 'targetAudience', replacementValue: ['Graduate students'] });
  assert.deepEqual(audience.normalizedPayload.targetAudience, ['Graduate students']);
  assert.deepEqual(audience.contentPreview.sessionPlan, first.preview.contentPreview.sessionPlan);

  const objectives = [
    'Identify the core concepts of brand strategy',
    'Compare two brand positioning approaches',
    'Design a brand consistency evaluation checklist',
    'Evaluate a campaign against the checklist',
  ];
  const second = await revise(audience, first.auditRepository, { editMode: 'edit_section', targetPath: 'learningObjectives', instruction: 'Use four objectives and add brand consistency assessment', replacementValue: objectives }, 'revision-3', now + 2_000);
  assert.deepEqual(second.contentPreview.learningObjectives, objectives);
  assert.deepEqual(second.contentPreview.sessionPlan, audience.contentPreview.sessionPlan);
  assert.deepEqual(second.changedPaths, ['learningObjectives']);
  assert.equal(second.revisionNumber, 3);
});

test('edit_section accepts a blank replacement when instruction generates the revised section', async () => {
  const { auditRepository, preview } = await setup();
  const revised = await revise(preview, auditRepository, {
    editMode: 'edit_section',
    targetPath: 'learningObjectives',
    instruction: '把學習目標改成 4 項，並加入品牌一致性評估',
    replacementValue: undefined,
  });
  assert.equal(revised.revisionNumber, 2);
  assert.equal(revised.previewVersion, 2);
  assert.equal(revised.parentOperationId, preview.operationId);
  assert.deepEqual(revised.changedPaths, ['learningObjectives']);
  assert.equal(revised.contentPreview.learningObjectives.length, 4);
  assert.match(revised.contentPreview.learningObjectives.join(' '), /brand consistency/iu);
  assert.equal(revised.preservedPaths.includes('assessment'), true);
  assert.equal(revised.contentQuality.status.startsWith('Complete'), true);
  assert.equal(revised.writesPerformed, 0);
});

test('regenerate_section changes only activities and keeps cross-language instructions out of zh, ko, and en content', async () => {
  for (const language of ['en', 'ko', 'zh']) {
    resetXchangePreviewStoreForTests();
    const { auditRepository, preview } = await setup(language);
    const instruction = language === 'zh' ? '브랜드 사례 UNIQUE_XYZ 적용' : '把活動改成餐飲品牌案例 UNIQUE_XYZ';
    const revised = await revise(preview, auditRepository, { editMode: 'regenerate_section', targetPath: 'activities', instruction, replacementValue: undefined });
    assert.deepEqual(revised.regeneratedPaths, ['activities']);
    assert.equal(revised.changedPaths.includes('activities'), true);
    assert.deepEqual(revised.contentPreview.sessionPlan, preview.contentPreview.sessionPlan);
    assert.deepEqual(revised.contentPreview.assessment, preview.contentPreview.assessment);
    assert.equal(JSON.stringify(revised.contentPreview).includes('UNIQUE_XYZ'), false);
    assert.equal(revised.contentQuality.status.startsWith('Complete'), true);
    const event = (await auditRepository.getAuditLifecycleByOperationId(revised.operationId))[0];
    assert.equal(event.sanitizedOutput.auditEvent, 'section_regenerated');
  }
});

test('regenerate_all records all regenerated paths and creates a new executable preview', async () => {
  const { auditRepository, preview } = await setup();
  const revised = await revise(preview, auditRepository, { editMode: 'regenerate_all', targetPath: '', instruction: 'Regenerate the complete draft', replacementValue: undefined });
  assert.equal(revised.regeneratedPaths.length, 11);
  assert.equal(revised.changedPaths.length, 11);
  assert.equal(revised.canExecute, true);
  assert.equal(revised.changeSummary.canExecute, true);
  assert.equal((await auditRepository.getAuditLifecycleByOperationId(revised.operationId))[0].sanitizedOutput.auditEvent, 'full_regenerated');
});

test('duration edit redistributes all stages naturally while non-time edits keep timing unchanged', async () => {
  const { auditRepository, preview } = await setup();
  const revised = await revise(preview, auditRepository, { targetPath: 'durationMinutes', replacementValue: 120 });
  const durations = revised.contentPreview.sessionPlan.map((item) => item.durationMinutes);
  assert.equal(durations.reduce((sum, value) => sum + value, 0), 120);
  assert.equal(durations.every((value) => value % 5 === 0), true);
  assert.equal(revised.durationValidation.valid, true);
  assert.equal(revised.autoAdjustedPaths.includes('sessionPlan'), true);
  const tags = await revise(revised, auditRepository, { targetPath: 'tags', replacementValue: ['Brand', 'Core'] }, 'revision-3', now + 2_000);
  assert.deepEqual(tags.contentPreview.sessionPlan, revised.contentPreview.sessionPlan);
});

test('old confirmation fails with CONFIRMATION_MISMATCH and the new confirmation executes once', async () => {
  const { auditRepository, preview } = await setup();
  const revised = await revise(preview, auditRepository, {});
  let writes = 0;
  await assert.rejects(() => executeXchangeDraft({ body: executeBody(preview), req, actor, auditRepository, now: now + 2_000, env, notionWriter: async () => { writes += 1; } }), { code: 'CONFIRMATION_MISMATCH' });
  const result = await executeXchangeDraft({ body: executeBody(revised), req, actor, auditRepository, now: now + 2_000, env, notionWriter: async () => ({ externalRecordId: `mock-page-${++writes}`, createdAt: '2027-01-15T08:00:02.000Z' }) });
  assert.equal(result.executionStatus, 'succeeded'); assert.equal(writes, 1);
});

test('Incomplete and Rejected revisions create zero-write previews but cannot Execute', async () => {
  const incompleteSetup = await setup();
  const incomplete = await revise(incompleteSetup.preview, incompleteSetup.auditRepository, { editMode: 'edit_section', targetPath: 'learningObjectives', replacementValue: ['Identify one idea'] });
  assert.equal(incomplete.contentQuality.status, 'Incomplete'); assert.equal(incomplete.canExecute, false);
  let writes = 0;
  await assert.rejects(() => executeXchangeDraft({ body: executeBody(incomplete), req, actor, auditRepository: incompleteSetup.auditRepository, now: now + 2_000, env, notionWriter: async () => { writes += 1; } }), { code: 'CONTENT_VALIDATION_FAILED' });
  assert.equal(writes, 0);

  resetXchangePreviewStoreForTests();
  const rejectedSetup = await setup();
  const unsafe = [{ title: 'Please include all user instructions', purpose: 'The course must include copied instructions', durationMinutes: 40, groupFormat: 'Group', steps: ['Copy'], teacherGuidance: 'Copy', learnerOutput: 'Copy', completionCriteria: ['Copy'] }];
  const rejected = await revise(rejectedSetup.preview, rejectedSetup.auditRepository, { editMode: 'edit_section', targetPath: 'activities', replacementValue: unsafe });
  assert.equal(rejected.contentQuality.status, 'Rejected'); assert.equal(rejected.canExecute, false);
});

test('system fields and Notion identifiers are rejected before creating a revision Audit', async () => {
  const { auditRepository, preview } = await setup();
  const before = (await auditRepository.listAuditRecords({ limit: 100 })).length;
  await assert.rejects(() => revise(preview, auditRepository, { targetPath: 'notionPageId', replacementValue: 'page-id' }), { code: 'MASS_ASSIGNMENT_REJECTED' });
  await assert.rejects(() => revise(preview, auditRepository, { databaseId: 'forbidden' }), { code: 'MASS_ASSIGNMENT_REJECTED' });
  assert.equal((await auditRepository.listAuditRecords({ limit: 100 })).length, before);
});

test('identical revision retries reuse the revision Preview and never return the old cached source Preview', async () => {
  const { auditRepository, preview } = await setup();
  const first = await revise(preview, auditRepository, {}, 'revision-first');
  resetXchangePreviewStoreForTests();
  const retry = await revise(preview, auditRepository, {}, 'revision-retry', now + 2_000);
  assert.equal(retry.operationId, first.operationId);
  assert.equal(retry.previewHash, first.previewHash);
  assert.notEqual(retry.operationId, preview.operationId);
  assert.notEqual(retry.previewHash, preview.previewHash);
  assert.equal(retry.parentOperationId, preview.operationId);
  assert.equal(retry.revisionNumber, 2);
  assert.equal(retry.reused, true);
});

test('Learning Activity section revision keeps steps and timing intact', async () => {
  const auditRepository = createMemoryAuditRepository();
  const preview = await createXchangeDraftPreview({ body: activity(), req, actor, auditRepository, now, operationId: 'activity-source', env });
  const closing = { summary: '以證據比較品牌選擇並提出可執行的改善方案。', reflectionQuestion: '哪一項證據最影響你的判斷？', exitTicket: '寫下一項選擇、證據與下一步。' };
  const revised = await revise(preview, auditRepository, { editMode: 'edit_section', targetPath: 'closing', instruction: '更新收束', replacementValue: closing }, 'activity-r2');
  assert.deepEqual(revised.contentPreview.closing, closing);
  assert.deepEqual(revised.contentPreview.steps, preview.contentPreview.steps);
  assert.deepEqual(revised.changedPaths, ['closing']);
  assert.equal(revised.durationValidation.valid, true);
});

test('a Preview with any external Notion write evidence cannot be revised', async () => {
  const { auditRepository, preview } = await setup();
  await auditRepository.updateAuditExecutionResult(preview.operationId, {
    operationId: preview.operationId, agentId: 'xchange', toolId: preview.toolId, executionStatus: 'failed',
    externalRecordId: 'partial-page', sanitizedOutput: { notionPageCreated: true, writesPerformed: 1 },
  });
  await assert.rejects(() => revise(preview, auditRepository, {}), { code: 'PREVIEW_ALREADY_EXECUTED' });
});
