/* global process */

import { Buffer } from 'node:buffer';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createAirtableActionDraft, getActionDraftFields } from './actionDraftDataSource.js';
import { ACTION_DRAFT_DATA_SOURCE, ACTION_DRAFT_TOOL_ID, assertToolAccess } from './toolExecutionRegistry.js';

export const OPERATION_STATUS = Object.freeze({
  PREVIEWED: 'previewed', CONFIRMED: 'confirmed', EXECUTING: 'executing', SUCCEEDED: 'succeeded',
  FAILED: 'failed', EXPIRED: 'expired', CANCELLED: 'cancelled',
});
export const CONFIRMATION_TTL_MS = 5 * 60 * 1000;
export const MAX_ACTION_PAYLOAD_BYTES = 8_192;

const operationStore = new Map();
const SECRET_PATTERN = /(?:sk-[a-z0-9_-]{8,}|(?:api[_ -]?key|token|secret|password)\s*[:=]\s*[^\s,;]+)/giu;
const CONTACT_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function cleanText(value, limit) {
  return String(value || '').replace(SECRET_PATTERN, '[redacted]').replace(CONTACT_PATTERN, '[redacted]').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function sanitizeActionDraftInput(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw Object.assign(new Error('invalid_payload'), { code: 'INVALID_INPUT' });
  const keys = Object.keys(payload);
  if (keys.length !== 2 || !keys.includes('title') || !keys.includes('description')) throw Object.assign(new Error('mass_assignment_rejected'), { code: 'MASS_ASSIGNMENT_REJECTED' });
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_ACTION_PAYLOAD_BYTES) throw Object.assign(new Error('payload_too_large'), { code: 'PAYLOAD_TOO_LARGE' });
  const title = cleanText(payload.title, 160);
  const description = cleanText(payload.description, 4000);
  if (!title || !description) throw Object.assign(new Error('required_field_missing'), { code: 'INVALID_INPUT' });
  return { title, description };
}

export function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !/api.?key|token|cookie|password|secret|authorization/iu.test(key)).map(([key, item]) => [key, redactSecrets(item)]));
  return typeof value === 'string' ? cleanText(value, 4000) : value;
}

export function validateActionDraftOutput(output) {
  const valid = output && output.ok === true && output.executionStatus === OPERATION_STATUS.SUCCEEDED
    && output.targetDataSource === ACTION_DRAFT_DATA_SOURCE && typeof output.externalRecordId === 'string'
    && /^rec[a-zA-Z0-9_-]{3,117}$/u.test(output.externalRecordId) && typeof output.replayed === 'boolean';
  if (!valid) throw Object.assign(new Error('invalid_tool_output'), { code: 'INVALID_TOOL_OUTPUT' });
  return output;
}

function signingSecret(env = process.env) {
  const secret = env.NEXAEON_TOOL_EXECUTION_SECRET?.trim() || env.AIRTABLE_API_KEY?.trim();
  if (!secret) throw Object.assign(new Error('confirmation_configuration_missing'), { code: 'CONFIRMATION_CONFIGURATION_MISSING' });
  return secret;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(encoded, env) {
  return createHmac('sha256', signingSecret(env)).update(encoded).digest('base64url');
}

export function createRequesterFingerprint(req = {}) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const address = forwarded || req.socket?.remoteAddress || 'unknown';
  const userAgent = String(req.headers?.['user-agent'] || 'unknown').slice(0, 300);
  return digest({ address, userAgent }).slice(0, 32);
}

export function createConfirmationToken(claims, env = process.env) {
  const encoded = encode(claims);
  return `${encoded}.${sign(encoded, env)}`;
}

export function verifyConfirmationToken(token, { env = process.env, now = Date.now(), fingerprint, expected } = {}) {
  const [encoded, signature, extra] = String(token || '').split('.');
  if (!encoded || !signature || extra) throw Object.assign(new Error('confirmation_invalid'), { code: 'CONFIRMATION_INVALID' });
  const expectedSignature = sign(encoded, env);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) throw Object.assign(new Error('confirmation_invalid'), { code: 'CONFIRMATION_INVALID' });
  let claims;
  try { claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { throw Object.assign(new Error('confirmation_invalid'), { code: 'CONFIRMATION_INVALID' }); }
  if (Number(claims.expiresAt) <= now) throw Object.assign(new Error('confirmation_expired'), { code: 'CONFIRMATION_EXPIRED' });
  if (claims.fingerprint !== fingerprint) throw Object.assign(new Error('confirmation_requester_mismatch'), { code: 'CONFIRMATION_REQUESTER_MISMATCH' });
  for (const [key, value] of Object.entries(expected || {})) if (claims[key] !== value) throw Object.assign(new Error('confirmation_mismatch'), { code: 'CONFIRMATION_MISMATCH' });
  return claims;
}

export function createOperationPreview({ payload, req, env = process.env, now = Date.now(), operationId = randomUUID() }) {
  const agentId = 'orchestrator';
  const toolId = ACTION_DRAFT_TOOL_ID;
  const targetDataSource = ACTION_DRAFT_DATA_SOURCE;
  const tool = assertToolAccess({ toolId, agentId, targetDataSource });
  const safePayload = sanitizeActionDraftInput(payload);
  const idempotencyKey = digest({ agentId, toolId, payload: safePayload }).slice(0, 48);
  const previewHash = digest({ operationId, agentId, toolId, targetDataSource, payload: safePayload, idempotencyKey });
  const expiresAt = now + CONFIRMATION_TTL_MS;
  const fingerprint = createRequesterFingerprint(req);
  const confirmationToken = createConfirmationToken({ operationId, agentId, toolId, targetDataSource, previewHash, idempotencyKey, fingerprint, expiresAt }, env);
  const preview = {
    operationId, agentId, toolId, permissionLevel: tool.permissionLevel, targetDataSource,
    actionType: 'create', payload: safePayload, fieldsToWrite: getActionDraftFields(safePayload, idempotencyKey),
    warnings: ['Creates one hidden Action Center draft.', 'Does not activate work, notify anyone, or execute follow-up actions.', 'Rollback is not supported.'],
    expiresAt: new Date(expiresAt).toISOString(), confirmationRequired: true, previewHash,
    idempotencyKey, executionStatus: OPERATION_STATUS.PREVIEWED, rollbackSupport: false, confirmationToken,
  };
  operationStore.set(operationId, { status: OPERATION_STATUS.PREVIEWED, expiresAt, idempotencyKey });
  return preview;
}

export function logToolAudit(event, logger = console.error) {
  const safeEvent = {
    auditType: 'tool_execution', operationId: cleanText(event.operationId, 80), timestamp: event.timestamp || new Date().toISOString(),
    agentId: cleanText(event.agentId, 40), toolId: cleanText(event.toolId, 80), permissionLevel: cleanText(event.permissionLevel, 40),
    targetDataSource: cleanText(event.targetDataSource, 80), userConfirmation: Boolean(event.userConfirmation),
    sanitizedInput: redactSecrets(event.sanitizedInput || {}), executionStatus: cleanText(event.executionStatus, 40),
    externalRecordId: cleanText(event.externalRecordId, 120) || null, errorCode: cleanText(event.errorCode, 100) || null,
    duration: Math.max(0, Math.round(Number(event.duration) || 0)), idempotencyKey: cleanText(event.idempotencyKey, 80),
  };
  logger(JSON.stringify(safeEvent));
  return safeEvent;
}

export async function executeConfirmedOperation({ body, req, env = process.env, now = Date.now(), createDraft = createAirtableActionDraft, logger = console.error }) {
  const startedAt = Date.now();
  const operationId = cleanText(body?.operationId, 80);
  const agentId = cleanText(body?.agentId, 40);
  const toolId = cleanText(body?.toolId, 80);
  const targetDataSource = cleanText(body?.targetDataSource, 80);
  let safePayload = {};
  let idempotencyKey = cleanText(body?.idempotencyKey, 80);
  let tool;
  try {
    tool = assertToolAccess({ toolId, agentId, targetDataSource });
    if (!tool.requiresConfirmation) throw Object.assign(new Error('confirmation_not_applicable'), { code: 'CONFIRMATION_REQUIRED' });
    safePayload = sanitizeActionDraftInput(body?.payload);
    const previewHash = digest({ operationId, agentId, toolId, targetDataSource, payload: safePayload, idempotencyKey });
    verifyConfirmationToken(body?.confirmationToken, { env, now, fingerprint: createRequesterFingerprint(req), expected: { operationId, agentId, toolId, targetDataSource, previewHash, idempotencyKey } });
    const stored = operationStore.get(operationId);
    if (stored?.status === OPERATION_STATUS.CANCELLED) throw Object.assign(new Error('operation_cancelled'), { code: 'OPERATION_CANCELLED' });
    if (stored?.status === OPERATION_STATUS.SUCCEEDED && stored.idempotencyKey === idempotencyKey) {
      const replay = { ok: true, operationId, executionStatus: OPERATION_STATUS.SUCCEEDED, targetDataSource, externalRecordId: stored.externalRecordId, idempotencyKey, replayed: true };
      logToolAudit({ operationId, agentId, toolId, permissionLevel: tool.permissionLevel, targetDataSource, userConfirmation: true, sanitizedInput: safePayload, executionStatus: OPERATION_STATUS.SUCCEEDED, externalRecordId: stored.externalRecordId, duration: Date.now() - startedAt, idempotencyKey }, logger);
      return replay;
    }
    operationStore.set(operationId, { status: OPERATION_STATUS.EXECUTING, idempotencyKey });
    const result = await createDraft({ payload: safePayload, idempotencyKey, env, timeoutMs: tool.timeout });
    if (!result?.externalRecordId) throw Object.assign(new Error('invalid_tool_output'), { code: 'INVALID_TOOL_OUTPUT' });
    const output = validateActionDraftOutput({ ok: true, operationId, executionStatus: OPERATION_STATUS.SUCCEEDED, targetDataSource, externalRecordId: result.externalRecordId, idempotencyKey, replayed: Boolean(result.replayed) });
    operationStore.set(operationId, { status: OPERATION_STATUS.SUCCEEDED, ...output });
    logToolAudit({ operationId, agentId, toolId, permissionLevel: tool.permissionLevel, targetDataSource, userConfirmation: true, sanitizedInput: safePayload, executionStatus: OPERATION_STATUS.SUCCEEDED, externalRecordId: result.externalRecordId, duration: Date.now() - startedAt, idempotencyKey }, logger);
    return output;
  } catch (error) {
    operationStore.set(operationId, { status: error.code === 'CONFIRMATION_EXPIRED' ? OPERATION_STATUS.EXPIRED : OPERATION_STATUS.FAILED, errorCode: error.code });
    logToolAudit({ operationId, agentId, toolId, permissionLevel: tool?.permissionLevel || '', targetDataSource, userConfirmation: Boolean(body?.confirmationToken), sanitizedInput: safePayload, executionStatus: error.code === 'CONFIRMATION_EXPIRED' ? OPERATION_STATUS.EXPIRED : OPERATION_STATUS.FAILED, errorCode: error.code || 'EXECUTION_FAILED', duration: Date.now() - startedAt, idempotencyKey }, logger);
    throw error;
  }
}

export function cancelOperation({ body, logger = console.error }) {
  const operationId = cleanText(body?.operationId, 80);
  if (!operationId) throw Object.assign(new Error('operation_id_required'), { code: 'INVALID_INPUT' });
  const current = operationStore.get(operationId);
  if (current?.status === OPERATION_STATUS.SUCCEEDED) throw Object.assign(new Error('operation_already_succeeded'), { code: 'OPERATION_ALREADY_SUCCEEDED' });
  operationStore.set(operationId, { ...current, status: OPERATION_STATUS.CANCELLED });
  logToolAudit({ operationId, agentId: 'orchestrator', toolId: ACTION_DRAFT_TOOL_ID, permissionLevel: 'WRITE_CONFIRM', targetDataSource: ACTION_DRAFT_DATA_SOURCE, userConfirmation: false, executionStatus: OPERATION_STATUS.CANCELLED, idempotencyKey: current?.idempotencyKey }, logger);
  return { ok: true, operationId, executionStatus: OPERATION_STATUS.CANCELLED };
}

export function resetOperationStoreForTests() {
  operationStore.clear();
}
