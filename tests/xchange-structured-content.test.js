import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCourseNotionBlocks,
  buildLearningActivityNotionBlocks,
  createStructuredContent,
  generateCourseContent,
  generateLearningActivityContent,
  validateStructuredContent,
  XCHANGE_CONTENT_RENDERER_VERSION,
  XCHANGE_CONTENT_SCHEMA_VERSION,
} from '../lib/agent/xchangeStructuredContent.js';
import { createXchangeNotionDraft } from '../lib/agent/xchangeNotionWriter.js';
import { createMemoryAuditRepository } from '../lib/agent/auditRepository.js';
import { createXchangeDraftPreview, executeXchangeDraft, resetXchangePreviewStoreForTests } from '../lib/agent/xchangeWriteContract.js';

const coursePayload = (language = 'en') => ({ title: 'Evidence-led AI course', summary: 'Use evidence to make and revise decisions.', teachingCategory: 'Course', format: ['Workshop'], targetAudience: ['Students'], durationMinutes: 90, difficulty: 'Intermediate', language: [language], tags: ['AI'] });
const activityPayload = (language = 'en') => ({ activityTitle: 'Evidence comparison', activityType: 'Discussion', instructions: 'Compare two responses and justify a revision.', targetAudience: ['Students'], estimatedTimeMinutes: 30, difficulty: 'Beginner', language: [language], tags: ['AI'] });

function notionSchema() {
  const options = (...names) => names.map((name) => ({ name }));
  return {
    '標題': { type: 'title', title: {} }, '教學分類': { type: 'select', select: { options: options('教育') } },
    '形式': { type: 'multi_select', multi_select: { options: options('Workshop') } }, '子主題': { type: 'rich_text', rich_text: {} },
    '對象': { type: 'multi_select', multi_select: { options: options('大學生') } }, '可講時間(分)': { type: 'number', number: {} },
    '難度': { type: 'select', select: { options: options('初級', '中級', '高級') } }, '語言': { type: 'multi_select', multi_select: { options: options('中文', '韓文', '英文') } },
    '標籤': { type: 'multi_select', multi_select: { options: options('AI') } }, '檔案連結': { type: 'url', url: {} },
    '狀態': { type: 'status', status: { options: options('未開始') } }, '公開狀態': { type: 'select', select: { options: options('Draft') } },
  };
}

test('Course content v1 has every required section, measurable objectives, concrete output, and an exact duration total', () => {
  const { content, quality } = createStructuredContent('course', coursePayload());
  assert.equal(XCHANGE_CONTENT_SCHEMA_VERSION, 'v1'); assert.equal(XCHANGE_CONTENT_RENDERER_VERSION, 'v1');
  assert.deepEqual(Object.keys(content), ['overview', 'learningObjectives', 'learningOutcomes', 'sessionPlan', 'coreContent', 'activities', 'discussionQuestions', 'assessment', 'resources', 'risksAndNotes', 'extension']);
  assert.equal(content.learningObjectives.length, 3); assert.equal(content.sessionPlan.length, 3);
  assert.equal(content.sessionPlan.reduce((sum, stage) => sum + stage.durationMinutes, 0), 90);
  assert.equal(quality.durationValidation.valid, true); assert.match(quality.status, /^Complete/u);
});

test('Learning Activity content v1 has usable scripts, differentiation, output, and an exact step duration total', () => {
  const { content, quality } = createStructuredContent('learning_activity', activityPayload());
  assert.equal(content.steps.length, 3); assert.equal(content.teacherScript.length, 3);
  assert.equal(content.steps.reduce((sum, step) => sum + step.durationMinutes, 0), 30);
  assert.equal(content.expectedOutput.requirements.length >= 3, true); assert.equal(quality.durationValidation.valid, true);
});

test('missing sections, empty content, duration mismatches, and generic teacher/learner actions are incomplete', () => {
  const course = generateCourseContent(coursePayload());
  delete course.assessment;
  assert.equal(validateStructuredContent('course', course).status, 'Incomplete');
  assert.equal(validateStructuredContent('course', {}).status, 'Incomplete');
  const activity = generateLearningActivityContent(activityPayload());
  activity.steps[0].durationMinutes += 1;
  activity.steps[1].teacherInstruction = 'Teacher explains';
  const quality = validateStructuredContent('learning_activity', activity);
  assert.equal(quality.status, 'Incomplete'); assert.equal(quality.durationValidation.valid, false);
});

test('duplicate content produces a warning while an invented or unsafe URL is rejected', () => {
  const content = generateCourseContent(coursePayload());
  content.discussionQuestions[1] = content.discussionQuestions[0];
  const warning = validateStructuredContent('course', content);
  assert.equal(warning.status, 'Complete with warnings'); assert.equal(warning.warnings.some((item) => /repeated/u.test(item)), true);
  content.risksAndNotes.push('Read http://invented.invalid/source');
  const rejected = validateStructuredContent('course', content);
  assert.equal(rejected.status, 'Rejected'); assert.equal(rejected.errors.some((item) => /Unverified source URL/u.test(item)), true);
});

test('Traditional Chinese, Korean, and English use one schema and render localized canonical text', () => {
  const zh = generateCourseContent(coursePayload('zh')); const ko = generateCourseContent(coursePayload('ko')); const en = generateCourseContent(coursePayload('en'));
  assert.deepEqual(Object.keys(zh), Object.keys(ko)); assert.deepEqual(Object.keys(ko), Object.keys(en));
  assert.match(zh.learningObjectives[0], /辨識/u); assert.match(ko.learningObjectives[0], /식별/u); assert.match(en.learningObjectives[0], /Identify/u);
  assert.equal(zh.overview.language, 'zh'); assert.equal(ko.overview.language, 'ko'); assert.equal(en.overview.language, 'en');
});

test('Notion builders emit only the approved body block types and estimate the exact rendered count', () => {
  for (const [draftType, payload, builder] of [['course', coursePayload(), buildCourseNotionBlocks], ['learning_activity', activityPayload(), buildLearningActivityNotionBlocks]]) {
    const { content, quality } = createStructuredContent(draftType, payload); const blocks = builder(content);
    const allowed = new Set(['heading_1', 'heading_2', 'paragraph', 'bulleted_list_item', 'numbered_list_item', 'to_do', 'callout', 'quote', 'divider']);
    assert.equal(blocks.length, quality.estimatedBodyBlocks); assert.equal(blocks.every((item) => allowed.has(item.type)), true);
  }
});

test('Notion writer sends children in pages.create and appends overflow in bounded batches', async () => {
  const payload = coursePayload(); const content = generateCourseContent(payload);
  for (let index = 0; index < 20; index += 1) content.coreContent.push({ title: `Extension ${index}`, explanation: `Distinct explanation ${index} with evidence and application guidance.`, keyPoints: [`Distinct point ${index}A`, `Distinct point ${index}B`] });
  const createCalls = []; const appendCalls = [];
  const notionClient = {
    databases: { retrieve: async () => ({ data_sources: [{ id: 'source-id' }] }) },
    dataSources: { retrieve: async () => ({ properties: notionSchema() }) },
    pages: { create: async (input) => { createCalls.push(input); return { id: 'page-id', created_time: '2026-08-03T00:00:00.000Z' }; } },
    blocks: { children: { append: async (input) => { appendCalls.push(input); return {}; } } },
  };
  const result = await createXchangeNotionDraft({ draftType: 'course', payload, content, env: { NOTION_API_KEY: 'secret', NOTION_TEACHING_DATABASE_ID: 'database-id' }, notionClient });
  assert.equal(createCalls[0].children.length, 100); assert.equal(appendCalls.length > 0, true);
  assert.equal(appendCalls.every((call) => call.children.length <= 100 && call.block_id === 'page-id'), true);
  assert.equal(result.bodyComplete, true); assert.equal(result.bodyBlocksWritten, buildCourseNotionBlocks(content).length); assert.equal(result.partialExternalWrite, false);
});

test('append failure reports a retained partial external write and never deletes the created page', async () => {
  const payload = coursePayload(); const content = generateCourseContent(payload);
  for (let index = 0; index < 20; index += 1) content.coreContent.push({ title: `Failure extension ${index}`, explanation: `Unique failure explanation ${index} with sufficient detail.`, keyPoints: [`Failure point ${index}A`, `Failure point ${index}B`] });
  let creates = 0; let appends = 0;
  const notionClient = {
    databases: { retrieve: async () => ({ data_sources: [{ id: 'source-id' }] }) }, dataSources: { retrieve: async () => ({ properties: notionSchema() }) },
    pages: { create: async () => { creates += 1; return { id: 'partial-page' }; } },
    blocks: { children: { append: async () => { appends += 1; throw new Error('mock append failure'); } } },
  };
  await assert.rejects(() => createXchangeNotionDraft({ draftType: 'course', payload, content, env: { NOTION_API_KEY: 'secret', NOTION_TEACHING_DATABASE_ID: 'database-id' }, notionClient }), (error) => {
    assert.equal(error.code, 'NOTION_BODY_APPEND_FAILED'); assert.equal(error.externalRecordId, 'partial-page');
    assert.equal(error.partialExternalWrite, true); assert.equal(error.bodyComplete, false); assert.equal(error.writesPerformed, 1); return true;
  });
  assert.equal(creates, 1); assert.equal(appends, 1); assert.equal('delete' in notionClient.pages, false);
});

test('preview hash and confirmation claims bind canonical content, schema, renderer, and block count', async () => {
  resetXchangePreviewStoreForTests();
  const auditRepository = createMemoryAuditRepository();
  const actor = { actorId: 'admin', role: 'admin', sessionId: 'session' };
  const env = { NEXAEON_TOOL_EXECUTION_SECRET: 'test-secret' };
  const body = { agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials', draftType: 'course', language: 'en', payload: coursePayload(), contractVersion: 'v1', schemaVersion: 'v1' };
  const preview = await createXchangeDraftPreview({ body, req: { headers: {} }, actor, auditRepository, now: 1_800_000_000_000, operationId: 'content-binding', env });
  assert.equal(preview.contentSchemaVersion, 'v1'); assert.equal(preview.rendererVersion, 'v1'); assert.equal(preview.estimatedBodyBlocks > 0, true);
  assert.equal(preview.writesPerformed, 0); assert.ok(preview.contentPreview.overview); assert.match(preview.contentQuality.status, /^Complete/u);
  const lifecycle = await auditRepository.getAuditLifecycleByOperationId('content-binding');
  lifecycle[0].sanitizedOutput.contentPreview.overview.purpose = 'Tampered after preview';
  await assert.rejects(() => executeXchangeDraft({
    body: { operationId: preview.operationId, agentId: preview.agentId, toolId: preview.toolId, targetDataSource: preview.targetDataSource, draftType: preview.draftType, language: preview.language, payload: preview.normalizedPayload, previewHash: preview.previewHash, idempotencyKey: preview.idempotencyKey, confirmationToken: preview.confirmationToken, confirm: true, contractVersion: preview.contractVersion, schemaVersion: preview.schemaVersion },
    req: { headers: {} }, actor, auditRepository, now: 1_800_000_001_000, env, notionWriter: async () => { throw new Error('must not write'); },
  }), { code: 'CONFIRMATION_MISMATCH' });
});

test('partial external body failure is recorded in the failed Audit lifecycle with one page write', async () => {
  resetXchangePreviewStoreForTests();
  const auditRepository = createMemoryAuditRepository(); const actor = { actorId: 'admin', role: 'admin', sessionId: 'session' }; const env = { NEXAEON_TOOL_EXECUTION_SECRET: 'test-secret' };
  const body = { agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials', draftType: 'course', language: 'en', payload: coursePayload(), contractVersion: 'v1', schemaVersion: 'v1' };
  const preview = await createXchangeDraftPreview({ body, req: { headers: {} }, actor, auditRepository, now: 1_800_000_000_000, operationId: 'partial-audit', env });
  const executeBody = { operationId: preview.operationId, agentId: preview.agentId, toolId: preview.toolId, targetDataSource: preview.targetDataSource, draftType: preview.draftType, language: preview.language, payload: preview.normalizedPayload, previewHash: preview.previewHash, idempotencyKey: preview.idempotencyKey, confirmationToken: preview.confirmationToken, confirm: true, contractVersion: preview.contractVersion, schemaVersion: preview.schemaVersion };
  await assert.rejects(() => executeXchangeDraft({ body: executeBody, req: { headers: {} }, actor, auditRepository, now: 1_800_000_001_000, env, notionWriter: async () => { throw Object.assign(new Error('partial'), { code: 'NOTION_BODY_APPEND_FAILED', externalRecordId: 'partial-page', notionPageCreated: true, pageCreated: true, bodyComplete: false, bodyBlocksWritten: 100, bodyAppendBatches: 0, partialExternalWrite: true, writesPerformed: 1 }); } }), { code: 'NOTION_BODY_APPEND_FAILED' });
  const lifecycle = await auditRepository.getAuditLifecycleByOperationId('partial-audit'); const failed = lifecycle.at(-1);
  assert.equal(failed.executionStatus, 'failed'); assert.equal(failed.externalRecordId, 'partial-page');
  assert.deepEqual({ writesPerformed: failed.sanitizedOutput.writesPerformed, notionPageCreated: failed.sanitizedOutput.notionPageCreated, bodyComplete: failed.sanitizedOutput.bodyComplete, bodyBlocksWritten: failed.sanitizedOutput.bodyBlocksWritten, partialExternalWrite: failed.sanitizedOutput.partialExternalWrite }, { writesPerformed: 1, notionPageCreated: true, bodyComplete: false, bodyBlocksWritten: 100, partialExternalWrite: true });
});
