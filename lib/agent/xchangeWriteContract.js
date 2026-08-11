/* global process */

import { Buffer } from 'node:buffer';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { hashActorSession } from './auditRepository.js';
import { createXchangeNotionDraft } from './xchangeNotionWriter.js';
import {
  applyExtractedRequirements,
  createStructuredContent,
  extractStructuredRequirements,
  validateStructuredContent,
  XCHANGE_CONTENT_RENDERER_VERSION,
  XCHANGE_CONTENT_SCHEMA_VERSION,
} from './xchangeStructuredContent.js';
import { buildXchangeCourseGenerationRequest } from './xchangeCoursePrompt.js';
import { XCHANGE_COURSE_DRAFT_SCHEMA, XCHANGE_COURSE_SCHEMA_NAME } from './xchangeCourseSchema.js';
import { reviseXchangeDraft, validateXchangeRevisionRequest } from './xchangeDraftRevision.js';
import { packXchangeValidationSnapshot } from './xchangeValidationSnapshot.js';
import { buildShadowQualityDiagnostic } from './xchangeQualityDiagnostics.js';
import { createModelGateway } from '../model/modelGateway.js';
import { getModelConfiguration, getXchangeModelMode } from '../model/modelConfig.js';

export const XCHANGE_CONTRACT_VERSION = 'v1';
export const XCHANGE_SCHEMA_VERSION = 'v1';
export const XCHANGE_TARGET_DATA_SOURCE = 'notion-teaching-materials';
export const XCHANGE_PREVIEW_TTL_MS = 5 * 60 * 1000;
export const XCHANGE_MAX_PAYLOAD_BYTES = 12_000;

export const XCHANGE_DRAFT_TYPES = Object.freeze({
  COURSE: 'course',
  LEARNING_ACTIVITY: 'learning_activity',
});

export const XCHANGE_TOOL_IDS = Object.freeze({
  [XCHANGE_DRAFT_TYPES.COURSE]: 'createCourseDraft',
  [XCHANGE_DRAFT_TYPES.LEARNING_ACTIVITY]: 'createLearningActivityDraft',
});

export const COURSE_DRAFT_FIELDS = Object.freeze([
  'title', 'summary', 'teachingCategory', 'format', 'subTopic', 'targetAudience',
  'durationMinutes', 'difficulty', 'language', 'tags', 'fileUrl',
]);

export const LEARNING_ACTIVITY_DRAFT_FIELDS = Object.freeze([
  'activityTitle', 'activityType', 'instructions', 'targetAudience', 'estimatedTimeMinutes',
  'difficulty', 'language', 'tags', 'materialsUrl',
]);

const SUPPORTED_LANGUAGES = new Set(['zh', 'ko', 'en']);
const TOP_LEVEL_FIELDS = new Set(['agentId', 'toolId', 'actionType', 'targetDataSource', 'draftType', 'language', 'payload', 'contractVersion', 'schemaVersion']);
const EXECUTE_FIELDS = new Set(['operationId', 'agentId', 'toolId', 'targetDataSource', 'draftType', 'language', 'payload', 'previewHash', 'idempotencyKey', 'confirmationToken', 'confirm', 'contractVersion', 'schemaVersion']);
const SYSTEM_FIELD_PATTERN = /^(?:id|recordId|tableId|databaseId|auditId|published|visibility|draftStatus|createdViaAgent|createdBy|operationId|idempotencyKey|permissionLevel|confirmationRequired|schemaVersion)$/iu;
const previewStore = new Map();

function fail(code, message = code) {
  throw Object.assign(new Error(message), { code });
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

function actorHash(actorId) { return `actor_${digest(String(actorId || '')).slice(0, 32)}`; }

function tokenSecret(env = process.env) {
  const secret = String(env.NEXAEON_TOOL_EXECUTION_SECRET || env.NEXAEON_ADMIN_SESSION_SECRET || '').trim();
  if (!secret) fail('AUTH_CONFIGURATION_MISSING');
  return secret;
}

function confirmationClaims(preview, actorSessionHash) {
  return {
    operationId: preview.operationId, previewHash: preview.previewHash, idempotencyKey: preview.idempotencyKey,
    toolId: preview.toolId, targetDataSource: preview.targetDataSource, draftType: preview.draftType,
    language: preview.language, payloadHash: digest(preview.normalizedPayload), contentHash: digest(preview.contentPreview),
    propertiesHash: digest(preview.createPayloadPreview), changedPaths: preview.changedPaths || [],
    previewVersion: preview.previewVersion || 1, revisionNumber: preview.revisionNumber || 1,
    parentOperationId: preview.parentOperationId || null,
    contentSchemaVersion: preview.contentSchemaVersion, rendererVersion: preview.rendererVersion,
    estimatedBodyBlocks: preview.estimatedBodyBlocks, durationValidation: preview.durationValidation, actorSessionHash,
    expiresAt: preview.previewExpiresAt, contractVersion: preview.contractVersion, schemaVersion: preview.schemaVersion,
  };
}

function createConfirmationToken(preview, actorSessionHash, env = process.env) {
  const encoded = Buffer.from(JSON.stringify(confirmationClaims(preview, actorSessionHash))).toString('base64url');
  const signature = createHmac('sha256', tokenSecret(env)).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function readConfirmationToken(token, env = process.env) {
  const [encoded, signature, extra] = String(token || '').split('.');
  if (!encoded || !signature || extra) fail('CONFIRMATION_INVALID');
  const expected = createHmac('sha256', tokenSecret(env)).update(encoded).digest('base64url');
  if (!safeEqual(signature, expected)) fail('CONFIRMATION_INVALID');
  try { return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { fail('CONFIRMATION_INVALID'); }
}

function cleanText(value, maxLength = 2000) {
  if (typeof value !== 'string') fail('INVALID_INPUT');
  return value.replace(/\s+/gu, ' ').trim().slice(0, maxLength);
}

function safeDiagnosticText(value, maxLength = 1200) {
  return String(value || '')
    .replace(/(?:sk-[a-z0-9_-]{8,}|(?:api[_ -]?key|authorization|cookie|password|secret|token)\s*[:=]\s*[^\s,;]+)/giu, '[redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maxLength) || null;
}

function cleanArray(value, maxItems = 20) {
  if (!Array.isArray(value)) fail('INVALID_INPUT');
  const items = value.map((item) => cleanText(item, 180)).filter(Boolean);
  return [...new Set(items)].slice(0, maxItems);
}

function cleanUrl(value) {
  const text = cleanText(value, 1200);
  if (!text) return '';
  let url;
  try { url = new URL(text); } catch { fail('INVALID_INPUT'); }
  if (!['http:', 'https:'].includes(url.protocol)) fail('INVALID_INPUT');
  return url.href;
}

function normalizeField(field, value) {
  if (['format', 'targetAudience', 'language', 'tags'].includes(field)) return cleanArray(value);
  if (['durationMinutes', 'estimatedTimeMinutes'].includes(field)) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1 || number > 10_080) fail('INVALID_INPUT');
    return number;
  }
  if (['fileUrl', 'materialsUrl'].includes(field)) return cleanUrl(value);
  const limits = { title: 320, activityTitle: 320, summary: 2000, subTopic: 1000, instructions: 4000 };
  return cleanText(value, limits[field] || 500);
}

function normalizePayload(draftType, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('INVALID_INPUT');
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > XCHANGE_MAX_PAYLOAD_BYTES) fail('PAYLOAD_TOO_LARGE');
  const allowlist = draftType === XCHANGE_DRAFT_TYPES.COURSE ? COURSE_DRAFT_FIELDS : LEARNING_ACTIVITY_DRAFT_FIELDS;
  const allowed = new Set(allowlist);
  const rejectedFields = Object.keys(payload).filter((field) => !allowed.has(field));
  if (rejectedFields.length) {
    const error = Object.assign(new Error('mass_assignment_rejected'), { code: 'MASS_ASSIGNMENT_REJECTED', rejectedFields });
    if (rejectedFields.some((field) => SYSTEM_FIELD_PATTERN.test(field))) error.systemFieldOverride = true;
    throw error;
  }
  const normalized = {};
  for (const field of allowlist) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;
    const value = normalizeField(field, payload[field]);
    if (value !== '' && (!Array.isArray(value) || value.length)) normalized[field] = value;
  }
  const required = draftType === XCHANGE_DRAFT_TYPES.COURSE ? 'title' : 'activityTitle';
  if (!normalized[required]) fail('REQUIRED_FIELD_MISSING');
  return normalized;
}

function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('INVALID_INPUT');
  const unknown = Object.keys(body).filter((field) => !TOP_LEVEL_FIELDS.has(field));
  if (unknown.length) throw Object.assign(new Error('mass_assignment_rejected'), { code: 'MASS_ASSIGNMENT_REJECTED', rejectedFields: unknown });
  if (body.agentId !== 'xchange') fail('AGENT_NOT_ALLOWED');
  if (!Object.values(XCHANGE_DRAFT_TYPES).includes(body.draftType)) fail('INVALID_DRAFT_TYPE');
  if (body.toolId !== XCHANGE_TOOL_IDS[body.draftType]) fail('TOOL_NOT_ALLOWED');
  if (body.actionType !== undefined && body.actionType !== 'create') fail(body.actionType === 'update' ? 'UPDATE_NOT_ALLOWED' : body.actionType === 'delete' ? 'DELETE_NOT_ALLOWED' : 'TOOL_NOT_ALLOWED');
  if (body.targetDataSource !== XCHANGE_TARGET_DATA_SOURCE) fail('TARGET_DATA_SOURCE_NOT_ALLOWED');
  if (!SUPPORTED_LANGUAGES.has(body.language)) fail('UNSUPPORTED_LANGUAGE');
  if (body.contractVersion !== XCHANGE_CONTRACT_VERSION || body.schemaVersion !== XCHANGE_SCHEMA_VERSION) fail('SCHEMA_VERSION_INVALID');
  return normalizePayload(body.draftType, body.payload);
}

function toNotionPreview(draftType, payload) {
  const course = draftType === XCHANGE_DRAFT_TYPES.COURSE;
  return {
    '標題': course ? payload.title : payload.activityTitle,
    '教學分類': course ? payload.teachingCategory : 'Learning Activity',
    '形式': course ? payload.format : payload.activityType ? [payload.activityType] : ['Learning Activity'],
    '子主題': course ? (payload.subTopic || payload.summary) : payload.instructions,
    '對象': payload.targetAudience,
    '可講時間(分)': course ? payload.durationMinutes : payload.estimatedTimeMinutes,
    '難度': payload.difficulty,
    '語言': payload.language,
    '標籤': payload.tags,
    '檔案連結': course ? payload.fileUrl : payload.materialsUrl,
    '狀態': '未開始',
    '公開狀態': 'Draft',
  };
}

function withoutUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ''));
}

function publicPreview(preview) {
  const safe = { ...preview };
  delete safe.actorSessionHash;
  return safe;
}

function compactAuditValue(value) {
  if (value === undefined) return null;
  const serialized = JSON.stringify(value);
  return serialized?.length <= 1500 ? value : `[omitted from Audit: ${serialized.length} chars]`;
}

function auditChangeSummary(summary) {
  if (!summary) return null;
  return { ...summary, before: compactAuditValue(summary.before), after: compactAuditValue(summary.after) };
}

function boundedAuditList(value, limit = 20) {
  return Array.isArray(value) ? value.slice(0, limit).map((item) => cleanText(String(item), 240)) : [];
}

export function projectXchangeAuditInput(preview) {
  const payload = preview?.normalizedPayload || {};
  return withoutUndefined({
    draftType: preview?.draftType,
    language: preview?.language,
    title: payload.title || payload.activityTitle,
    targetAudience: boundedAuditList(payload.targetAudience, 10),
    format: boundedAuditList(payload.format || (payload.activityType ? [payload.activityType] : []), 10),
    durationMinutes: payload.durationMinutes || payload.estimatedTimeMinutes,
    difficulty: payload.difficulty,
    tags: boundedAuditList(payload.tags, 20),
    draftStatus: payload.draftStatus,
    visibility: payload.visibility,
    published: payload.published,
  });
}

function projectContentQuality(quality = {}) {
  return withoutUndefined({
    status: quality.status,
    errors: boundedAuditList(quality.errors, 20),
    warnings: boundedAuditList(quality.warnings, 20),
    estimatedBodyBlocks: quality.estimatedBodyBlocks,
  });
}

function projectExtractedRequirements(requirements = {}) {
  return withoutUndefined({
    exactTitle: typeof requirements.exactTitle === 'string' ? requirements.exactTitle.slice(0, 320) : undefined,
    targetAudience: boundedAuditList(requirements.targetAudience, 10),
    durationMinutes: requirements.durationMinutes,
    difficulty: requirements.difficulty,
    format: boundedAuditList(requirements.format, 10),
    language: requirements.language,
    objectiveCount: requirements.objectiveCount,
    sessionCount: requirements.sessionCount,
    activityCount: requirements.activityCount,
    requiredElements: boundedAuditList(requirements.requiredElements, 20),
    subjectKeywords: boundedAuditList(requirements.subjectKeywords, 20),
  });
}

function projectModelGeneration(metadata = {}) {
  const attempts = Array.isArray(metadata.attempts) ? metadata.attempts.slice(0, 2).map((attempt) => withoutUndefined({
    requestId: attempt.requestId, traceId: attempt.traceId, agentId: attempt.agentId, taskType: attempt.taskType,
    provider: attempt.provider, model: attempt.model, promptVersion: attempt.promptVersion,
    schemaVersion: attempt.schemaVersion, validatorVersion: attempt.validatorVersion, attempt: attempt.attempt,
    retryCount: attempt.retryCount, fallbackUsed: Boolean(attempt.fallbackUsed), status: attempt.status,
    errorCode: attempt.errorCode, inputTokens: attempt.inputTokens, outputTokens: attempt.outputTokens,
    totalTokens: attempt.totalTokens, latencyMs: attempt.latencyMs, estimatedCost: null,
  })) : [];
  return withoutUndefined({
    mode: metadata.mode,
    provider: metadata.provider,
    requestedProvider: metadata.requestedProvider,
    actualProvider: metadata.actualProvider,
    model: metadata.model,
    generationMode: metadata.generationMode,
    fallbackUsed: Boolean(metadata.fallbackUsed),
    fallbackReason: metadata.fallbackReason,
    requestId: metadata.requestId,
    traceId: metadata.traceId,
    taskType: metadata.taskType,
    promptVersion: metadata.promptVersion,
    schemaVersion: metadata.schemaVersion,
    validatorVersion: metadata.validatorVersion,
    retryCount: metadata.retryCount,
    maxAttempts: metadata.maxAttempts,
    attempts,
    status: metadata.status,
    errorCode: metadata.errorCode,
    estimatedCost: null,
    generatedAt: metadata.generatedAt,
    latencyMs: metadata.latencyMs,
    tokenUsage: metadata.tokenUsage || null,
    schemaValidationStatus: metadata.schemaValidationStatus,
    qualityValidationStatus: metadata.qualityValidationStatus,
  });
}

function projectShadowComparison(shadow = null) {
  if (!shadow || typeof shadow !== 'object') return null;
  return withoutUndefined({
    shadowExecuted: Boolean(shadow.shadowExecuted), provider: shadow.provider, model: shadow.model,
    requestId: shadow.requestId, traceId: shadow.traceId, latencyMs: shadow.latencyMs, tokenUsage: shadow.tokenUsage || null,
    taskType: shadow.taskType, promptVersion: shadow.promptVersion, schemaVersion: shadow.schemaVersion,
    validatorVersion: shadow.validatorVersion, retryCount: shadow.retryCount, maxAttempts: shadow.maxAttempts,
    attempts: Array.isArray(shadow.attempts) ? shadow.attempts.slice(0, 2) : [], estimatedCost: null,
    schemaValidationStatus: shadow.schemaValidationStatus, qualityValidationStatus: shadow.qualityValidationStatus,
    fallbackUsed: Boolean(shadow.fallbackUsed), fallbackReason: shadow.fallbackReason,
    comparisonStatus: shadow.comparisonStatus, schemaPassed: Boolean(shadow.schemaPassed),
    qualityPassed: Boolean(shadow.qualityPassed), requiredSectionCount: shadow.requiredSectionCount,
    sessionDurationValid: shadow.sessionDurationValid, learningObjectiveCount: shadow.learningObjectiveCount,
    sessionCount: shadow.sessionCount, activityCount: shadow.activityCount, warningCount: shadow.warningCount,
    errorCode: shadow.errorCode, qualityDiagnostic: shadow.qualityDiagnostic || null,
  });
}

export function projectXchangePreviewAuditOutput(preview) {
  const shadowComparison = projectShadowComparison(preview?.shadowComparison);
  return withoutUndefined({
    previewId: preview?.previewId,
    operationId: preview?.operationId,
    requestId: preview?.requestId,
    draftType: preview?.draftType,
    language: preview?.language,
    contractVersion: preview?.contractVersion,
    schemaVersion: preview?.schemaVersion,
    previewHash: preview?.previewHash,
    previewExpiresAt: preview?.previewExpiresAt,
    estimatedWrites: preview?.estimatedWrites,
    writesPerformed: 0,
    contentQuality: projectContentQuality(preview?.contentQuality),
    contentSchemaVersion: preview?.contentSchemaVersion,
    rendererVersion: preview?.rendererVersion,
    estimatedBodyBlocks: preview?.estimatedBodyBlocks,
    durationValidation: preview?.durationValidation,
    preservedConstraints: preview?.preservedConstraints,
    extractedRequirements: projectExtractedRequirements(preview?.extractedRequirements),
    modelGeneration: projectModelGeneration(preview?.modelGeneration),
    shadowComparison,
    qualityDiagnostic: shadowComparison?.qualityDiagnostic || null,
    source: 'xchange-write-preview',
    previewVersion: preview?.previewVersion,
    parentOperationId: preview?.parentOperationId || null,
    revisionNumber: preview?.revisionNumber,
    revisionReason: preview?.revisionReason,
    changedPaths: boundedAuditList(preview?.changedPaths, 30),
    preservedPaths: boundedAuditList(preview?.preservedPaths, 30),
    regeneratedPaths: boundedAuditList(preview?.regeneratedPaths, 30),
    autoAdjustedPaths: boundedAuditList(preview?.autoAdjustedPaths, 30),
    changeSummary: auditChangeSummary(preview?.changeSummary),
    auditEvent: preview?.auditEvent,
    sourcePreviewHash: preview?.sourcePreviewHash || null,
    canExecute: preview?.canExecute,
  });
}

function createAuditEvent({ preview, actor, req }) {
  const address = String(req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const requesterFingerprint = digest({ address, userAgent: String(req?.headers?.['user-agent'] || 'unknown').slice(0, 300) }).slice(0, 32);
  return {
    operationId: preview.operationId,
    timestamp: preview.createdAt,
    actorId: actorHash(actor.actorId),
    actorRole: actor.role,
    actorSessionHash: hashActorSession(actor.sessionId),
    agentId: 'xchange',
    toolId: preview.toolId,
    permissionLevel: 'WRITE_CONFIRM',
    targetDataSource: XCHANGE_TARGET_DATA_SOURCE,
    actionType: 'create',
    executionStatus: 'previewed',
    confirmationStatus: 'pending',
    sanitizedInput: projectXchangeAuditInput(preview),
    sanitizedOutput: projectXchangePreviewAuditOutput(preview),
    previewHash: preview.previewHash,
    idempotencyKey: preview.idempotencyKey,
    requesterFingerprint,
    auditPersistenceStatus: 'dedicated',
    schemaVersion: 'v1',
    recordType: 'formal',
    source: 'xchange-write-preview',
  };
}

async function persistModelGenerationFailure({ errorCode, body, actor, req, auditRepository, operationId, requestId, now, env, modelMetadata = null, qualityDiagnostic = null }) {
  const config = getModelConfiguration(env);
  const address = String(req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const requesterFingerprint = digest({ address, userAgent: String(req?.headers?.['user-agent'] || 'unknown').slice(0, 300) }).slice(0, 32);
  try {
    await auditRepository.createAuditRecord({
      operationId, timestamp: new Date(now).toISOString(), actorId: actorHash(actor.actorId), actorRole: actor.role,
      actorSessionHash: hashActorSession(actor.sessionId), agentId: 'xchange', toolId: body.toolId,
      permissionLevel: 'WRITE_CONFIRM', targetDataSource: XCHANGE_TARGET_DATA_SOURCE, actionType: 'create',
      executionStatus: 'failed', confirmationStatus: 'not_required', sanitizedInput: { draftType: body.draftType, language: body.language },
      sanitizedOutput: {
        modelGeneration: modelMetadata || {
          mode: 'failed', provider: config.provider, requestedProvider: config.requestedProvider,
          actualProvider: config.provider, model: config.provider === 'mock' ? 'deterministic-v1' : config.model,
          generationMode: 'failed', fallbackUsed: false,
          requestId, generatedAt: new Date(now).toISOString(), latencyMs: null, tokenUsage: null,
          schemaValidationStatus: errorCode === 'MODEL_SCHEMA_INVALID' ? 'failed' : 'not_completed',
          qualityValidationStatus: errorCode === 'CONTENT_VALIDATION_FAILED' ? 'failed' : 'not_completed',
        },
        requestId, writesPerformed: 0, outcome: 'failed', auditEvent: 'model_generation_failed', generationAction: 'generate',
        ...(qualityDiagnostic ? { qualityDiagnostic } : {}),
      },
      errorCode, requesterFingerprint, auditPersistenceStatus: 'dedicated', schemaVersion: 'v1', recordType: 'formal',
      source: 'xchange-model-generation',
    });
  } catch (error) {
    throw Object.assign(new Error('generation_audit_persistence_failed'), { code: error?.code || 'AUDIT_PERSISTENCE_FAILED' });
  }
}

async function findReusablePreview({ idempotencyKey, actorSessionHash, now }) {
  const cached = previewStore.get(idempotencyKey);
  if (cached && cached.actorSessionHash === actorSessionHash && new Date(cached.previewExpiresAt).getTime() > now) return cached;
  return null;
}

function rulesMetadata({ config, requestId, generatedAt = new Date().toISOString(), mode = 'rules' }) {
  return {
    mode, provider: 'mock', requestedProvider: config.provider, actualProvider: 'mock', model: 'deterministic-v1',
    generationMode: mode, fallbackUsed: false, requestId, traceId: requestId, generatedAt, latencyMs: 0, tokenUsage: null,
    taskType: 'xchange.course_draft.rules', promptVersion: null, schemaVersion: 'v1', validatorVersion: 'locale-semantic-v1',
    retryCount: 0, maxAttempts: 0, attempts: [], status: 'succeeded', errorCode: null, estimatedCost: null,
  };
}

function shadowMetrics({ generation, quality, errorCode = null, failureMetadata = null }) {
  const content = generation?.output;
  const metadata = generation?.metadata || failureMetadata || {};
  const duration = quality?.durationValidation;
  return Object.freeze({
    shadowExecuted: true,
    provider: metadata.actualProvider || metadata.provider || null,
    model: metadata.model || null,
    requestId: metadata.requestId || null,
    traceId: metadata.traceId || metadata.requestId || null,
    latencyMs: metadata.latencyMs ?? null,
    tokenUsage: metadata.tokenUsage || null,
    taskType: metadata.taskType || null,
    promptVersion: metadata.promptVersion || null,
    schemaVersion: metadata.schemaVersion || null,
    validatorVersion: metadata.validatorVersion || null,
    retryCount: metadata.retryCount ?? 0,
    maxAttempts: metadata.maxAttempts ?? null,
    attempts: Array.isArray(metadata.attempts) ? metadata.attempts.slice(0, 2) : [],
    estimatedCost: null,
    schemaValidationStatus: generation ? 'passed' : errorCode === 'MODEL_SCHEMA_INVALID' || errorCode === 'MODEL_JSON_INVALID' ? 'failed' : 'not_completed',
    qualityValidationStatus: quality ? (['Complete', 'Complete with warnings'].includes(quality.status) ? 'passed' : 'failed') : 'not_completed',
    fallbackUsed: Boolean(metadata.fallbackUsed),
    comparisonStatus: generation ? 'completed' : 'failed',
    schemaPassed: Boolean(generation),
    qualityPassed: Boolean(quality && ['Complete', 'Complete with warnings'].includes(quality.status)),
    requiredSectionCount: content && typeof content === 'object' ? Object.keys(content).length : 0,
    sessionDurationValid: duration?.valid === true,
    learningObjectiveCount: Array.isArray(content?.learningObjectives) ? content.learningObjectives.length : 0,
    sessionCount: Array.isArray(content?.sessionPlan) ? content.sessionPlan.length : 0,
    activityCount: Array.isArray(content?.activities) ? content.activities.length : 0,
    warningCount: Array.isArray(quality?.warnings) ? quality.warnings.length : 0,
    qualityDiagnostic: buildShadowQualityDiagnostic(quality),
    ...(metadata.fallbackReason ? { fallbackReason: metadata.fallbackReason } : {}),
    ...(errorCode ? { errorCode } : {}),
  });
}

export async function createXchangeDraftPreview({ body, req, actor, auditRepository, now = Date.now(), operationId = randomUUID(), requestId = randomUUID(), env = process.env, modelGateway, logger = console.error }) {
  if (!actor?.actorId || actor.role !== 'admin' || !actor.sessionId) fail('AUTH_REQUIRED');
  if (!auditRepository?.createAuditRecord) fail('AUDIT_CONFIGURATION_MISSING');
  const validatedUserPayload = validateRequest(body);
  const extractedRequirements = extractStructuredRequirements(body.draftType, validatedUserPayload);
  const normalizedUserPayload = applyExtractedRequirements(body.draftType, validatedUserPayload, extractedRequirements);
  const normalizedPayload = Object.freeze({
    ...normalizedUserPayload,
    draftStatus: 'Draft',
    visibility: 'Private',
    published: false,
    createdViaAgent: 'xchange',
  });
  const deterministic = createStructuredContent(body.draftType, normalizedPayload, { requirements: extractedRequirements });
  const config = getModelConfiguration(env);
  let mode;
  try { mode = getXchangeModelMode(env); }
  catch (error) {
    await persistModelGenerationFailure({ errorCode: error.code, body, actor, req, auditRepository, operationId, requestId, now, env });
    throw error;
  }
  if (mode === 'disabled') {
    const disabledMetadata = {
      mode, provider: 'disabled', requestedProvider: config.provider, actualProvider: 'disabled',
      model: config.provider === 'mock' ? 'deterministic-v1' : config.model, generationMode: 'disabled',
      fallbackUsed: false, requestId, generatedAt: new Date(now).toISOString(), latencyMs: 0, tokenUsage: null,
      schemaValidationStatus: 'not_completed', qualityValidationStatus: 'not_completed',
    };
    await persistModelGenerationFailure({ errorCode: 'MODEL_DISABLED', body, actor, req, auditRepository, operationId, requestId, now, env, modelMetadata: disabledMetadata });
    fail('MODEL_DISABLED');
  }
  const idempotencyKey = digest({
    actorId: actor.actorId, toolId: body.toolId, targetDataSource: body.targetDataSource,
    normalizedPayload, mode, contentSchemaVersion: XCHANGE_CONTENT_SCHEMA_VERSION,
    rendererVersion: XCHANGE_CONTENT_RENDERER_VERSION,
  }).slice(0, 48);
  const actorSessionHash = hashActorSession(actor.sessionId);
  const reusable = await findReusablePreview({ idempotencyKey, actorSessionHash, now });
  if (reusable) return publicPreview({ ...reusable, confirmationToken: createConfirmationToken(reusable, actorSessionHash, env), reused: true });
  let contentPreview = deterministic.content;
  let contentQuality = deterministic.quality;
  let modelMetadata = rulesMetadata({ config, requestId, mode });
  let shadowComparison = null;
  if (body.draftType === XCHANGE_DRAFT_TYPES.COURSE && mode === 'shadow') {
    const prompt = buildXchangeCourseGenerationRequest({ payload: normalizedPayload, requirements: extractedRequirements });
    try {
      const generation = await (modelGateway || createModelGateway({ env })).structuredGenerate({
        ...prompt, requestId, traceId: requestId, agentId: 'xchange', task: 'xchange.course_draft.shadow', schemaName: XCHANGE_COURSE_SCHEMA_NAME,
        schema: XCHANGE_COURSE_DRAFT_SCHEMA, mockResult: () => deterministic.content,
      });
      const quality = validateStructuredContent(body.draftType, generation.output, {
        requirements: extractedRequirements,
        sourcePrompt: String(normalizedPayload.summary || normalizedPayload.subTopic || ''),
        allowedUrls: [normalizedPayload.fileUrl].filter(Boolean),
      });
      shadowComparison = shadowMetrics({ generation, quality });
    } catch (error) {
      shadowComparison = shadowMetrics({ errorCode: error?.code || 'MODEL_PROVIDER_ERROR', failureMetadata: error?.details });
    }
  } else if (body.draftType === XCHANGE_DRAFT_TYPES.COURSE && mode === 'live') {
    const prompt = buildXchangeCourseGenerationRequest({ payload: normalizedPayload, requirements: extractedRequirements });
    let generation;
    try {
      generation = await (modelGateway || createModelGateway({ env })).structuredGenerate({
        ...prompt, requestId, traceId: requestId, agentId: 'xchange', task: 'xchange.course_draft', schemaName: XCHANGE_COURSE_SCHEMA_NAME,
        schema: XCHANGE_COURSE_DRAFT_SCHEMA, mockResult: () => deterministic.content,
      });
    } catch (error) {
      await persistModelGenerationFailure({
        errorCode: error?.code || 'MODEL_PROVIDER_ERROR', body, actor, req, auditRepository, operationId, requestId, now, env,
        modelMetadata: {
          mode: 'live', provider: config.provider, requestedProvider: config.provider, actualProvider: config.provider,
          model: config.provider === 'mock' ? 'deterministic-v1' : config.model, generationMode: 'live', fallbackUsed: false,
          requestId, traceId: error?.details?.traceId || requestId, generatedAt: new Date(now).toISOString(), latencyMs: null, tokenUsage: null,
          taskType: 'xchange.course_draft', promptVersion: prompt.promptVersion, schemaVersion: prompt.schemaVersion,
          validatorVersion: prompt.validatorVersion, retryCount: error?.details?.retryCount ?? 0,
          maxAttempts: 2, attempts: Array.isArray(error?.details?.attempts) ? error.details.attempts.slice(0, 2) : [],
          status: 'failed', errorCode: error?.code || 'MODEL_PROVIDER_ERROR', estimatedCost: null,
          schemaValidationStatus: ['MODEL_JSON_INVALID', 'MODEL_SCHEMA_INVALID'].includes(error?.code) ? 'failed' : 'not_completed',
          qualityValidationStatus: 'not_completed',
        },
      });
      throw error;
    }
    contentPreview = generation.output;
    contentQuality = validateStructuredContent(body.draftType, contentPreview, {
      requirements: extractedRequirements,
      sourcePrompt: String(normalizedPayload.summary || normalizedPayload.subTopic || ''),
      allowedUrls: [normalizedPayload.fileUrl].filter(Boolean),
    });
    modelMetadata = {
      ...generation.metadata,
      mode: generation.metadata.fallbackUsed ? 'live_fallback' : 'live',
      generationMode: generation.metadata.fallbackUsed ? 'live_fallback' : 'live',
      requestedProvider: generation.metadata.requestedProvider || config.provider,
      actualProvider: generation.metadata.actualProvider || generation.metadata.provider,
    };
    if (!['Complete', 'Complete with warnings'].includes(contentQuality.status)
      && modelMetadata.provider !== 'mock' && getModelConfiguration(env).fallbackProvider === 'mock') {
      contentPreview = deterministic.content;
      contentQuality = deterministic.quality;
      modelMetadata = {
        mode: 'live_fallback', provider: 'mock', requestedProvider: config.provider, actualProvider: 'mock',
        model: 'deterministic-v1', generationMode: 'live_fallback', fallbackUsed: true,
        requestId, generatedAt: new Date().toISOString(), latencyMs: modelMetadata.latencyMs,
        tokenUsage: modelMetadata.tokenUsage || null, fallbackReason: 'MODEL_QUALITY_INVALID',
      };
    }
  }
  if (!['Complete', 'Complete with warnings'].includes(contentQuality.status)) {
    await persistModelGenerationFailure({
      errorCode: 'CONTENT_VALIDATION_FAILED', body, actor, req, auditRepository, operationId, requestId, now, env,
      modelMetadata: { ...modelMetadata, schemaValidationStatus: 'passed', qualityValidationStatus: 'failed' },
      qualityDiagnostic: buildShadowQualityDiagnostic(contentQuality),
    });
    fail('CONTENT_VALIDATION_FAILED');
  }
  const modelGeneration = Object.freeze({
    ...modelMetadata, schemaValidationStatus: 'passed', qualityValidationStatus: contentQuality.status,
  });
  const createdAt = new Date(now).toISOString();
  const previewExpiresAt = new Date(now + XCHANGE_PREVIEW_TTL_MS).toISOString();
  const previewHash = digest({
    contractVersion: 'v1', schemaVersion: 'v1', agentId: 'xchange', toolId: body.toolId,
    targetDataSource: XCHANGE_TARGET_DATA_SOURCE, draftType: body.draftType, language: body.language,
    actorId: actor.actorId, normalizedPayload, contentPreview,
    contentSchemaVersion: XCHANGE_CONTENT_SCHEMA_VERSION,
    rendererVersion: XCHANGE_CONTENT_RENDERER_VERSION,
    estimatedBodyBlocks: contentQuality.estimatedBodyBlocks, modelGeneration,
  });
  const preview = {
    ok: true,
    previewId: `xpv_${operationId}`,
    requestId,
    operationId,
    idempotencyKey,
    agentId: 'xchange',
    toolId: body.toolId,
    actionType: 'create',
    draftType: body.draftType,
    language: body.language,
    targetDataSource: XCHANGE_TARGET_DATA_SOURCE,
    contractVersion: 'v1',
    schemaVersion: 'v1',
    permissionLevel: 'WRITE_CONFIRM',
    confirmationRequired: true,
    requestedBy: actor.actorId,
    actorSessionHash,
    createdAt,
    previewExpiresAt,
    previewHash,
    normalizedPayload,
    contentPreview,
    contentQuality,
    contentSchemaVersion: XCHANGE_CONTENT_SCHEMA_VERSION,
    rendererVersion: XCHANGE_CONTENT_RENDERER_VERSION,
    estimatedBodyBlocks: contentQuality.estimatedBodyBlocks,
    durationValidation: contentQuality.durationValidation,
    extractedRequirements,
    preservedConstraints: contentQuality.preservedConstraints,
    previewVersion: 1,
    parentOperationId: null,
    revisionNumber: 1,
    revisionReason: 'initial_generation',
    changedPaths: [],
    preservedPaths: [],
    regeneratedPaths: [],
    autoAdjustedPaths: [],
    changeSummary: null,
    auditEvent: 'preview_created',
    sourcePreviewHash: null,
    createPayloadPreview: withoutUndefined(toNotionPreview(body.draftType, normalizedPayload)),
    modelGeneration,
    shadowComparison,
    rejectedFields: [],
    warnings: [
      'Preview only. No Learning Coaching record was created.',
      'Draft, Private, and Published=false are enforced by the server.',
      'Execution requires an explicit administrator confirmation.',
      ...contentQuality.warnings,
    ],
    estimatedWrites: 1,
    writesPerformed: 0,
    auditPreview: {
      executionStatus: 'previewed', confirmationStatus: 'pending', recordType: 'formal', schemaVersion: 'v1',
    },
    canExecute: true,
    executeEndpointEnabled: true,
    reused: false,
  };
  const audit = createAuditEvent({ preview, actor, req });
  let persistence;
  try {
    persistence = await auditRepository.createAuditRecord(audit);
  } catch (error) {
    logAuditFailure(logger, operationId, 'persist_preview_audit', error);
    throw Object.assign(new Error('preview_audit_persistence_failed'), {
      code: error?.code || 'AUDIT_PERSISTENCE_FAILED', status: error?.status,
      airtableErrorType: error?.airtableErrorType, diagnosticReason: error?.diagnosticReason,
      airtableErrorMessage: error?.airtableErrorMessage, airtableResponseBody: error?.airtableResponseBody,
      airtableResponseBodyBytes: error?.airtableResponseBodyBytes, airtableResponseBodyHash: error?.airtableResponseBodyHash,
      operation: error?.operation, fieldNames: error?.fieldNames,
      rejectedFieldNames: error?.rejectedFieldNames, fieldByteSizes: error?.fieldByteSizes,
      requestBodyBytes: error?.requestBodyBytes,
    });
  }
  const completed = {
    ...preview,
    confirmationToken: createConfirmationToken(preview, hashActorSession(actor.sessionId), env),
    auditPersistenceStatus: persistence.persistence || 'persistent',
    auditPreview: {
      ...preview.auditPreview,
      auditRecordId: persistence.auditRecordId,
      auditPersistenceStatus: persistence.persistence || 'persistent',
    },
  };
  previewStore.set(idempotencyKey, completed);
  return publicPreview(completed);
}

export function resetXchangePreviewStoreForTests() {
  previewStore.clear();
}

export function getXchangeProductionContractConfig(env = process.env) {
  return Object.freeze({
    platform: 'notion',
    databaseEnvKey: 'NOTION_TEACHING_DATABASE_ID',
    databaseId: env.NOTION_TEACHING_DATABASE_ID?.trim() || '',
    targetDataSource: XCHANGE_TARGET_DATA_SOURCE,
    writeRuntimeEnabled: true,
  });
}

function previewFromAudit(audit) {
  const output = audit?.sanitizedOutput || {};
  if (audit?.agentId !== 'xchange' || audit?.executionStatus !== 'previewed' || !output.previewId) return null;
  const cached = previewStore.get(audit.idempotencyKey);
  if (!cached || cached.operationId !== audit.operationId || cached.previewHash !== (output.previewHash || audit.previewHash)) return null;
  return cached;
}

function isSupersededLifecycle(lifecycle = []) {
  return lifecycle.some((record) => {
    const output = record.sanitizedOutput || {};
    return output.auditEvent === 'preview_superseded'
      || record.source === 'xchange-preview-superseded'
      || record.confirmationStatus === 'superseded'
      || (record.executionStatus === 'cancelled' && Boolean(output.newOperationId));
  });
}

function revisionValue(preview, path) {
  if (!path) return null;
  if (path.startsWith('metadata.')) return preview.normalizedPayload?.[path.slice('metadata.'.length)];
  return preview.contentPreview?.[path];
}

export async function reviseXchangeDraftPreview({ body, req, actor, auditRepository, now = Date.now(), operationId = randomUUID(), requestId = randomUUID(), env = process.env }) {
  if (!actor?.actorId || actor.role !== 'admin' || !actor.sessionId) fail('AUTH_REQUIRED');
  if (!auditRepository?.getAuditLifecycleByOperationId || !auditRepository?.createAuditRecord) fail('AUDIT_CONFIGURATION_MISSING');
  const sourceOperationId = typeof body?.sourceOperationId === 'string' ? body.sourceOperationId.trim().slice(0, 80) : '';
  if (!sourceOperationId) fail('PREVIEW_NOT_FOUND');
  const lifecycle = await auditRepository.getAuditLifecycleByOperationId(sourceOperationId);
  const sourceAudit = lifecycle.find((record) => record.executionStatus === 'previewed');
  const sourcePreview = previewFromAudit(sourceAudit);
  if (!sourcePreview) fail('PREVIEW_NOT_FOUND');
  const actorSessionHash = hashActorSession(actor.sessionId);
  if (!safeEqual(sourcePreview.actorSessionHash, actorSessionHash)) fail('CONFIRMATION_REQUESTER_MISMATCH');
  const edit = validateXchangeRevisionRequest(body, sourcePreview.draftType);
  if (!safeEqual(edit.sourcePreviewHash, sourcePreview.previewHash)) fail('CONFIRMATION_MISMATCH');
  if (new Date(sourcePreview.previewExpiresAt).getTime() <= now) fail('PREVIEW_EXPIRED');
  if (lifecycle.some((record) => record.executionStatus === 'succeeded' || record.executionStatus === 'executing')) fail('PREVIEW_ALREADY_EXECUTED');
  if (lifecycle.some((record) => record.externalRecordId || record.sanitizedOutput?.notionPageCreated || Number(record.sanitizedOutput?.writesPerformed) > 0)) fail('PREVIEW_ALREADY_EXECUTED');
  const revision = reviseXchangeDraft({ sourcePreview, edit, normalizePayload });
  const beforeHash = digest({ normalizedPayload: sourcePreview.normalizedPayload, contentPreview: sourcePreview.contentPreview });
  const afterHash = digest({ normalizedPayload: revision.normalizedPayload, contentPreview: revision.contentPreview });
  if (safeEqual(beforeHash, afterHash)) fail('NO_EFFECTIVE_CHANGE');
  const idempotencyKey = digest({ actorId: actor.actorId, sourceOperationId, sourcePreviewHash: sourcePreview.previewHash, edit, normalizedPayload: revision.normalizedPayload, contentPreview: revision.contentPreview }).slice(0, 48);
  const reusable = await findReusablePreview({ idempotencyKey, actorSessionHash, now });
  const reusableRevision = reusable
    && reusable.parentOperationId === sourceOperationId
    && Number(reusable.revisionNumber) === Number(sourcePreview.revisionNumber || 1) + 1;
  if (reusableRevision) return publicPreview({ ...reusable, confirmationToken: createConfirmationToken(reusable, actorSessionHash, env), reused: true });
  if (isSupersededLifecycle(lifecycle)) fail('PREVIEW_SUPERSEDED');

  const revisionNumber = Number(sourcePreview.revisionNumber || 1) + 1;
  const createdAt = new Date(now).toISOString();
  const previewExpiresAt = new Date(now + XCHANGE_PREVIEW_TTL_MS).toISOString();
  const createPayloadPreview = withoutUndefined(toNotionPreview(sourcePreview.draftType, revision.normalizedPayload));
  const changedPath = revision.changedPaths[0] || edit.targetPath || null;
  const previewHash = digest({
    contractVersion: XCHANGE_CONTRACT_VERSION, schemaVersion: XCHANGE_SCHEMA_VERSION,
    contentSchemaVersion: XCHANGE_CONTENT_SCHEMA_VERSION, rendererVersion: XCHANGE_CONTENT_RENDERER_VERSION,
    actorId: actor.actorId, parentOperationId: sourceOperationId, revisionNumber,
    normalizedPayload: revision.normalizedPayload, contentPreview: revision.contentPreview,
    changedPaths: revision.changedPaths, regeneratedPaths: revision.regeneratedPaths,
    estimatedBodyBlocks: revision.contentQuality.estimatedBodyBlocks,
  });
  const canExecute = ['Complete', 'Complete with warnings'].includes(revision.contentQuality.status);
  const changeSummary = {
    before: changedPath ? revisionValue(sourcePreview, changedPath) : sourcePreview.contentPreview,
    after: changedPath ? revisionValue({ normalizedPayload: revision.normalizedPayload, contentPreview: revision.contentPreview }, changedPath) : revision.contentPreview,
    changedPaths: revision.changedPaths,
    preservedPaths: revision.preservedPaths,
    autoAdjustedPaths: revision.autoAdjustedPaths,
    qualityBefore: sourcePreview.contentQuality?.status || 'Unknown',
    qualityAfter: revision.contentQuality.status,
    estimatedBlocksBefore: sourcePreview.estimatedBodyBlocks,
    estimatedBlocksAfter: revision.contentQuality.estimatedBodyBlocks,
    durationBefore: sourcePreview.durationValidation,
    durationAfter: revision.contentQuality.durationValidation,
    canExecute,
  };
  const preview = {
    ok: true, previewId: `xpv_${operationId}`, requestId, operationId, idempotencyKey,
    agentId: 'xchange', toolId: sourcePreview.toolId, actionType: 'create', draftType: sourcePreview.draftType,
    language: sourcePreview.language, targetDataSource: XCHANGE_TARGET_DATA_SOURCE,
    contractVersion: XCHANGE_CONTRACT_VERSION, schemaVersion: XCHANGE_SCHEMA_VERSION,
    permissionLevel: 'WRITE_CONFIRM', confirmationRequired: true, requestedBy: actor.actorId, actorSessionHash,
    createdAt, previewExpiresAt, previewHash, normalizedPayload: Object.freeze(revision.normalizedPayload),
    contentPreview: revision.contentPreview, contentQuality: revision.contentQuality,
    modelGeneration: {
      ...(sourcePreview.modelGeneration || {}), requestId, generatedAt: new Date().toISOString(),
      generationMode: 'deterministic_revision', fallbackUsed: sourcePreview.modelGeneration?.fallbackUsed || false,
      schemaValidationStatus: 'passed', qualityValidationStatus: revision.contentQuality.status,
    },
    shadowComparison: sourcePreview.shadowComparison || null,
    contentSchemaVersion: XCHANGE_CONTENT_SCHEMA_VERSION, rendererVersion: XCHANGE_CONTENT_RENDERER_VERSION,
    estimatedBodyBlocks: revision.contentQuality.estimatedBodyBlocks,
    durationValidation: revision.contentQuality.durationValidation,
    extractedRequirements: revision.extractedRequirements, preservedConstraints: revision.contentQuality.preservedConstraints,
    previewVersion: revisionNumber, parentOperationId: sourceOperationId, revisionNumber,
    revisionReason: edit.instruction || edit.editMode, changedPaths: revision.changedPaths,
    sourcePreviewHash: sourcePreview.previewHash,
    preservedPaths: revision.preservedPaths, regeneratedPaths: revision.regeneratedPaths,
    autoAdjustedPaths: revision.autoAdjustedPaths, changeSummary, auditEvent: revision.eventType,
    createPayloadPreview, rejectedFields: [],
    warnings: [
      'Revision preview only. No Learning Coaching record was created.',
      'The source preview and confirmation token are superseded.',
      'Draft, Private, and Published=false are enforced by the server.',
      ...revision.contentQuality.warnings,
    ],
    estimatedWrites: 1, writesPerformed: 0,
    auditPreview: { executionStatus: 'previewed', confirmationStatus: 'pending', recordType: 'formal', schemaVersion: 'v1' },
    canExecute, executeEndpointEnabled: canExecute, reused: false,
  };
  const baseRevisionAudit = createAuditEvent({ preview, actor, req });
  const revisionAudit = {
    ...baseRevisionAudit,
    source: `xchange-${revision.eventType}`,
    sanitizedOutput: {
      ...baseRevisionAudit.sanitizedOutput,
      sourceOperationId, newOperationId: operationId, editMode: edit.editMode,
      qualityBefore: sourcePreview.contentQuality?.status || 'Unknown', qualityAfter: revision.contentQuality.status,
      estimatedBlocksBefore: sourcePreview.estimatedBodyBlocks, estimatedBlocksAfter: revision.contentQuality.estimatedBodyBlocks,
      writesPerformed: 0,
    },
  };
  let persistence;
  try { persistence = await auditRepository.createAuditRecord(revisionAudit); }
  catch (error) { throw Object.assign(new Error('revision_audit_persistence_failed'), { code: error?.code || 'AUDIT_PERSISTENCE_FAILED' }); }
  await persistLifecycle(auditRepository, sourceOperationId, {
    ...executionAudit(sourcePreview, actor, req, now, {
      executionStatus: 'cancelled', confirmationStatus: 'superseded',
      sanitizedOutput: { auditEvent: 'preview_superseded', sourceOperationId, newOperationId: operationId, revisionNumber, writesPerformed: 0 },
    }),
    source: 'xchange-preview-superseded',
  }, { stage: 'persist_preview_superseded' });
  const completed = {
    ...preview, confirmationToken: createConfirmationToken(preview, actorSessionHash, env),
    auditPersistenceStatus: persistence.persistence || 'persistent',
    auditPreview: { ...preview.auditPreview, auditRecordId: persistence.auditRecordId, auditPersistenceStatus: persistence.persistence || 'persistent' },
  };
  previewStore.set(idempotencyKey, completed);
  return publicPreview(completed);
}

function requesterFingerprint(req) {
  const address = String(req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  return digest({ address, userAgent: String(req?.headers?.['user-agent'] || 'unknown').slice(0, 300) }).slice(0, 32);
}

function logAuditFailure(logger, operationId, stage, error, internalErrorCode = error?.code || 'AUDIT_PERSISTENCE_FAILED') {
  const safeType = String(error?.airtableErrorType || '').replace(/[^A-Z0-9_ -]/giu, '').slice(0, 100) || null;
  const safeReason = String(error?.diagnosticReason || '').replace(/[^a-z0-9_-]/giu, '').slice(0, 100) || null;
  try {
    logger(JSON.stringify({
      service: 'nexaeon-xchange', category: 'audit_persistence_failed', stage,
      operationIdHash: digest(operationId || 'missing').slice(0, 20), internalErrorCode,
      causeCode: error?.causeCode || error?.code || null, httpStatus: Number(error?.status) || null,
      airtableErrorType: safeType, diagnosticReason: safeReason, tableRole: error?.tableRole || 'audit',
      airtableErrorMessage: safeDiagnosticText(error?.airtableErrorMessage, 1000),
      airtableResponseBody: safeDiagnosticText(error?.airtableResponseBody, 1200),
      airtableResponseBodyBytes: Number(error?.airtableResponseBodyBytes) || null,
      airtableResponseBodyHash: String(error?.airtableResponseBodyHash || '').replace(/[^a-f0-9]/giu, '').slice(0, 64) || null,
      fieldNames: Array.isArray(error?.fieldNames) ? error.fieldNames.slice(0, 50) : [], writesPerformed: 0,
      rejectedFieldNames: Array.isArray(error?.rejectedFieldNames) ? error.rejectedFieldNames.slice(0, 20) : [],
      fieldByteSizes: error?.fieldByteSizes && typeof error.fieldByteSizes === 'object'
        ? Object.fromEntries(Object.entries(error.fieldByteSizes).slice(0, 50).map(([name, size]) => [String(name).slice(0, 100), Number(size) || 0]))
        : {},
      requestBodyBytes: Number(error?.requestBodyBytes) || null,
    }));
  } catch { /* diagnostics must never alter fail-closed behavior */ }
}

function auditPersistenceFailure(error, internalErrorCode = error?.code || 'AUDIT_PERSISTENCE_FAILED') {
  return Object.assign(new Error('audit_persistence_failed'), {
    code: 'AUDIT_PERSISTENCE_FAILED', internalErrorCode, causeCode: error?.causeCode || error?.code,
  });
}

async function persistLifecycle(auditRepository, operationId, event, { logger = console.error, stage = 'persist_lifecycle' } = {}) {
  if (!auditRepository?.updateAuditExecutionResult) fail('AUDIT_CONFIGURATION_MISSING');
  try { return await auditRepository.updateAuditExecutionResult(operationId, event); }
  catch (error) {
    logAuditFailure(logger, operationId, stage, error);
    throw auditPersistenceFailure(error);
  }
}

function executionAudit(preview, actor, req, now, patch = {}) {
  const revisionExecuted = Boolean(preview.parentOperationId && Number(preview.revisionNumber) > 1);
  const { sanitizedOutput: sanitizedOutputPatch = {}, ...eventPatch } = patch;
  return {
    operationId: preview.operationId, timestamp: new Date(now).toISOString(), actorId: actorHash(actor.actorId),
    actorRole: actor.role, actorSessionHash: hashActorSession(actor.sessionId), agentId: 'xchange', toolId: preview.toolId,
    permissionLevel: 'WRITE_CONFIRM', targetDataSource: XCHANGE_TARGET_DATA_SOURCE, actionType: 'create',
    confirmationStatus: 'confirmed', confirmationTimestamp: new Date(now).toISOString(), sanitizedInput: preview.normalizedPayload,
    sanitizedOutput: {
      requestId: preview.requestId, estimatedWrites: 1, writesPerformed: 0,
      parentOperationId: preview.parentOperationId || null,
      sourceOperationId: preview.parentOperationId || null,
      revisionNumber: preview.revisionNumber || 1,
      revisionReason: preview.revisionReason || 'initial_generation',
      changedPaths: preview.changedPaths || [],
      previewVersion: preview.previewVersion || 1,
      executedPreviewHash: preview.previewHash,
      modelGeneration: preview.modelGeneration || null,
      shadowComparison: preview.shadowComparison || null,
      sourcePreviewHash: preview.sourcePreviewHash || null,
      revisionExecuted,
      ...sanitizedOutputPatch,
    },
    previewHash: preview.previewHash, idempotencyKey: preview.idempotencyKey, requesterFingerprint: requesterFingerprint(req),
    auditPersistenceStatus: 'dedicated', schemaVersion: 'v1', recordType: 'formal', source: 'xchange-write-execution',
    ...eventPatch,
  };
}

function validateExecuteBody(body, preview, actor, now, env) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('INVALID_INPUT');
  const rejectedFields = Object.keys(body).filter((field) => !EXECUTE_FIELDS.has(field));
  if (rejectedFields.length) throw Object.assign(new Error('mass_assignment_rejected'), { code: 'MASS_ASSIGNMENT_REJECTED', rejectedFields });
  if (body.confirm !== true || !body.confirmationToken) fail('CONFIRMATION_REQUIRED');
  const claims = readConfirmationToken(body.confirmationToken, env);
  const currentSessionHash = hashActorSession(actor.sessionId);
  if (!safeEqual(claims.actorSessionHash, currentSessionHash) || !safeEqual(preview.actorSessionHash, currentSessionHash)) fail('CONFIRMATION_REQUESTER_MISMATCH');
  if (new Date(preview.previewExpiresAt).getTime() <= now || new Date(claims.expiresAt).getTime() <= now) fail('PREVIEW_EXPIRED');
  const expected = confirmationClaims(preview, currentSessionHash);
  if (!safeEqual(digest(claims), digest(expected))) fail('CONFIRMATION_MISMATCH');
  const comparable = {
    operationId: body.operationId, agentId: body.agentId, toolId: body.toolId, targetDataSource: body.targetDataSource,
    draftType: body.draftType, language: body.language, payloadHash: digest(body.payload), previewHash: body.previewHash,
    idempotencyKey: body.idempotencyKey, contractVersion: body.contractVersion, schemaVersion: body.schemaVersion,
  };
  const expectedBody = {
    operationId: preview.operationId, agentId: 'xchange', toolId: preview.toolId, targetDataSource: preview.targetDataSource,
    draftType: preview.draftType, language: preview.language, payloadHash: digest(preview.normalizedPayload), previewHash: preview.previewHash,
    idempotencyKey: preview.idempotencyKey, contractVersion: preview.contractVersion, schemaVersion: preview.schemaVersion,
  };
  if (!safeEqual(digest(comparable), digest(expectedBody))) {
    if (body.toolId !== preview.toolId) fail('TOOL_NOT_ALLOWED');
    if (body.targetDataSource !== preview.targetDataSource) fail('DATA_SOURCE_NOT_ALLOWED');
    fail('CONFIRMATION_MISMATCH');
  }
}

function succeededResult(record) {
  return {
    ok: true, operationId: record.operationId, executionStatus: 'succeeded', writes: 1, writesPerformed: 1,
    draftStatus: 'Draft', visibility: 'Private', published: false, externalRecordId: record.externalRecordId,
    createdAt: record.sanitizedOutput?.createdAt || record.timestamp, notPublished: true, replayed: true,
    notionPageCreated: true, bodyComplete: record.sanitizedOutput?.bodyComplete !== false,
    bodyBlocksWritten: record.sanitizedOutput?.bodyBlocksWritten || 0,
    bodyAppendBatches: record.sanitizedOutput?.bodyAppendBatches || 0,
    partialExternalWrite: Boolean(record.sanitizedOutput?.partialExternalWrite),
  };
}

async function persistMissingPreviewFailure(auditRepository, operationId, actor, req, now, errorCode, logger) {
  await persistLifecycle(auditRepository, operationId, {
    operationId, timestamp: new Date(now).toISOString(), actorId: actorHash(actor.actorId), actorRole: actor.role,
    actorSessionHash: hashActorSession(actor.sessionId), agentId: 'xchange', toolId: '', permissionLevel: 'WRITE_CONFIRM',
    targetDataSource: XCHANGE_TARGET_DATA_SOURCE, actionType: 'create', executionStatus: 'failed', confirmationStatus: 'pending',
    sanitizedInput: {}, sanitizedOutput: { estimatedWrites: 1, writesPerformed: 0 }, errorCode,
    requesterFingerprint: requesterFingerprint(req), auditPersistenceStatus: 'dedicated', schemaVersion: 'v1', recordType: 'formal',
    source: 'xchange-write-execution-validation',
  }, { logger, stage: 'persist_validation_failure' });
}

export async function executeXchangeDraft({ body, req, actor, auditRepository, notionWriter = createXchangeNotionDraft, now = Date.now(), env = process.env, logger = console.error }) {
  if (!actor?.actorId || actor.role !== 'admin' || !actor.sessionId) fail('AUTH_REQUIRED');
  const operationId = typeof body?.operationId === 'string' ? body.operationId.trim().slice(0, 80) : '';
  if (!auditRepository?.getAuditLifecycleByOperationId) fail('AUDIT_CONFIGURATION_MISSING');
  if (!operationId) {
    await persistMissingPreviewFailure(auditRepository, '', actor, req, now, 'OPERATION_NOT_FOUND', logger);
    fail('OPERATION_NOT_FOUND');
  }
  let lifecycle;
  try { lifecycle = await auditRepository.getAuditLifecycleByOperationId(operationId); }
  catch (error) {
    logAuditFailure(logger, operationId, 'read_lifecycle', error);
    throw auditPersistenceFailure(error);
  }
  if (isSupersededLifecycle(lifecycle)) fail('PREVIEW_SUPERSEDED');
  const succeeded = lifecycle.findLast((record) => record.executionStatus === 'succeeded');
  const previewAudit = lifecycle.find((record) => record.executionStatus === 'previewed');
  const preview = previewFromAudit(previewAudit);
  if (!preview) {
    await persistMissingPreviewFailure(auditRepository, operationId, actor, req, now, 'PREVIEW_NOT_FOUND', logger);
    fail('PREVIEW_NOT_FOUND');
  }
  try {
    if (!preview.canExecute || !['Complete', 'Complete with warnings'].includes(preview.contentQuality?.status)) fail('CONTENT_VALIDATION_FAILED');
    validateExecuteBody(body, preview, actor, now, env);
  } catch (error) {
    if (!succeeded) {
      await persistLifecycle(auditRepository, operationId, executionAudit(preview, actor, req, now, {
        executionStatus: error.code === 'PREVIEW_EXPIRED' ? 'expired' : 'failed', errorCode: error.code || 'CONFIRMATION_INVALID',
      }), { logger, stage: 'persist_validation_result' });
    }
    throw error;
  }
  if (succeeded) return succeededResult(succeeded);
  const confirmedAt = new Date(now).toISOString();
  const lockEvent = executionAudit(preview, actor, req, now, {
    auditId: `xchange-lock-${operationId}`.slice(0, 80), executionStatus: 'executing', source: 'xchange-execution-claim',
    sanitizedOutput: { requestId: preview.requestId, startedAt: confirmedAt, estimatedWrites: 1, writesPerformed: 0 },
  });
  if (!auditRepository.acquireExecutionLock) fail('AUDIT_CONFIGURATION_MISSING');
  let claim;
  try { claim = await auditRepository.acquireExecutionLock(lockEvent); }
  catch (error) {
    logAuditFailure(logger, operationId, 'acquire_execution_lock', error, 'AUDIT_LOCK_FAILED');
    throw auditPersistenceFailure(error, 'AUDIT_LOCK_FAILED');
  }
  if (!claim.acquired) {
    let current;
    try { current = await auditRepository.getAuditLifecycleByOperationId(operationId); }
    catch (error) {
      logAuditFailure(logger, operationId, 'read_lock_conflict_lifecycle', error);
      throw auditPersistenceFailure(error);
    }
    const priorSuccess = current.findLast((record) => record.executionStatus === 'succeeded');
    if (priorSuccess) return succeededResult(priorSuccess);
    const hasPersistentClaim = current.some((record) => record.auditId === `xchange-lock-${operationId}`.slice(0, 80));
    if (hasPersistentClaim && current.some((record) => record.executionStatus === 'failed')) fail('PREVIEW_ALREADY_EXECUTED');
    throw Object.assign(new Error('execution_in_progress'), { code: 'EXECUTION_IN_PROGRESS' });
  }
  const started = Date.now();
  try {
    const result = await notionWriter({ draftType: preview.draftType, payload: preview.normalizedPayload, content: preview.contentPreview, requirements: preview.extractedRequirements, targetDataSource: preview.targetDataSource, env, logger });
    const completedAt = result.createdAt || new Date().toISOString();
    const successAudit = executionAudit(preview, actor, req, now, {
      timestamp: completedAt, executionStatus: 'succeeded', externalRecordId: result.externalRecordId,
      duration: Date.now() - started,
      sanitizedOutput: {
        requestId: preview.requestId, startedAt: confirmedAt, completedAt, estimatedWrites: 1, writesPerformed: 1,
        createdAt: completedAt, notionPageCreated: true, externalRecordId: result.externalRecordId,
        bodyComplete: result.bodyComplete !== false, bodyBlocksWritten: result.bodyBlocksWritten || 0,
        bodyAppendBatches: result.bodyAppendBatches || 0, partialExternalWrite: false,
        validationSnapshot: packXchangeValidationSnapshot({
          draftType: preview.draftType, normalizedPayload: preview.normalizedPayload,
          expectedProperties: result.properties, contentPreview: preview.contentPreview,
          contentSchemaVersion: preview.contentSchemaVersion, rendererVersion: preview.rendererVersion,
          estimatedBodyBlocks: preview.estimatedBodyBlocks, durationValidation: preview.durationValidation,
          changedPaths: preview.changedPaths || [], preservedPaths: preview.preservedPaths || [],
          changedPathBeforeHashes: preview.changedPaths?.length === 1 && preview.changeSummary?.before !== undefined
            ? { [preview.changedPaths[0]]: digest(preview.changeSummary.before) } : {},
          changedPathAfterHashes: Object.fromEntries((preview.changedPaths || []).map((path) => [path, digest(revisionValue(preview, path))])),
          revisionNumber: preview.revisionNumber || 1, parentOperationId: preview.parentOperationId || null,
          sourceOperationId: preview.parentOperationId || null, executedPreviewHash: preview.previewHash,
          parentDataSourceId: result.parentDataSourceId || null, bodyComplete: result.bodyComplete !== false, partialExternalWrite: false,
        }),
      },
    });
    await persistLifecycle(auditRepository, operationId, successAudit, { logger, stage: 'persist_execution_success' });
    return { ...succeededResult(successAudit), replayed: false };
  } catch (error) {
    const failed = executionAudit(preview, actor, req, now, {
      executionStatus: 'failed', errorCode: error?.code || 'NOTION_REQUEST_FAILED', duration: Date.now() - started,
      externalRecordId: error?.externalRecordId,
      sanitizedOutput: { requestId: preview.requestId, startedAt: confirmedAt, completedAt: new Date().toISOString(), estimatedWrites: 1, writesPerformed: error?.writesPerformed || 0, notionPageCreated: Boolean(error?.notionPageCreated), externalRecordId: error?.externalRecordId || null, pageCreated: Boolean(error?.pageCreated), bodyComplete: error?.bodyComplete !== false && !error?.partialExternalWrite, bodyBlocksWritten: error?.bodyBlocksWritten || 0, bodyAppendBatches: error?.bodyAppendBatches || 0, partialExternalWrite: Boolean(error?.partialExternalWrite) },
    });
    await persistLifecycle(auditRepository, operationId, failed, { logger, stage: 'persist_execution_failure' });
    throw error;
  }
}
