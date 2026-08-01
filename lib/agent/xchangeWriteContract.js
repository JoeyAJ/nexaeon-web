/* global process */

import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';
import { hashActorSession } from './auditRepository.js';

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

function createAuditEvent({ preview, actor, req }) {
  const address = String(req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const requesterFingerprint = digest({ address, userAgent: String(req?.headers?.['user-agent'] || 'unknown').slice(0, 300) }).slice(0, 32);
  return {
    operationId: preview.operationId,
    timestamp: preview.createdAt,
    actorId: actor.actorId,
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

async function findReusablePreview({ idempotencyKey, now, auditRepository }) {
  const cached = previewStore.get(idempotencyKey);
  if (cached && new Date(cached.previewExpiresAt).getTime() > now) return cached;
  if (!auditRepository?.getAuditRecordByIdempotencyKey) return null;
  const audit = await auditRepository.getAuditRecordByIdempotencyKey(idempotencyKey);
  const output = audit?.sanitizedOutput;
  if (audit?.agentId !== 'xchange' || audit?.executionStatus !== 'previewed' || !output?.previewId) return null;
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
    createdAt: audit.timestamp,
    previewExpiresAt: output.previewExpiresAt,
    previewHash: output.previewHash,
    normalizedPayload,
    createPayloadPreview: withoutUndefined(toNotionPreview(output.draftType, normalizedPayload)),
    rejectedFields: [],
    warnings: [
      'Preview only. No Learning Coaching record was created.',
      'Draft, Private, and Published=false are enforced by the server.',
      'Formal execution is disabled until Stage 5-3E-B.',
    ],
    estimatedWrites: output.estimatedWrites,
    writesPerformed: 0,
    auditPreview: {
      executionStatus: 'previewed', confirmationStatus: 'pending', recordType: 'formal', schemaVersion: 'v1',
      auditRecordId: audit.auditRecordId,
      auditPersistenceStatus: audit.auditPersistenceStatus,
    },
    auditPersistenceStatus: audit.auditPersistenceStatus,
    canExecute: false,
    executeEndpointEnabled: false,
    reused: true,
  };
}

export async function createXchangeDraftPreview({ body, req, actor, auditRepository, now = Date.now(), operationId = randomUUID(), requestId = randomUUID() }) {
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
  const reusable = await findReusablePreview({ idempotencyKey, now, auditRepository });
  if (reusable) return { ...reusable, reused: true };
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
    createdAt,
    previewExpiresAt,
    previewHash,
    normalizedPayload,
    createPayloadPreview: withoutUndefined(toNotionPreview(body.draftType, normalizedPayload)),
    rejectedFields: [],
    warnings: [
      'Preview only. No Learning Coaching record was created.',
      'Draft, Private, and Published=false are enforced by the server.',
      'Formal execution is disabled until Stage 5-3E-B.',
    ],
    estimatedWrites: 1,
    writesPerformed: 0,
    auditPreview: {
      executionStatus: 'previewed', confirmationStatus: 'pending', recordType: 'formal', schemaVersion: 'v1',
    },
    canExecute: false,
    executeEndpointEnabled: false,
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
    auditPersistenceStatus: persistence.persistence || 'persistent',
    auditPreview: {
      ...preview.auditPreview,
      auditRecordId: persistence.auditRecordId,
      auditPersistenceStatus: persistence.persistence || 'persistent',
    },
  };
  previewStore.set(idempotencyKey, completed);
  return completed;
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
    writeRuntimeEnabled: false,
  });
}
