/* global process */

import { Buffer } from 'node:buffer';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { hashActorSession } from './auditRepository.js';
import { createXchangeNotionDraft } from './xchangeNotionWriter.js';

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
    language: preview.language, payloadHash: digest(preview.normalizedPayload), actorSessionHash,
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
    '狀態': 'Draft',
    '公開狀態': 'Private',
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
    sanitizedInput: preview.normalizedPayload,
    sanitizedOutput: {
      previewId: preview.previewId,
      requestId: preview.requestId,
      draftType: preview.draftType,
      language: preview.language,
      contractVersion: preview.contractVersion,
      schemaVersion: preview.schemaVersion,
      previewExpiresAt: preview.previewExpiresAt,
      previewHash: preview.previewHash,
      estimatedWrites: preview.estimatedWrites,
      writesPerformed: 0,
      canExecute: false,
    },
    previewHash: preview.previewHash,
    idempotencyKey: preview.idempotencyKey,
    requesterFingerprint,
    auditPersistenceStatus: 'dedicated',
    schemaVersion: 'v1',
    recordType: 'formal',
    source: 'xchange-write-preview',
  };
}

async function findReusablePreview({ idempotencyKey, actorSessionHash, now, auditRepository }) {
  const cached = previewStore.get(idempotencyKey);
  if (cached && cached.actorSessionHash === actorSessionHash && new Date(cached.previewExpiresAt).getTime() > now) return cached;
  if (!auditRepository?.getAuditRecordByIdempotencyKey) return null;
  const audit = await auditRepository.getAuditRecordByIdempotencyKey(idempotencyKey);
  const output = audit?.sanitizedOutput;
  if (audit?.agentId !== 'xchange' || audit?.executionStatus !== 'previewed' || audit.actorSessionHash !== actorSessionHash || !output?.previewId) return null;
  if (new Date(output.previewExpiresAt).getTime() <= now) return null;
  const normalizedPayload = audit.sanitizedInput || {};
  return {
    ok: true,
    previewId: output.previewId,
    requestId: output.requestId,
    operationId: audit.operationId,
    idempotencyKey: audit.idempotencyKey,
    agentId: 'xchange',
    toolId: audit.toolId,
    actionType: 'create',
    draftType: output.draftType,
    language: output.language,
    targetDataSource: audit.targetDataSource,
    contractVersion: output.contractVersion || 'v1',
    schemaVersion: output.schemaVersion || 'v1',
    permissionLevel: 'WRITE_CONFIRM',
    confirmationRequired: true,
    requestedBy: audit.actorId,
    actorSessionHash: audit.actorSessionHash,
    createdAt: audit.timestamp,
    previewExpiresAt: output.previewExpiresAt,
    previewHash: output.previewHash,
    normalizedPayload,
    createPayloadPreview: withoutUndefined(toNotionPreview(output.draftType, normalizedPayload)),
    rejectedFields: [],
    warnings: [
      'Preview only. No Learning Coaching record was created.',
      'Draft, Private, and Published=false are enforced by the server.',
      'Execution requires an explicit administrator confirmation.',
    ],
    estimatedWrites: output.estimatedWrites,
    writesPerformed: 0,
    auditPreview: {
      executionStatus: 'previewed', confirmationStatus: 'pending', recordType: 'formal', schemaVersion: 'v1',
      auditRecordId: audit.auditRecordId,
      auditPersistenceStatus: audit.auditPersistenceStatus,
    },
    auditPersistenceStatus: audit.auditPersistenceStatus,
    canExecute: true,
    executeEndpointEnabled: true,
    reused: true,
  };
}

export async function createXchangeDraftPreview({ body, req, actor, auditRepository, now = Date.now(), operationId = randomUUID(), requestId = randomUUID(), env = process.env }) {
  if (!actor?.actorId || actor.role !== 'admin' || !actor.sessionId) fail('AUTH_REQUIRED');
  const normalizedUserPayload = validateRequest(body);
  const normalizedPayload = Object.freeze({
    ...normalizedUserPayload,
    draftStatus: 'Draft',
    visibility: 'Private',
    published: false,
    createdViaAgent: 'xchange',
  });
  const idempotencyKey = digest({ actorId: actor.actorId, toolId: body.toolId, targetDataSource: body.targetDataSource, normalizedPayload }).slice(0, 48);
  const actorSessionHash = hashActorSession(actor.sessionId);
  const reusable = await findReusablePreview({ idempotencyKey, actorSessionHash, now, auditRepository });
  if (reusable) return publicPreview({ ...reusable, confirmationToken: createConfirmationToken(reusable, actorSessionHash, env), reused: true });
  const createdAt = new Date(now).toISOString();
  const previewExpiresAt = new Date(now + XCHANGE_PREVIEW_TTL_MS).toISOString();
  const previewHash = digest({
    contractVersion: 'v1', schemaVersion: 'v1', agentId: 'xchange', toolId: body.toolId,
    targetDataSource: XCHANGE_TARGET_DATA_SOURCE, draftType: body.draftType, language: body.language,
    actorId: actor.actorId, normalizedPayload,
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
    createPayloadPreview: withoutUndefined(toNotionPreview(body.draftType, normalizedPayload)),
    rejectedFields: [],
    warnings: [
      'Preview only. No Learning Coaching record was created.',
      'Draft, Private, and Published=false are enforced by the server.',
      'Execution requires an explicit administrator confirmation.',
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
  if (!auditRepository?.createAuditRecord) fail('AUDIT_CONFIGURATION_MISSING');
  const audit = createAuditEvent({ preview, actor, req });
  let persistence;
  try {
    persistence = await auditRepository.createAuditRecord(audit);
  } catch (error) {
    throw Object.assign(new Error('preview_audit_persistence_failed'), { code: error?.code || 'AUDIT_PERSISTENCE_FAILED' });
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
  const normalizedPayload = audit.sanitizedInput || {};
  return {
    operationId: audit.operationId, requestId: output.requestId, previewId: output.previewId,
    idempotencyKey: audit.idempotencyKey, agentId: 'xchange', toolId: audit.toolId,
    actionType: 'create', draftType: output.draftType, language: output.language,
    targetDataSource: audit.targetDataSource, contractVersion: output.contractVersion || 'v1',
    schemaVersion: output.schemaVersion || 'v1', previewExpiresAt: output.previewExpiresAt,
    previewHash: output.previewHash || audit.previewHash, normalizedPayload,
    actorSessionHash: audit.actorSessionHash, requestedBy: audit.actorId,
  };
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
      fieldNames: Array.isArray(error?.fieldNames) ? error.fieldNames.slice(0, 50) : [], writesPerformed: 0,
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
  return {
    operationId: preview.operationId, timestamp: new Date(now).toISOString(), actorId: actorHash(actor.actorId),
    actorRole: actor.role, actorSessionHash: hashActorSession(actor.sessionId), agentId: 'xchange', toolId: preview.toolId,
    permissionLevel: 'WRITE_CONFIRM', targetDataSource: XCHANGE_TARGET_DATA_SOURCE, actionType: 'create',
    confirmationStatus: 'confirmed', confirmationTimestamp: new Date(now).toISOString(), sanitizedInput: preview.normalizedPayload,
    sanitizedOutput: { requestId: preview.requestId, estimatedWrites: 1, writesPerformed: 0, ...patch.sanitizedOutput },
    previewHash: preview.previewHash, idempotencyKey: preview.idempotencyKey, requesterFingerprint: requesterFingerprint(req),
    auditPersistenceStatus: 'dedicated', schemaVersion: 'v1', recordType: 'formal', source: 'xchange-write-execution',
    ...patch,
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
  const succeeded = lifecycle.findLast((record) => record.executionStatus === 'succeeded');
  if (succeeded) { previewStore.delete(succeeded.idempotencyKey); return succeededResult(succeeded); }
  const previewAudit = lifecycle.find((record) => record.executionStatus === 'previewed');
  const preview = previewFromAudit(previewAudit);
  if (!preview) {
    await persistMissingPreviewFailure(auditRepository, operationId, actor, req, now, 'PREVIEW_NOT_FOUND', logger);
    fail('PREVIEW_NOT_FOUND');
  }
  try {
    validateExecuteBody(body, preview, actor, now, env);
  } catch (error) {
    await persistLifecycle(auditRepository, operationId, executionAudit(preview, actor, req, now, {
      executionStatus: error.code === 'PREVIEW_EXPIRED' ? 'expired' : 'failed', errorCode: error.code || 'CONFIRMATION_INVALID',
    }), { logger, stage: 'persist_validation_result' });
    throw error;
  }
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
    if (priorSuccess) { previewStore.delete(preview.idempotencyKey); return succeededResult(priorSuccess); }
    const hasPersistentClaim = current.some((record) => record.auditId === `xchange-lock-${operationId}`.slice(0, 80));
    if (hasPersistentClaim && current.some((record) => record.executionStatus === 'failed')) fail('PREVIEW_ALREADY_EXECUTED');
    throw Object.assign(new Error('execution_in_progress'), { code: 'EXECUTION_IN_PROGRESS' });
  }
  const started = Date.now();
  try {
    const result = await notionWriter({ draftType: preview.draftType, payload: preview.normalizedPayload, targetDataSource: preview.targetDataSource, env });
    const completedAt = result.createdAt || new Date().toISOString();
    const successAudit = executionAudit(preview, actor, req, now, {
      timestamp: completedAt, executionStatus: 'succeeded', externalRecordId: result.externalRecordId,
      duration: Date.now() - started,
      sanitizedOutput: { requestId: preview.requestId, startedAt: confirmedAt, completedAt, estimatedWrites: 1, writesPerformed: 1, createdAt: completedAt },
    });
    await persistLifecycle(auditRepository, operationId, successAudit, { logger, stage: 'persist_execution_success' });
    previewStore.delete(preview.idempotencyKey);
    return { ...succeededResult(successAudit), replayed: false };
  } catch (error) {
    const failed = executionAudit(preview, actor, req, now, {
      executionStatus: 'failed', errorCode: error?.code || 'NOTION_REQUEST_FAILED', duration: Date.now() - started,
      sanitizedOutput: { requestId: preview.requestId, startedAt: confirmedAt, completedAt: new Date().toISOString(), estimatedWrites: 1, writesPerformed: 0 },
    });
    await persistLifecycle(auditRepository, operationId, failed, { logger, stage: 'persist_execution_failure' });
    throw error;
  }
}
