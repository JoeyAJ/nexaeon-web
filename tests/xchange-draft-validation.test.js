import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryAuditRepository } from '../lib/agent/auditRepository.js';
import {
  canonicalizeXchangeBlocks,
  readXchangeNotionDraft,
  validateXchangeDraftDelivery,
} from '../lib/agent/xchangeDraftValidation.js';
import { buildXchangeNotionBlocks } from '../lib/agent/xchangeStructuredContent.js';
import { packXchangeValidationSnapshot, unpackXchangeValidationSnapshot } from '../lib/agent/xchangeValidationSnapshot.js';
import { createXchangeDraftPreview, executeXchangeDraft, resetXchangePreviewStoreForTests, reviseXchangeDraftPreview } from '../lib/agent/xchangeWriteContract.js';

const now = Date.parse('2027-02-01T08:00:00.000Z');
const env = { NEXAEON_TOOL_EXECUTION_SECRET: 'validation-token-secret', NOTION_API_KEY: 'mock-notion-key' };
const actor = { actorId: 'validation-admin', role: 'admin', sessionId: 'validation-session' };
const req = { headers: { origin: 'https://nexaeon-web.vercel.app', 'user-agent': 'validation-test', 'x-forwarded-for': '203.0.113.40' } };

function courseBody() {
  return {
    agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials',
    draftType: 'course', language: 'en', contractVersion: 'v1', schemaVersion: 'v1',
    payload: { title: 'Brand Systems', summary: 'Build a measurable brand system.', teachingCategory: 'Education', format: ['Workshop'], targetAudience: ['University students'], durationMinutes: 90, difficulty: 'Beginner', language: ['en'], tags: ['core'] },
  };
}

function activityBody() {
  return {
    agentId: 'xchange', toolId: 'createLearningActivityDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials',
    draftType: 'learning_activity', language: 'en', contractVersion: 'v1', schemaVersion: 'v1',
    payload: { activityTitle: 'Brand Review', activityType: 'Workshop', instructions: 'Compare two brand artifacts.', targetAudience: ['University students'], estimatedTimeMinutes: 45, difficulty: 'Beginner', language: ['en'], tags: ['core'] },
  };
}

function notionText(content) { return [{ type: 'text', text: { content } }]; }

function expectedProperties(preview) {
  const course = preview.draftType === 'course';
  return {
    '標題': { title: notionText(course ? preview.normalizedPayload.title : preview.normalizedPayload.activityTitle) },
    '教學分類': { select: { name: '教育' } },
    '形式': { multi_select: [{ name: 'Workshop' }] },
    '子主題': { rich_text: notionText(course ? preview.normalizedPayload.summary : preview.normalizedPayload.instructions) },
    '對象': { multi_select: [{ name: '大學生' }] },
    '可講時間(分)': { number: course ? preview.normalizedPayload.durationMinutes : preview.normalizedPayload.estimatedTimeMinutes },
    '難度': { select: { name: '初級' } },
    '語言': { multi_select: [{ name: '英文' }] },
    '標籤': { multi_select: [{ name: '核心' }] },
    '狀態': { status: { name: '未開始' } },
    '公開狀態': { select: { name: 'Draft' } },
  };
}

function executeBody(preview) {
  return {
    operationId: preview.operationId, agentId: 'xchange', toolId: preview.toolId, targetDataSource: preview.targetDataSource,
    draftType: preview.draftType, language: preview.language, payload: preview.normalizedPayload, previewHash: preview.previewHash,
    idempotencyKey: preview.idempotencyKey, confirmationToken: preview.confirmationToken, confirm: true,
    contractVersion: 'v1', schemaVersion: 'v1',
  };
}

function validationBody(operationId) {
  return { executeOperationId: operationId, agentId: 'xchange', actionType: 'validate', contractVersion: 'v1', schemaVersion: 'v1' };
}

async function setup(body = courseBody(), { revision = false } = {}) {
  resetXchangePreviewStoreForTests();
  const auditRepository = createMemoryAuditRepository();
  let preview = await createXchangeDraftPreview({ body, req, actor, auditRepository, now, operationId: `execute-${body.draftType}-${revision ? 'revision' : 'initial'}`, env });
  if (revision) {
    preview = await reviseXchangeDraftPreview({
      body: { sourceOperationId: preview.operationId, sourcePreviewHash: preview.previewHash, editMode: 'edit_section', targetPath: 'learningObjectives', instruction: 'Use four measurable objectives including brand consistency evaluation.', replacementValue: ['Identify brand principles', 'Compare brand approaches', 'Design a brand consistency evaluation', 'Evaluate results and recommend revisions'], preserveOtherSections: true, contractVersion: 'v1', contentSchemaVersion: 'v1' },
      req, actor, auditRepository, now: now + 100, operationId: 'execute-course-revision-v2', env,
    });
  }
  const properties = expectedProperties(preview);
  await executeXchangeDraft({
    body: executeBody(preview), req, actor, auditRepository, now: now + 1000, env,
    notionWriter: async () => ({ externalRecordId: `page-${preview.operationId}`, createdAt: '2027-02-01T08:00:01.000Z', properties, parentDataSourceId: 'data-source-learning-coaching', notionPageCreated: true, bodyComplete: true, bodyBlocksWritten: preview.estimatedBodyBlocks, bodyAppendBatches: 1, partialExternalWrite: false }),
  });
  return { auditRepository, preview, properties };
}

function actualPage(properties, overrides = {}) {
  return { id: 'page', properties: structuredClone(properties), parent: { type: 'data_source_id', data_source_id: 'data-source-learning-coaching' }, archived: false, in_trash: false, created_time: '2027-02-01T08:00:01.000Z', last_edited_time: '2027-02-01T08:00:01.000Z', url: 'https://notion.test/page', ...overrides };
}

function readerFor(preview, properties, { page = {}, blocks } = {}) {
  return async ({ pageId, expectedParentDataSourceId }) => {
    assert.equal(pageId, `page-${preview.operationId}`); assert.equal(expectedParentDataSourceId, 'data-source-learning-coaching');
    return { page: actualPage(properties, page), blocks: blocks || buildXchangeNotionBlocks(preview.draftType, preview.contentPreview), notionReadsPerformed: 2 };
  };
}

test('successful Course validation resolves the page only from Audit and returns Ready with zero writes', async () => {
  const current = await setup();
  const result = await validateXchangeDraftDelivery({ body: validationBody(current.preview.operationId), req, actor, auditRepository: current.auditRepository, notionReader: readerFor(current.preview, current.properties), now: now + 2000, validationOperationId: 'validation-ready' });
  assert.equal(result.readinessStatus, 'Ready');
  assert.deepEqual({ properties: result.propertiesStatus, content: result.contentStatus, revision: result.revisionStatus, duration: result.durationStatus, safety: result.safetyStatus }, { properties: 'passed', content: 'passed', revision: 'passed', duration: 'passed', safety: 'passed' });
  assert.equal(result.expectedContentHash, result.actualContentHash); assert.equal(result.expectedPropertiesHash, result.actualPropertiesHash);
  assert.equal(result.writesPerformed, 0); assert.equal(result.externalRecordId, `page-${current.preview.operationId}`);
  const executeLifecycle = await current.auditRepository.getAuditLifecycleByOperationId(current.preview.operationId);
  assert.equal(executeLifecycle.findLast((event) => event.executionStatus === 'succeeded').sanitizedOutput.validationSnapshot.data.length < 11_000, true);
  const lifecycle = await current.auditRepository.getAuditLifecycleByOperationId('validation-ready');
  assert.deepEqual(lifecycle.map((event) => event.sanitizedOutput.validationEvent), ['validation_started', 'validation_succeeded']);
  assert.equal(lifecycle.every((event) => event.actionType === 'validate' && event.permissionLevel === 'READ_VALIDATE' && event.sanitizedOutput.writesPerformed === 0), true);
  assert.equal(lifecycle.at(-1).sanitizedOutput.executeOperationId, current.preview.operationId);
});

test('Learning Activity and revised Course snapshots validate all required sections and revision paths', async () => {
  const activity = await setup(activityBody());
  const activityResult = await validateXchangeDraftDelivery({ body: validationBody(activity.preview.operationId), req, actor, auditRepository: activity.auditRepository, notionReader: readerFor(activity.preview, activity.properties), now: now + 2000, validationOperationId: 'validation-activity' });
  assert.equal(activityResult.readinessStatus, 'Ready'); assert.equal(activityResult.expectedSections.includes('teacherScript'), true);
  const revision = await setup(courseBody(), { revision: true });
  const revisionResult = await validateXchangeDraftDelivery({ body: validationBody(revision.preview.operationId), req, actor, auditRepository: revision.auditRepository, notionReader: readerFor(revision.preview, revision.properties), now: now + 2000, validationOperationId: 'validation-revision' });
  assert.equal(revisionResult.readinessStatus, 'Ready'); assert.deepEqual(revisionResult.changedPathMatches, { learningObjectives: true });
  assert.equal(Object.values(revisionResult.preservedPathMatches).every(Boolean), true); assert.equal(revisionResult.revisionStatus, 'passed');
});

test('Revision changed and preserved paths fail when either revised or preserved Notion content drifts', async () => {
  const revision = await setup(courseBody(), { revision: true });
  const changedBlocks = structuredClone(buildXchangeNotionBlocks('course', revision.preview.contentPreview));
  const objectives = changedBlocks.findIndex((block) => block.type === 'heading_2' && block.heading_2.rich_text[0].text.content === 'Learning objectives');
  changedBlocks[objectives + 1].bulleted_list_item.rich_text[0].text.content = 'Original stale objective';
  const changed = await validateXchangeDraftDelivery({ body: validationBody(revision.preview.operationId), req, actor, auditRepository: revision.auditRepository, notionReader: async () => ({ page: actualPage(revision.properties), blocks: changedBlocks, notionReadsPerformed: 2 }), validationOperationId: 'validation-revision-changed-drift' });
  assert.equal(changed.readinessStatus, 'Not ready'); assert.equal(changed.changedPathMatches.learningObjectives, false); assert.equal(changed.revisionStatus, 'failed');

  const preservedBlocks = structuredClone(buildXchangeNotionBlocks('course', revision.preview.contentPreview));
  const plan = preservedBlocks.findIndex((block) => block.type === 'heading_2' && block.heading_2.rich_text[0].text.content === 'Session plan');
  preservedBlocks[plan + 1].heading_2.rich_text[0].text.content = preservedBlocks[plan + 1].heading_2.rich_text[0].text.content.replace(/\d+ min/u, '1 min');
  const preserved = await validateXchangeDraftDelivery({ body: validationBody(revision.preview.operationId), req, actor, auditRepository: revision.auditRepository, notionReader: async () => ({ page: actualPage(revision.properties), blocks: preservedBlocks, notionReadsPerformed: 2 }), validationOperationId: 'validation-revision-preserved-drift' });
  assert.equal(preserved.readinessStatus, 'Not ready'); assert.equal(preserved.preservedPathMatches.sessionPlan, false); assert.equal(preserved.revisionStatus, 'failed');
});

test('client page IDs, non-succeeded operations, other agents, tools, and incomplete snapshots fail before Notion reads', async () => {
  const current = await setup(); let reads = 0;
  const reader = async () => { reads += 1; };
  await assert.rejects(() => validateXchangeDraftDelivery({ body: { ...validationBody(current.preview.operationId), pageId: 'client-page' }, req, actor, auditRepository: current.auditRepository, notionReader: reader }), { code: 'MASS_ASSIGNMENT_REJECTED' });
  const previewOnly = createMemoryAuditRepository([{ operationId: 'preview-only', agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', executionStatus: 'previewed' }]);
  await assert.rejects(() => validateXchangeDraftDelivery({ body: validationBody('preview-only'), req, actor, auditRepository: previewOnly, notionReader: reader, validationOperationId: 'validation-preview-only' }), { code: 'EXECUTION_NOT_SUCCEEDED' });
  const otherAgent = createMemoryAuditRepository([{ operationId: 'other-agent', agentId: 'orchestrator', toolId: 'createActionDraft', actionType: 'create', executionStatus: 'succeeded', externalRecordId: 'rec-action', sanitizedOutput: { notionPageCreated: true, writesPerformed: 1 } }]);
  await assert.rejects(() => validateXchangeDraftDelivery({ body: validationBody('other-agent'), req, actor, auditRepository: otherAgent, notionReader: reader, validationOperationId: 'validation-other-agent' }), { code: 'AGENT_NOT_ALLOWED' });
  const badTool = createMemoryAuditRepository([{ operationId: 'bad-tool', agentId: 'xchange', toolId: 'deleteCourse', actionType: 'create', executionStatus: 'succeeded', externalRecordId: 'page', sanitizedOutput: { notionPageCreated: true, writesPerformed: 1 } }]);
  await assert.rejects(() => validateXchangeDraftDelivery({ body: validationBody('bad-tool'), req, actor, auditRepository: badTool, notionReader: reader, validationOperationId: 'validation-bad-tool' }), { code: 'TOOL_NOT_ALLOWED' });
  const incomplete = createMemoryAuditRepository([{ operationId: 'incomplete', agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', executionStatus: 'succeeded', externalRecordId: 'page', sanitizedOutput: { notionPageCreated: true, writesPerformed: 1 } }]);
  await assert.rejects(() => validateXchangeDraftDelivery({ body: validationBody('incomplete'), req, actor, auditRepository: incomplete, notionReader: reader, validationOperationId: 'validation-incomplete' }), { code: 'VALIDATION_SNAPSHOT_INCOMPLETE' });
  assert.equal(reads, 0);
  assert.deepEqual((await incomplete.getAuditLifecycleByOperationId('validation-incomplete')).map((event) => event.sanitizedOutput.validationEvent), ['validation_started', 'validation_failed']);
});

test('property, safety, section, content, duration, and partial-write differences are Not ready', async () => {
  const cases = [
    ['title', ({ properties }) => { properties['標題'].title[0].text.content = 'Changed title'; }, 'propertiesStatus'],
    ['status', ({ properties }) => { properties['狀態'].status.name = '進行中'; }, 'safetyStatus'],
    ['visibility', ({ properties }) => { properties['公開狀態'].select.name = 'Published'; }, 'safetyStatus'],
    ['archived', ({ page }) => { page.archived = true; }, 'safetyStatus'],
    ['trash', ({ page }) => { page.in_trash = true; }, 'safetyStatus'],
    ['content', ({ blocks }) => { const heading = blocks.findIndex((block) => block.type === 'heading_2' && block.heading_2.rich_text[0].text.content === 'Learning objectives'); blocks[heading + 1].bulleted_list_item.rich_text[0].text.content = 'Unexpected objective'; }, 'contentStatus'],
    ['missing-section', ({ blocks }) => { const index = blocks.findIndex((block) => block.type === 'heading_2' && block.heading_2.rich_text[0].text.content === 'Learning objectives'); blocks.splice(index, 1); }, 'contentStatus'],
    ['duration', ({ blocks }) => { const block = blocks.find((item) => item.type === 'heading_2' && /· 20 min/u.test(item.heading_2.rich_text[0].text.content)); block.heading_2.rich_text[0].text.content = block.heading_2.rich_text[0].text.content.replace('20 min', '21 min'); }, 'durationStatus'],
  ];
  for (const [name, mutate, failedStatus] of cases) {
    const current = await setup(); const properties = structuredClone(current.properties); const page = actualPage(properties); const blocks = structuredClone(buildXchangeNotionBlocks('course', current.preview.contentPreview));
    mutate({ properties, page, blocks }); page.properties = properties;
    const result = await validateXchangeDraftDelivery({ body: validationBody(current.preview.operationId), req, actor, auditRepository: current.auditRepository, notionReader: async () => ({ page, blocks, notionReadsPerformed: 2 }), now: now + 2000, validationOperationId: `validation-${name}` });
    assert.equal(result.readinessStatus, 'Not ready', name); assert.equal(result[failedStatus], 'failed', name); assert.equal(result.writesPerformed, 0);
  }
  const partial = await setup();
  const success = (await partial.auditRepository.getAuditLifecycleByOperationId(partial.preview.operationId)).findLast((event) => event.executionStatus === 'succeeded');
  const partialSnapshot = unpackXchangeValidationSnapshot(success.sanitizedOutput.validationSnapshot);
  success.sanitizedOutput.validationSnapshot = packXchangeValidationSnapshot({ ...partialSnapshot, partialExternalWrite: true });
  const result = await validateXchangeDraftDelivery({ body: validationBody(partial.preview.operationId), req, actor, auditRepository: partial.auditRepository, notionReader: readerFor(partial.preview, partial.properties), validationOperationId: 'validation-partial' });
  assert.equal(result.readinessStatus, 'Not ready'); assert.equal(result.safetyStatus, 'failed');
});

test('non-substantive last-edited metadata produces Ready with warnings', async () => {
  const current = await setup();
  const result = await validateXchangeDraftDelivery({ body: validationBody(current.preview.operationId), req, actor, auditRepository: current.auditRepository, notionReader: readerFor(current.preview, current.properties, { page: { last_edited_time: '2027-02-01T08:05:00.000Z' } }), now: now + 2000, validationOperationId: 'validation-warning' });
  assert.equal(result.readinessStatus, 'Ready with warnings'); assert.deepEqual(result.warnings, ['PAGE_EDITED_AFTER_CREATION']);
});

test('explainable Notion block hierarchy normalization produces Ready with warnings', async () => {
  const current = await setup();
  const blocks = structuredClone(buildXchangeNotionBlocks('course', current.preview.contentPreview));
  const heading = blocks.findIndex((block) => block.type === 'heading_2' && block.heading_2.rich_text[0].text.content === 'Learning objectives');
  const nested = blocks.splice(heading + 2, 1)[0];
  blocks[heading + 1] = { ...blocks[heading + 1], children: [nested] };
  const result = await validateXchangeDraftDelivery({ body: validationBody(current.preview.operationId), req, actor, auditRepository: current.auditRepository, notionReader: async () => ({ page: actualPage(current.properties), blocks, notionReadsPerformed: 3 }), validationOperationId: 'validation-block-warning' });
  assert.equal(result.readinessStatus, 'Ready with warnings'); assert.equal(result.contentStatus, 'warning');
  assert.deepEqual(result.warnings, ['NOTION_BLOCK_NORMALIZATION']); assert.notEqual(result.actualTopLevelBlocks, result.expectedTopLevelBlocks); assert.equal(result.actualTotalBlocks, result.expectedTotalBlocks);
});

test('read helper paginates all blocks, recursively reads nested children, enforces the parent, and has no write surface', async () => {
  const reads = []; const writes = { create: 0, update: 0, append: 0, delete: 0, publish: 0 };
  const notionClient = {
    pages: {
      retrieve: async (input) => { reads.push(['page', input]); return { id: 'page-read', parent: { data_source_id: 'data-source-learning-coaching' }, properties: {}, archived: false, in_trash: false }; },
      create: async () => { writes.create += 1; }, update: async () => { writes.update += 1; }, publish: async () => { writes.publish += 1; },
    },
    blocks: {
      children: {
        list: async ({ block_id: blockId, start_cursor: cursor }) => {
          reads.push(['blocks', blockId, cursor]);
          if (blockId === 'nested') return { results: [{ id: 'child', type: 'paragraph', paragraph: { rich_text: notionText('Nested') }, has_children: false }], has_more: false, next_cursor: null };
          if (!cursor) return { results: [{ id: 'nested', type: 'bulleted_list_item', bulleted_list_item: { rich_text: notionText('Parent') }, has_children: true }], has_more: true, next_cursor: 'cursor-2' };
          return { results: [{ id: 'last', type: 'divider', divider: {}, has_children: false }], has_more: false, next_cursor: null };
        },
        append: async () => { writes.append += 1; },
      },
      update: async () => { writes.update += 1; }, delete: async () => { writes.delete += 1; },
    },
  };
  const result = await readXchangeNotionDraft({ pageId: 'page-read', expectedParentDataSourceId: 'data-source-learning-coaching', env, notionClient });
  assert.equal(result.blocks.length, 2); assert.equal(result.blocks[0].children[0].id, 'child'); assert.equal(result.notionReadsPerformed, 4);
  assert.deepEqual(writes, { create: 0, update: 0, append: 0, delete: 0, publish: 0 });
  assert.equal(canonicalizeXchangeBlocks(result.blocks)[0].children[0].text, 'Nested');
  await assert.rejects(() => readXchangeNotionDraft({ pageId: 'page-read', expectedParentDataSourceId: 'different-source', env, notionClient }), { code: 'VALIDATION_TARGET_NOT_FOUND' });
  await assert.rejects(() => readXchangeNotionDraft({ pageId: 'page-read', expectedParentDataSourceId: 'data-source-learning-coaching', env, notionClient, maxBlocks: 2 }), { code: 'VALIDATION_LIMIT_EXCEEDED' });
});

test('read failures and Audit persistence failures fail closed; repeated validation remains read-only', async () => {
  const current = await setup();
  await assert.rejects(() => validateXchangeDraftDelivery({ body: validationBody(current.preview.operationId), req, actor, auditRepository: current.auditRepository, notionReader: async () => { throw Object.assign(new Error('private detail'), { code: 'NOTION_VALIDATION_READ_FAILED', notionReadsPerformed: 1 }); }, validationOperationId: 'validation-read-failed' }), { code: 'NOTION_VALIDATION_READ_FAILED' });
  assert.equal((await current.auditRepository.getAuditLifecycleByOperationId('validation-read-failed')).at(-1).sanitizedOutput.validationEvent, 'validation_failed');
  const closed = await setup(); let reads = 0;
  closed.auditRepository.updateAuditExecutionResult = async () => { throw new Error('audit down'); };
  await assert.rejects(() => validateXchangeDraftDelivery({ body: validationBody(closed.preview.operationId), req, actor, auditRepository: closed.auditRepository, notionReader: async () => { reads += 1; } }), { code: 'AUDIT_PERSISTENCE_FAILED' });
  assert.equal(reads, 0);
  let repeatedReads = 0;
  const repeatReader = async () => { repeatedReads += 1; return readerFor(current.preview, current.properties)({ pageId: `page-${current.preview.operationId}`, expectedParentDataSourceId: 'data-source-learning-coaching' }); };
  const first = await validateXchangeDraftDelivery({ body: validationBody(current.preview.operationId), req, actor, auditRepository: current.auditRepository, notionReader: repeatReader, validationOperationId: 'validation-repeat-1' });
  const second = await validateXchangeDraftDelivery({ body: validationBody(current.preview.operationId), req, actor, auditRepository: current.auditRepository, notionReader: repeatReader, validationOperationId: 'validation-repeat-2' });
  assert.equal(first.readinessStatus, 'Ready'); assert.equal(second.readinessStatus, 'Ready'); assert.equal(repeatedReads, 2);
  assert.equal(first.writesPerformed + second.writesPerformed, 0);
});
