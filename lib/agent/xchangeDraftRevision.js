import { Buffer } from 'node:buffer';
import {
  createStructuredContent,
  extractStructuredRequirements,
  validateStructuredContent,
  XCHANGE_CONTENT_SCHEMA_VERSION,
} from './xchangeStructuredContent.js';

export const XCHANGE_REVISION_CONTRACT_VERSION = 'v1';

export const XCHANGE_EDIT_MODES = Object.freeze([
  'edit_field',
  'edit_section',
  'regenerate_section',
  'regenerate_all',
]);

export const COURSE_REVISION_FIELDS = Object.freeze([
  'title', 'targetAudience', 'durationMinutes', 'difficulty', 'format', 'language', 'teachingCategory', 'tags',
]);

export const ACTIVITY_REVISION_FIELDS = Object.freeze([
  'activityTitle', 'targetAudience', 'estimatedTimeMinutes', 'difficulty', 'language', 'tags',
]);

export const COURSE_REVISION_SECTIONS = Object.freeze([
  'overview', 'learningObjectives', 'learningOutcomes', 'sessionPlan', 'coreContent', 'activities',
  'discussionQuestions', 'assessment', 'resources', 'risksAndNotes', 'extension',
]);

export const ACTIVITY_REVISION_SECTIONS = Object.freeze([
  'overview', 'learningOutcomes', 'materials', 'preparation', 'steps', 'teacherScript',
  'discussionQuestions', 'expectedOutput', 'assessmentCriteria', 'differentiation', 'closing',
]);

const REQUEST_FIELDS = new Set([
  'sourceOperationId', 'sourcePreviewHash', 'editMode', 'targetPath', 'instruction', 'replacementValue',
  'preserveOtherSections', 'contractVersion', 'contentSchemaVersion',
]);
const FORBIDDEN_PATTERN = /^(?:published|visibility|draftStatus|status|publicStatus|databaseId|dataSourceId|notionPageId|createdViaAgent|auditId|executionStatus)$/iu;

function fail(code, rejectedFields) {
  throw Object.assign(new Error(code), { code, ...(rejectedFields?.length ? { rejectedFields } : {}) });
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function cleanText(value, limit) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') fail('INVALID_INPUT');
  return value.replace(/\s+/gu, ' ').trim().slice(0, limit);
}

function hasForbiddenKey(value, found = []) {
  if (Array.isArray(value)) value.forEach((item) => hasForbiddenKey(item, found));
  else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (FORBIDDEN_PATTERN.test(key)) found.push(key);
      hasForbiddenKey(item, found);
    });
  }
  return found;
}

export function validateXchangeRevisionRequest(body, draftType) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('INVALID_INPUT');
  const unknown = Object.keys(body).filter((field) => !REQUEST_FIELDS.has(field));
  if (unknown.length) fail('MASS_ASSIGNMENT_REJECTED', unknown);
  const sourceOperationId = cleanText(body.sourceOperationId, 80);
  const sourcePreviewHash = cleanText(body.sourcePreviewHash, 80);
  const editMode = cleanText(body.editMode, 40);
  const targetPath = cleanText(body.targetPath, 100);
  const instruction = cleanText(body.instruction, 1200);
  if (!sourceOperationId || !sourcePreviewHash) fail('PREVIEW_NOT_FOUND');
  if (!XCHANGE_EDIT_MODES.includes(editMode)) fail('INVALID_EDIT_MODE');
  if (body.contractVersion !== XCHANGE_REVISION_CONTRACT_VERSION || body.contentSchemaVersion !== XCHANGE_CONTENT_SCHEMA_VERSION) fail('SCHEMA_VERSION_INVALID');
  if (body.preserveOtherSections !== true) fail('PRESERVE_SECTIONS_REQUIRED');
  const fields = draftType === 'course' ? COURSE_REVISION_FIELDS : ACTIVITY_REVISION_FIELDS;
  const sections = draftType === 'course' ? COURSE_REVISION_SECTIONS : ACTIVITY_REVISION_SECTIONS;
  if (editMode === 'edit_field' && !fields.includes(targetPath)) fail(FORBIDDEN_PATTERN.test(targetPath) ? 'MASS_ASSIGNMENT_REJECTED' : 'EDIT_TARGET_NOT_ALLOWED', [targetPath]);
  if (['edit_section', 'regenerate_section'].includes(editMode) && !sections.includes(targetPath)) fail(FORBIDDEN_PATTERN.test(targetPath) ? 'MASS_ASSIGNMENT_REJECTED' : 'EDIT_TARGET_NOT_ALLOWED', [targetPath]);
  if (editMode === 'regenerate_all' && targetPath) fail('EDIT_TARGET_NOT_ALLOWED', [targetPath]);
  if (editMode === 'edit_section' && body.replacementValue === undefined && !instruction) fail('REPLACEMENT_REQUIRED');
  if (editMode === 'edit_field' && body.replacementValue === undefined) fail('REPLACEMENT_REQUIRED');
  if (body.replacementValue !== undefined) {
    const serialized = JSON.stringify(body.replacementValue);
    if (!serialized || Buffer.byteLength(serialized, 'utf8') > 30_000) fail('PAYLOAD_TOO_LARGE');
    const forbidden = [...new Set(hasForbiddenKey(body.replacementValue))];
    if (forbidden.length) fail('MASS_ASSIGNMENT_REJECTED', forbidden);
  }
  return Object.freeze({ sourceOperationId, sourcePreviewHash, editMode, targetPath, instruction, replacementValue: clone(body.replacementValue), preserveOtherSections: true, contractVersion: body.contractVersion, contentSchemaVersion: body.contentSchemaVersion });
}

function systemFreePayload(payload) {
  const safe = { ...payload };
  delete safe.draftStatus;
  delete safe.visibility;
  delete safe.published;
  delete safe.createdViaAgent;
  return safe;
}

function requirementsFor(draftType, payload, previous) {
  const promptKey = draftType === 'course' ? 'summary' : 'instructions';
  const extracted = extractStructuredRequirements(draftType, { ...systemFreePayload(payload), [promptKey]: '' });
  return Object.freeze({ ...extracted, requiredElements: previous?.requiredElements || [] });
}

function overviewPatch(draftType, field, value) {
  const course = draftType === 'course';
  const mapping = course ? {
    title: { courseTitle: value, topic: value }, targetAudience: { targetAudience: value }, durationMinutes: { durationMinutes: value },
    difficulty: { difficulty: value }, format: { format: value }, language: { language: Array.isArray(value) ? value[0] : value },
  } : {
    activityTitle: { activityTitle: value }, targetAudience: { targetAudience: value }, estimatedTimeMinutes: { estimatedTimeMinutes: value },
    difficulty: { difficulty: value }, language: { language: Array.isArray(value) ? value[0] : value },
  };
  return mapping[field] || {};
}

function naturalDurations(total, current) {
  const count = current.length;
  const naturalFive = total >= count * 5 && total % 5 === 0;
  const unit = naturalFive ? 5 : 1;
  const units = Math.floor(total / unit);
  const weights = current.map((value) => Math.max(1, Number(value) || 1));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const result = weights.map((weight) => Math.max(1, Math.round((units * weight) / weightTotal)));
  let delta = units - result.reduce((sum, value) => sum + value, 0);
  let cursor = result.length - 1;
  while (delta !== 0) {
    const change = delta > 0 ? 1 : -1;
    if (change > 0 || result[cursor] > 1) { result[cursor] += change; delta -= change; }
    cursor = cursor === 0 ? result.length - 1 : cursor - 1;
  }
  return result.map((value) => value * unit);
}

function redistributeFlow(draftType, content, total) {
  const key = draftType === 'course' ? 'sessionPlan' : 'steps';
  const flow = content[key];
  if (!Array.isArray(flow) || !flow.length) return;
  const durations = naturalDurations(Number(total), flow.map((item) => item.durationMinutes));
  content[key] = flow.map((item, index) => ({ ...item, durationMinutes: durations[index] }));
}

function changed(before, after) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function appendRegenerationMarker(value, language) {
  const suffix = language === 'zh' ? '（已依最新條件重新設計）' : language === 'ko' ? ' (최신 조건에 맞춰 재설계됨)' : ' (redesigned for the latest constraints)';
  if (typeof value === 'string') return `${value}${suffix}`;
  if (Array.isArray(value)) return value.map((item, index) => (index === 0 ? appendRegenerationMarker(item, language) : item));
  if (value && typeof value === 'object') {
    const result = { ...value };
    const key = Object.keys(result).find((name) => typeof result[name] === 'string' || Array.isArray(result[name]) || (result[name] && typeof result[name] === 'object'));
    if (key) result[key] = appendRegenerationMarker(result[key], language);
    return result;
  }
  return value;
}

function requestedItemCount(instruction) {
  const match = String(instruction || '').match(/(?:改成|調整為|use|make|to|as)\s*([3-6三四五六])\s*(?:項|個|條|objectives?|items?)/iu);
  const counts = { 三: 3, 四: 4, 五: 5, 六: 6 };
  return match ? Number(counts[match[1]] || match[1]) : null;
}

function instructionGeneratedSection({ draftType, targetPath, instruction, normalizedPayload, requirements }) {
  const generated = clone(createStructuredContent(draftType, normalizedPayload, { requirements }).content[targetPath]);
  if (draftType !== 'course' || targetPath !== 'learningObjectives' || !Array.isArray(generated)) return generated;
  const language = Array.isArray(normalizedPayload.language) ? normalizedPayload.language[0] : normalizedPayload.language;
  const count = requestedItemCount(instruction) || generated.length;
  const topic = normalizedPayload.title || generated[0] || 'the course topic';
  const brandRequested = /品牌一致性|brand consistency|브랜드 일관성/iu.test(instruction);
  const brandObjective = language === 'zh'
    ? `評估「${topic}」成果的品牌一致性並提出具體修訂建議`
    : language === 'ko'
      ? `‘${topic}’ 결과물의 브랜드 일관성을 평가하고 구체적인 수정안을 제안한다`
      : `Evaluate the brand consistency of a ${topic} product and propose specific revisions`;
  const additional = language === 'zh'
    ? `分析「${topic}」成果並依明確準則提出改善方案`
    : language === 'ko'
      ? `‘${topic}’ 결과물을 분석하고 명확한 기준에 따라 개선안을 제안한다`
      : `Analyze a ${topic} product and propose improvements using explicit criteria`;
  const objectives = generated.slice(0, count);
  while (objectives.length < count) objectives.push(additional);
  if (brandRequested && !objectives.some((item) => /品牌一致性|brand consistency|브랜드 일관성/iu.test(item))) objectives[objectives.length - 1] = brandObjective;
  return objectives;
}

function sourcePrompt(draftType, payload) {
  return String(draftType === 'course' ? payload.summary || payload.subTopic || '' : payload.instructions || '');
}

export function reviseXchangeDraft({ sourcePreview, edit, normalizePayload }) {
  const draftType = sourcePreview.draftType;
  const sectionNames = draftType === 'course' ? COURSE_REVISION_SECTIONS : ACTIVITY_REVISION_SECTIONS;
  const metadataNames = draftType === 'course' ? COURSE_REVISION_FIELDS : ACTIVITY_REVISION_FIELDS;
  let normalizedPayload = clone(sourcePreview.normalizedPayload);
  let content = clone(sourcePreview.contentPreview);
  let requirements = sourcePreview.extractedRequirements;
  const regeneratedPaths = [];
  const autoAdjustedPaths = [];

  if (edit.editMode === 'edit_field') {
    const userPayload = { ...systemFreePayload(normalizedPayload), [edit.targetPath]: edit.replacementValue };
    const safePayload = normalizePayload(draftType, userPayload);
    normalizedPayload = { ...safePayload, draftStatus: 'Draft', visibility: 'Private', published: false, createdViaAgent: 'xchange' };
    requirements = requirementsFor(draftType, normalizedPayload, sourcePreview.extractedRequirements);
    const languageChanged = edit.targetPath === 'language';
    if (languageChanged) {
      content = createStructuredContent(draftType, normalizedPayload, { requirements }).content;
      regeneratedPaths.push(...sectionNames);
    } else {
      content.overview = { ...content.overview, ...overviewPatch(draftType, edit.targetPath, normalizedPayload[edit.targetPath]) };
      if (Object.keys(overviewPatch(draftType, edit.targetPath, normalizedPayload[edit.targetPath])).length) autoAdjustedPaths.push('overview');
      if (['durationMinutes', 'estimatedTimeMinutes'].includes(edit.targetPath)) {
        redistributeFlow(draftType, content, normalizedPayload[edit.targetPath]);
        autoAdjustedPaths.push(draftType === 'course' ? 'sessionPlan' : 'steps');
      }
    }
  } else if (edit.editMode === 'edit_section') {
    content[edit.targetPath] = edit.replacementValue === undefined
      ? instructionGeneratedSection({ draftType, targetPath: edit.targetPath, instruction: edit.instruction, normalizedPayload, requirements })
      : clone(edit.replacementValue);
    if (['sessionPlan', 'steps'].includes(edit.targetPath)) {
      const total = draftType === 'course' ? normalizedPayload.durationMinutes : normalizedPayload.estimatedTimeMinutes;
      redistributeFlow(draftType, content, total);
    }
  } else if (edit.editMode === 'regenerate_section') {
    const generated = createStructuredContent(draftType, normalizedPayload, { requirements }).content;
    content[edit.targetPath] = generated[edit.targetPath];
    if (edit.instruction && edit.targetPath !== 'overview') {
      const language = Array.isArray(normalizedPayload.language) ? normalizedPayload.language[0] : normalizedPayload.language;
      content[edit.targetPath] = appendRegenerationMarker(content[edit.targetPath], language);
    }
    regeneratedPaths.push(edit.targetPath);
  } else {
    requirements = requirementsFor(draftType, normalizedPayload, sourcePreview.extractedRequirements);
    content = createStructuredContent(draftType, normalizedPayload, { requirements }).content;
    regeneratedPaths.push(...sectionNames);
  }

  const changedPaths = [];
  for (const field of metadataNames) if (changed(sourcePreview.normalizedPayload[field], normalizedPayload[field])) changedPaths.push(`metadata.${field}`);
  for (const section of sectionNames) if (changed(sourcePreview.contentPreview[section], content[section])) changedPaths.push(section);
  for (const section of regeneratedPaths) if (!changedPaths.includes(section)) changedPaths.push(section);
  const preservedPaths = [
    ...metadataNames.map((field) => `metadata.${field}`),
    ...sectionNames,
  ].filter((path) => !changedPaths.includes(path));
  const quality = validateStructuredContent(draftType, content, {
    requirements,
    sourcePrompt: sourcePrompt(draftType, normalizedPayload),
    allowedUrls: [normalizedPayload.fileUrl, normalizedPayload.materialsUrl].filter(Boolean),
  });
  const eventType = edit.editMode === 'regenerate_section' ? 'section_regenerated' : edit.editMode === 'regenerate_all' ? 'full_regenerated' : 'preview_edited';
  return {
    normalizedPayload, contentPreview: content, contentQuality: quality, extractedRequirements: requirements,
    changedPaths, preservedPaths, regeneratedPaths: [...new Set(regeneratedPaths)], autoAdjustedPaths: [...new Set(autoAdjustedPaths)], eventType,
  };
}
