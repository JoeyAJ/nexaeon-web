/* global process */

import { createHash, randomUUID } from 'node:crypto';
import { getNotionClient, getNotionTeachingConfig } from '../notion.js';
import { hashActorSession } from './auditRepository.js';
import { buildXchangeNotionBlocks, getXchangeSectionMarkers } from './xchangeStructuredContent.js';
import { unpackXchangeValidationSnapshot, validationDigest } from './xchangeValidationSnapshot.js';

export const XCHANGE_VALIDATION_CONTRACT_VERSION = 'v1';
export const XCHANGE_VALIDATION_SCHEMA_VERSION = 'v1';
export const XCHANGE_VALIDATION_MAX_DEPTH = 5;
export const XCHANGE_VALIDATION_MAX_BLOCKS = 1000;

const TARGET = 'notion-teaching-materials';
const REQUEST_FIELDS = new Set(['executeOperationId', 'agentId', 'actionType', 'contractVersion', 'schemaVersion']);
const TOOLS = new Set(['createCourseDraft', 'createLearningActivityDraft']);
const COURSE_SECTIONS = ['overview', 'learningObjectives', 'learningOutcomes', 'sessionPlan', 'coreContent', 'activities', 'discussionQuestions', 'assessment', 'resources', 'risksAndNotes', 'extension'];
const ACTIVITY_SECTIONS = ['overview', 'learningOutcomes', 'materials', 'preparation', 'steps', 'teacherScript', 'discussionQuestions', 'expectedOutput', 'assessmentCriteria', 'differentiation', 'closing'];
const PROPERTY_NAMES = ['標題', '教學分類', '形式', '子主題', '對象', '可講時間(分)', '難度', '語言', '標籤', '檔案連結', '狀態', '公開狀態'];
const OPTIONAL_PROPERTY_NAMES = new Set(['形式', '對象', '標籤', '檔案連結']);
const PROPERTY_PATHS = Object.freeze({ title: '標題', activityTitle: '標題', teachingCategory: '教學分類', activityType: '教學分類', format: '形式', summary: '子主題', subTopic: '子主題', instructions: '子主題', targetAudience: '對象', durationMinutes: '可講時間(分)', estimatedTimeMinutes: '可講時間(分)', difficulty: '難度', language: '語言', tags: '標籤', fileUrl: '檔案連結', materialsUrl: '檔案連結' });

function fail(code) { throw Object.assign(new Error(code.toLowerCase()), { code, writesPerformed: 0 }); }
function text(value) { return String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim(); }
function actorHash(value) { return `actor_${createHash('sha256').update(String(value || '')).digest('hex').slice(0, 32)}`; }
function operationHash(value) { return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16); }
function isPlainObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function receivedType(value) { return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value; }

function richTextPlain(items) {
  return text((Array.isArray(items) ? items : []).map((item) => item?.plain_text ?? item?.text?.content ?? item?.mention?.plain_text ?? '').join(''));
}

function propertyTypeValue(property) {
  if (!isPlainObject(property)) return null;
  const type = property.type || ['title', 'rich_text', 'select', 'multi_select', 'number', 'url', 'status', 'checkbox'].find((candidate) => Object.prototype.hasOwnProperty.call(property, candidate));
  if (type === 'title' || type === 'rich_text') return richTextPlain(property[type]);
  if (type === 'select' || type === 'status') return text(property[type]?.name);
  if (type === 'multi_select') return (property.multi_select || []).map((item) => text(item?.name)).filter(Boolean).sort();
  if (type === 'number') return property.number === null || property.number === undefined ? null : Number(property.number);
  if (type === 'url') return text(property.url);
  if (type === 'checkbox') return Boolean(property.checkbox);
  return null;
}

export function canonicalizeXchangeProperties(properties = {}) {
  if (!isPlainObject(properties)) return {};
  const canonical = {};
  for (const name of PROPERTY_NAMES) {
    if (!properties[name]) continue;
    const value = propertyTypeValue(properties[name]);
    if (OPTIONAL_PROPERTY_NAMES.has(name) && (value === null || value === '' || (Array.isArray(value) && !value.length))) continue;
    canonical[name] = value;
  }
  const publishedEntry = Object.entries(properties).find(([name, value]) => /^published$/iu.test(name) && (value?.type === 'checkbox' || Object.prototype.hasOwnProperty.call(value || {}, 'checkbox')));
  canonical.published = publishedEntry ? propertyTypeValue(publishedEntry[1]) : canonical['公開狀態'] === 'Published';
  return canonical;
}

function blockText(block, type) {
  const value = block?.[type] || {};
  if (type === 'code') return text((value.rich_text || []).map((item) => item?.plain_text ?? item?.text?.content ?? '').join(''));
  return richTextPlain(value.rich_text || value.caption || []);
}

export function canonicalizeXchangeBlock(block = {}, fieldPath = '$.blocks[]', ancestors = new Set()) {
  if (!isPlainObject(block)) return { type: '', text: '' };
  if (ancestors.has(block)) throw Object.assign(new Error('validation_canonicalization_failed'), { code: 'VALIDATION_CANONICALIZATION_FAILED', receivedType: 'object', fieldPath, writesPerformed: 0 });
  const nextAncestors = new Set(ancestors); nextAncestors.add(block);
  const type = text(block.type);
  const value = block[type] || {};
  const canonical = { type };
  if (/^heading_[123]$/u.test(type)) canonical.headingLevel = Number(type.at(-1));
  if (type === 'bulleted_list_item') canonical.listType = 'bulleted';
  if (type === 'numbered_list_item') canonical.listType = 'numbered';
  if (type === 'to_do') canonical.checked = Boolean(value.checked);
  if (type === 'code') canonical.language = text(value.language || 'plain text');
  if (type !== 'divider') canonical.text = blockText(block, type);
  if (Array.isArray(block.children) && block.children.length) canonical.children = block.children.map((child, index) => canonicalizeXchangeBlock(child, `${fieldPath}.children[${index}]`, nextAncestors));
  return canonical;
}

export function canonicalizeXchangeBlocks(blocks = []) {
  if (!Array.isArray(blocks)) throw Object.assign(new Error('validation_canonicalization_failed'), { code: 'VALIDATION_CANONICALIZATION_FAILED', receivedType: receivedType(blocks), fieldPath: '$.blocks', writesPerformed: 0 });
  return blocks.map((block, index) => canonicalizeXchangeBlock(block, `$.blocks[${index}]`));
}

function countBlocks(blocks) {
  return blocks.reduce((count, block) => count + 1 + countBlocks(block.children || []), 0);
}

function flattenedSemantics(blocks, output = []) {
  for (const block of blocks) {
    output.push({ ...block, children: undefined });
    flattenedSemantics(block.children || [], output);
  }
  return output;
}

function splitSections(blocks, markers) {
  const output = {}; const missing = [];
  const starts = markers.map((marker, index) => {
    if (index === 0) return 0;
    const found = blocks.findIndex((block) => block.type === 'heading_2' && block.text === text(marker.headingText));
    if (found < 0) missing.push(marker.section);
    return found;
  });
  for (let index = 0; index < markers.length; index += 1) {
    const start = starts[index];
    if (start < 0) continue;
    const next = starts.slice(index + 1).find((value) => value >= 0);
    output[markers[index].section] = blocks.slice(start, next === undefined ? blocks.length : next);
  }
  return { sections: output, missing };
}

function compareProperties(expected, actual) {
  const names = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  return names.filter((name) => validationDigest(expected[name]) !== validationDigest(actual[name]));
}

function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('INVALID_INPUT');
  const rejectedFields = Object.keys(body).filter((key) => !REQUEST_FIELDS.has(key));
  if (rejectedFields.length) throw Object.assign(new Error('mass_assignment_rejected'), { code: 'MASS_ASSIGNMENT_REJECTED', rejectedFields, writesPerformed: 0 });
  if (body.agentId !== 'xchange') fail('AGENT_NOT_ALLOWED');
  if (body.actionType !== 'validate') fail('TOOL_NOT_ALLOWED');
  if (body.contractVersion !== XCHANGE_VALIDATION_CONTRACT_VERSION || body.schemaVersion !== XCHANGE_VALIDATION_SCHEMA_VERSION) fail('SCHEMA_VERSION_INVALID');
  const executeOperationId = typeof body.executeOperationId === 'string' ? body.executeOperationId.trim().slice(0, 80) : '';
  if (!executeOperationId) fail('VALIDATION_TARGET_NOT_FOUND');
  return executeOperationId;
}

function resolveTarget(lifecycle) {
  if (!Array.isArray(lifecycle) || !lifecycle.length) fail('VALIDATION_TARGET_NOT_FOUND');
  if (lifecycle.some((record) => record.agentId && record.agentId !== 'xchange')) fail('AGENT_NOT_ALLOWED');
  if (lifecycle.some((record) => record.toolId && !TOOLS.has(record.toolId))) fail('TOOL_NOT_ALLOWED');
  const succeeded = lifecycle.findLast((record) => record.executionStatus === 'succeeded' && record.agentId === 'xchange' && record.actionType === 'create');
  if (!succeeded) fail('EXECUTION_NOT_SUCCEEDED');
  if (!succeeded.externalRecordId || succeeded.sanitizedOutput?.notionPageCreated !== true || Number(succeeded.sanitizedOutput?.writesPerformed) !== 1) fail('VALIDATION_TARGET_NOT_FOUND');
  const snapshot = unpackXchangeValidationSnapshot(succeeded.sanitizedOutput?.validationSnapshot);
  const required = isPlainObject(snapshot) && isPlainObject(snapshot.expectedProperties) && isPlainObject(snapshot.contentPreview)
    && typeof snapshot.contentSchemaVersion === 'string' && typeof snapshot.rendererVersion === 'string'
    && Number.isInteger(snapshot.estimatedBodyBlocks) && isPlainObject(snapshot.durationValidation)
    && Number.isFinite(Number(snapshot.durationValidation.expectedMinutes)) && typeof snapshot.executedPreviewHash === 'string'
    && typeof snapshot.parentDataSourceId === 'string' && ['course', 'learning_activity'].includes(snapshot.draftType)
    && (!Object.hasOwn(snapshot, 'changedPaths') || Array.isArray(snapshot.changedPaths))
    && (!Object.hasOwn(snapshot, 'preservedPaths') || Array.isArray(snapshot.preservedPaths));
  if (!required) fail('VALIDATION_SNAPSHOT_INCOMPLETE');
  return { succeeded, snapshot };
}

export async function readXchangeNotionDraft({ pageId, expectedParentDataSourceId, env = process.env, notionClient, maxDepth = XCHANGE_VALIDATION_MAX_DEPTH, maxBlocks = XCHANGE_VALIDATION_MAX_BLOCKS } = {}) {
  const config = getNotionTeachingConfig();
  const apiKey = String(env.NOTION_API_KEY || config.apiKey || '').trim();
  if (!apiKey) fail('NOTION_CONFIGURATION_MISSING');
  const notion = notionClient || getNotionClient(apiKey);
  let notionReadsPerformed = 0; let totalBlocks = 0;
  try {
    const page = await notion.pages.retrieve({ page_id: pageId }); notionReadsPerformed += 1;
    if (!isPlainObject(page) || typeof page.id !== 'string' || !isPlainObject(page.properties) || !isPlainObject(page.parent)
      || typeof page.archived !== 'boolean' || typeof page.in_trash !== 'boolean') fail('NOTION_INVALID_RESPONSE');
    const parentId = page.parent?.data_source_id || page.parent?.database_id || '';
    if (!expectedParentDataSourceId || parentId !== expectedParentDataSourceId) fail('VALIDATION_TARGET_NOT_FOUND');
    async function children(blockId, depth) {
      if (depth > maxDepth) fail('VALIDATION_LIMIT_EXCEEDED');
      const result = []; let cursor; const seenCursors = new Set();
      do {
        if (cursor) {
          if (seenCursors.has(cursor) || seenCursors.size >= maxBlocks) fail('VALIDATION_LIMIT_EXCEEDED');
          seenCursors.add(cursor);
        }
        const response = await notion.blocks.children.list({ block_id: blockId, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
        notionReadsPerformed += 1;
        if (!response || !Array.isArray(response.results)) fail('NOTION_INVALID_RESPONSE');
        for (const raw of response.results) {
          if (!isPlainObject(raw) || typeof raw.id !== 'string' || typeof raw.type !== 'string' || !isPlainObject(raw[raw.type])) fail('NOTION_INVALID_RESPONSE');
          totalBlocks += 1;
          if (totalBlocks > maxBlocks) fail('VALIDATION_LIMIT_EXCEEDED');
          const block = { ...raw };
          if (raw.has_children) block.children = await children(raw.id, depth + 1);
          result.push(block);
        }
        cursor = response.has_more ? response.next_cursor : null;
        if (response.has_more && !cursor) fail('NOTION_INVALID_RESPONSE');
      } while (cursor);
      return result;
    }
    const blocks = await children(pageId, 1);
    return { page, blocks, notionReadsPerformed };
  } catch (error) {
    if (['VALIDATION_LIMIT_EXCEEDED', 'VALIDATION_TARGET_NOT_FOUND', 'NOTION_INVALID_RESPONSE'].includes(error?.code)) throw error;
    throw Object.assign(new Error('notion_validation_read_failed'), { code: 'NOTION_VALIDATION_READ_FAILED', writesPerformed: 0, notionReadsPerformed });
  }
}

function pathMatches(path, sectionMatches, mismatchedProperties) {
  if (Object.prototype.hasOwnProperty.call(sectionMatches, path)) return sectionMatches[path];
  const property = PROPERTY_PATHS[path.replace(/^metadata\./u, '')];
  return property ? !mismatchedProperties.includes(property) : false;
}

function durationFromSections(draftType, sections) {
  const section = draftType === 'course' ? sections.sessionPlan : sections.steps;
  const detectedSegments = (section || []).filter((block) => block.type === 'heading_2').flatMap((block) => {
    const match = block.text.match(/(?:·|\s)(\d+)\s*min\b/iu);
    return match ? [{ label: block.text, minutes: Number(match[1]) }] : [];
  });
  return { actualMinutes: detectedSegments.reduce((sum, item) => sum + item.minutes, 0), detectedSegments };
}

function validationAudit({ validationOperationId, executeOperationId, target, snapshot, actor, req, now, event, output = {}, errorCode = null }) {
  const address = String(req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const requesterFingerprint = createHash('sha256').update(`${address}|${String(req?.headers?.['user-agent'] || 'unknown').slice(0, 300)}`).digest('hex').slice(0, 32);
  return {
    operationId: validationOperationId, timestamp: new Date(now).toISOString(), actorId: actorHash(actor.actorId), actorRole: actor.role,
    actorSessionHash: hashActorSession(actor.sessionId), agentId: 'xchange', toolId: target?.toolId || '', permissionLevel: 'READ',
    targetDataSource: TARGET, actionType: 'read', executionStatus: event === 'validation_failed' ? 'failed' : event === 'validation_succeeded' ? 'succeeded' : 'executing',
    confirmationStatus: 'not_required', sanitizedInput: { executeOperationId }, sanitizedOutput: {
      validationEvent: event, validationOperationId, executeOperationId,
      validationActionType: 'validate', validationPermissionLevel: 'READ_VALIDATE',
      parentOperationId: snapshot?.parentOperationId || null,
      sourceOperationId: snapshot?.sourceOperationId || null, revisionNumber: snapshot?.revisionNumber || 1,
      changedPaths: snapshot?.changedPaths || [], preservedPaths: snapshot?.preservedPaths || [], previewHash: target?.previewHash || '',
      executedPreviewHash: snapshot?.executedPreviewHash || target?.sanitizedOutput?.executedPreviewHash || '',
      writesPerformed: 0, ...output,
    },
    externalRecordId: target?.externalRecordId || null, errorCode, previewHash: snapshot?.executedPreviewHash || target?.previewHash || '',
    requesterFingerprint, auditPersistenceStatus: 'dedicated', schemaVersion: 'v1', recordType: 'formal', source: 'xchange-draft-validation',
  };
}

function auditPersistenceFailure(error, { stage, validationOperationId, executeOperationId }) {
  const rejectedFieldNames = Array.isArray(error?.rejectedFieldNames) ? error.rejectedFieldNames.slice(0, 20) : [];
  return Object.assign(new Error('audit_persistence_failed'), {
    code: 'AUDIT_PERSISTENCE_FAILED', writesPerformed: 0,
    auditDiagnostic: {
      stage, internalErrorCode: 'AUDIT_PERSISTENCE_FAILED', causeCode: error?.code || 'AUDIT_REQUEST_FAILED',
      airtableErrorType: error?.airtableErrorType || null, httpStatus: Number(error?.status) || null,
      rejectedFieldNames, validationOperationIdHash: operationHash(validationOperationId),
      executeOperationIdHash: operationHash(executeOperationId), writesPerformed: 0,
    },
  });
}

async function persistValidationAudit(repository, event, { stage, started, validationOperationId, executeOperationId }) {
  const method = started ? 'createAuditRecord' : 'updateAuditExecutionResult';
  if (!repository?.[method]) fail('AUDIT_CONFIGURATION_MISSING');
  try {
    if (started) return await repository.createAuditRecord(event);
    return await repository.updateAuditExecutionResult(event.operationId, event);
  } catch (error) {
    throw auditPersistenceFailure(error, { stage, validationOperationId, executeOperationId });
  }
}

function normalizeValidationRuntimeError(error) {
  if (['NOTION_INVALID_RESPONSE', 'VALIDATION_CANONICALIZATION_FAILED'].includes(error?.code)) return error;
  return Object.assign(new Error('validation_canonicalization_failed'), {
    code: 'VALIDATION_CANONICALIZATION_FAILED', nodeErrorCode: typeof error?.code === 'string' && error.code.startsWith('ERR_') ? error.code : null,
    receivedType: error?.receivedType || 'unknown', fieldPath: error?.fieldPath || '$.validation', writesPerformed: 0,
  });
}

function assertValidationReadShape(read) {
  if (!isPlainObject(read) || !isPlainObject(read.page) || typeof read.page.id !== 'string' || !isPlainObject(read.page.properties)
    || !isPlainObject(read.page.parent) || typeof read.page.archived !== 'boolean' || typeof read.page.in_trash !== 'boolean'
    || !Array.isArray(read.blocks)) fail('NOTION_INVALID_RESPONSE');
}

function logValidationRuntimeFailure(logger, { error, validationOperationId, executeOperationId, notionReadsPerformed }) {
  try {
    logger(JSON.stringify({
      service: 'nexaeon-xchange', category: 'validation_runtime_failed', stage: 'canonicalize_and_compare',
      validationOperationIdHash: operationHash(validationOperationId), executeOperationIdHash: operationHash(executeOperationId),
      internalErrorCode: error.code, nodeErrorCode: error.nodeErrorCode || null,
      receivedType: String(error.receivedType || 'unknown').slice(0, 40), fieldPath: String(error.fieldPath || '$.validation').slice(0, 160),
      notionReadsPerformed: Number(notionReadsPerformed) || 0, writesPerformed: 0,
    }));
  } catch { /* diagnostics must never change fail-closed behavior */ }
}

export async function validateXchangeDraftDelivery({ body, req, actor, auditRepository, notionReader = readXchangeNotionDraft, notionClient, env = process.env, now = Date.now(), validationOperationId = randomUUID(), logger = console.error } = {}) {
  if (!actor?.actorId || actor.role !== 'admin' || !actor.sessionId) fail(actor?.actorId ? 'AUTH_ROLE_FORBIDDEN' : 'AUTH_REQUIRED');
  const executeOperationId = validateRequest(body);
  if (!auditRepository?.getAuditLifecycleByOperationId) fail('AUDIT_CONFIGURATION_MISSING');
  let lifecycle;
  try { lifecycle = await auditRepository.getAuditLifecycleByOperationId(executeOperationId); }
  catch (error) { throw auditPersistenceFailure(error, { stage: 'resolve_execute_audit', validationOperationId, executeOperationId }); }
  let target = lifecycle?.at(-1) || null; let snapshot; let resolutionError;
  try {
    ({ succeeded: target, snapshot } = resolveTarget(lifecycle));
  } catch (error) {
    resolutionError = error;
  }
  await persistValidationAudit(auditRepository, validationAudit({ validationOperationId, executeOperationId, target, snapshot, actor, req, now, event: 'validation_started' }), {
    stage: 'validation_started', started: true, validationOperationId, executeOperationId,
  });
  if (resolutionError) {
    await persistValidationAudit(auditRepository, validationAudit({ validationOperationId, executeOperationId, target, snapshot, actor, req, now, event: 'validation_failed', errorCode: resolutionError.code }), {
      stage: 'validation_failed', started: false, validationOperationId, executeOperationId,
    });
    throw resolutionError;
  }

  let read;
  try {
    read = await notionReader({ pageId: target.externalRecordId, expectedParentDataSourceId: snapshot.parentDataSourceId, env, notionClient });
  } catch (error) {
    await persistValidationAudit(auditRepository, validationAudit({ validationOperationId, executeOperationId, target, snapshot, actor, req, now, event: 'validation_failed', output: { notionReadsPerformed: error.notionReadsPerformed || 0 }, errorCode: error.code || 'NOTION_VALIDATION_READ_FAILED' }), {
      stage: 'validation_failed', started: false, validationOperationId, executeOperationId,
    });
    throw error;
  }

  let result; let auditOutput;
  try {
    assertValidationReadShape(read);
    const expectedProperties = canonicalizeXchangeProperties(snapshot.expectedProperties);
  const actualProperties = canonicalizeXchangeProperties(read.page.properties);
  const mismatchedProperties = compareProperties(expectedProperties, actualProperties);
  const expectedRawBlocks = buildXchangeNotionBlocks(snapshot.draftType, snapshot.contentPreview);
  const expectedBlocks = canonicalizeXchangeBlocks(expectedRawBlocks);
  const actualBlocks = canonicalizeXchangeBlocks(read.blocks);
  const markers = getXchangeSectionMarkers(snapshot.draftType, snapshot.contentPreview);
  const expectedSplit = splitSections(expectedBlocks, markers); const actualSplit = splitSections(actualBlocks, markers);
  const requiredSections = snapshot.draftType === 'course' ? COURSE_SECTIONS : ACTIVITY_SECTIONS;
  const missingSections = requiredSections.filter((section) => actualSplit.missing.includes(section) || !actualSplit.sections[section]?.length);
  const sectionMatches = {}; const mismatchedSections = [];
  for (const section of requiredSections) {
    const expectedSection = expectedSplit.sections[section]; const actualSection = actualSplit.sections[section];
    const matches = Boolean(actualSection) && (validationDigest(expectedSection) === validationDigest(actualSection)
      || validationDigest(flattenedSemantics(expectedSection || [])) === validationDigest(flattenedSemantics(actualSection || [])));
    sectionMatches[section] = matches;
    if (!matches && !missingSections.includes(section)) mismatchedSections.push(section);
  }
  const expectedPropertiesHash = validationDigest(expectedProperties); const actualPropertiesHash = validationDigest(actualProperties);
  const expectedContentHash = validationDigest(expectedBlocks); const actualContentHash = validationDigest(actualBlocks);
  const semanticNormalizationOnly = expectedContentHash !== actualContentHash
    && validationDigest(flattenedSemantics(expectedBlocks)) === validationDigest(flattenedSemantics(actualBlocks));
  const expectedTopLevelBlocks = expectedBlocks.length; const actualTopLevelBlocks = actualBlocks.length;
  const expectedTotalBlocks = countBlocks(expectedBlocks); const actualTotalBlocks = countBlocks(actualBlocks);
  const duration = durationFromSections(snapshot.draftType, actualSplit.sections);
  const expectedMinutes = Number(snapshot.durationValidation.expectedMinutes);
  const durationStatus = { expectedMinutes, actualMinutes: duration.actualMinutes, valid: expectedMinutes === duration.actualMinutes, differenceMinutes: duration.actualMinutes - expectedMinutes, detectedSegments: duration.detectedSegments };
  const statusValue = actualProperties['狀態']; const visibilityValue = actualProperties['公開狀態'];
  const published = Object.prototype.hasOwnProperty.call(actualProperties, 'published') ? actualProperties.published : visibilityValue === 'Published';
  const parentId = read.page.parent?.data_source_id || read.page.parent?.database_id || '';
  const safetyChecks = { statusDraft: statusValue === '未開始', visibilityDraft: visibilityValue === 'Draft', published: published === false, archived: read.page.archived === false, inTrash: read.page.in_trash === false, parentMatches: parentId === snapshot.parentDataSourceId, bodyComplete: snapshot.bodyComplete !== false && target.sanitizedOutput?.bodyComplete !== false, partialExternalWrite: snapshot.partialExternalWrite === true || target.sanitizedOutput?.partialExternalWrite === true };
  const safetyPassed = safetyChecks.statusDraft && safetyChecks.visibilityDraft && safetyChecks.published && safetyChecks.archived && safetyChecks.inTrash && safetyChecks.parentMatches && safetyChecks.bodyComplete && !safetyChecks.partialExternalWrite;
  const changedPaths = snapshot.changedPaths || []; const preservedPaths = snapshot.preservedPaths || [];
  const changedPathMatches = Object.fromEntries(changedPaths.map((path) => [path, pathMatches(path, sectionMatches, mismatchedProperties)]));
  const preservedPathMatches = Object.fromEntries(preservedPaths.map((path) => [path, pathMatches(path, sectionMatches, mismatchedProperties)]));
  const revisionMutationEffective = changedPaths.every((path) => !snapshot.changedPathBeforeHashes?.[path]
    || snapshot.changedPathBeforeHashes[path] !== snapshot.changedPathAfterHashes?.[path]);
  const changedPathsPassed = Object.values(changedPathMatches).every(Boolean) && revisionMutationEffective;
  const preservedPathsPassed = Object.values(preservedPathMatches).every(Boolean);
  const revisionPassed = changedPathsPassed && preservedPathsPassed;
  const propertiesPassed = mismatchedProperties.length === 0;
  const contentPassed = expectedContentHash === actualContentHash || semanticNormalizationOnly;
  const warnings = [];
  if (semanticNormalizationOnly) warnings.push('NOTION_BLOCK_NORMALIZATION');
  if (read.page.last_edited_time && read.page.created_time && read.page.last_edited_time > read.page.created_time && contentPassed && propertiesPassed) warnings.push('PAGE_EDITED_AFTER_CREATION');
  const corePassed = propertiesPassed && contentPassed && revisionPassed && durationStatus.valid && safetyPassed && !missingSections.length && !mismatchedSections.length;
  const readinessStatus = corePassed ? (warnings.length ? 'Ready with warnings' : 'Ready') : 'Not ready';
    result = {
    ok: true, validationOperationId, executeOperationId, externalRecordId: target.externalRecordId, readinessStatus,
    propertiesStatus: propertiesPassed ? 'passed' : 'failed', contentStatus: contentPassed && !missingSections.length && !mismatchedSections.length ? (semanticNormalizationOnly ? 'warning' : 'passed') : 'failed',
    revisionStatus: revisionPassed ? 'passed' : 'failed', durationStatus: durationStatus.valid ? 'passed' : 'failed', safetyStatus: safetyPassed ? 'passed' : 'failed',
    expectedTopLevelBlocks, actualTopLevelBlocks, expectedTotalBlocks, actualTotalBlocks,
    expectedBlockCount: expectedTotalBlocks, actualBlockCount: actualTotalBlocks,
    expectedSections: requiredSections, detectedSections: Object.keys(actualSplit.sections), missingSections, unexpectedSections: [], sectionMatches, mismatchedSections,
    mismatchedProperties, changedPathMatches, preservedPathMatches, duration: durationStatus, safetyChecks, warnings,
    expectedPropertiesHash, actualPropertiesHash, expectedContentHash, actualContentHash,
    expectedPreviewHash: snapshot.executedPreviewHash, executedPreviewHash: target.sanitizedOutput?.executedPreviewHash || target.previewHash,
    checkedAt: new Date(now).toISOString(), writesPerformed: 0, notionReadsPerformed: read.notionReadsPerformed,
  };
    auditOutput = {
    expectedPropertiesHash, actualPropertiesHash, expectedContentHash, actualContentHash,
    expectedTopLevelBlocks, actualTopLevelBlocks, expectedTotalBlocks, actualTotalBlocks,
    missingSections, mismatchedProperties, mismatchedSections, readinessStatus, notionReadsPerformed: read.notionReadsPerformed,
    };
  } catch (rawError) {
    const error = normalizeValidationRuntimeError(rawError);
    const notionReadsPerformed = Number(read?.notionReadsPerformed) || 0;
    logValidationRuntimeFailure(logger, { error, validationOperationId, executeOperationId, notionReadsPerformed });
    await persistValidationAudit(auditRepository, validationAudit({ validationOperationId, executeOperationId, target, snapshot, actor, req, now, event: 'validation_failed', output: { notionReadsPerformed }, errorCode: error.code }), {
      stage: 'validation_failed', started: false, validationOperationId, executeOperationId,
    });
    throw error;
  }
  await persistValidationAudit(auditRepository, validationAudit({ validationOperationId, executeOperationId, target, snapshot, actor, req, now, event: 'validation_succeeded', output: auditOutput }), {
    stage: 'validation_succeeded', started: false, validationOperationId, executeOperationId,
  });
  return result;
}
