import { handleAgentChatRequest } from '../../lib/agent/chatRuntime.js';
import { handleXchangeChatRequest } from '../../lib/agent/xchangeRuntime.js';
import { handleArchivistChatRequest } from '../../lib/agent/archivistRuntime.js';
import { handleEngineerChatRequest } from '../../lib/agent/engineerRuntime.js';
import { handleOrchestratorChatRequest } from '../../lib/agent/orchestratorRuntime.js';
import { handleNetworkerChatRequest } from '../../lib/agent/networkerRuntime.js';
import { cancelOperation, createOperationPreview, executeConfirmedOperation } from '../../lib/agent/toolExecutionRuntime.js';
import { clearAdminSessionCookie, createAdminSession, readAdminSession, requireAdminCsrf } from '../../lib/agent/adminSession.js';
import { getProductionAuditRepository } from '../../lib/agent/auditRepository.js';
import { executeActionAuditRepair, executeLegacyMigration, getMigrationStatus, inspectMigrationSafety, previewActionAuditRepair, previewLegacyMigration, runConsistencyCheck, verifyMigrationBatch } from '../../lib/agent/legacyMigrationRuntime.js';

const adminLoginAttempts = new Map();
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;

const OPERATION_ERROR_STATUS = Object.freeze({
  INVALID_INPUT: 400, MASS_ASSIGNMENT_REJECTED: 400, PAYLOAD_TOO_LARGE: 413,
  TOOL_NOT_ALLOWED: 403, AGENT_NOT_ALLOWED: 403, RESTRICTED_TOOL: 403, DATA_SOURCE_NOT_ALLOWED: 403,
  CONFIRMATION_REQUIRED: 403, CONFIRMATION_INVALID: 403, CONFIRMATION_MISMATCH: 409,
  CONFIRMATION_REQUESTER_MISMATCH: 403, CONFIRMATION_EXPIRED: 410, OPERATION_CANCELLED: 409,
  OPERATION_ALREADY_SUCCEEDED: 409, DATA_SOURCE_CONFIGURATION_MISSING: 503,
  DATA_SOURCE_TIMEOUT: 504, DATA_SOURCE_REQUEST_FAILED: 502, DATA_SOURCE_REJECTED: 502,
  DATA_SOURCE_INVALID_RESPONSE: 502, DATA_SOURCE_SCHEMA_INVALID: 503, DATA_SOURCE_PAGINATION_INVALID: 502,
  DATA_SOURCE_TABLE_MISSING: 503, DATA_SOURCE_FIELD_MISSING: 503, DATA_SOURCE_FIELD_TYPE_INVALID: 503, DATA_SOURCE_LINK_INVALID: 503, DATA_SOURCE_LINK_TARGET_INVALID: 503,
  DATA_SOURCE_SCHEMA_METADATA_FORBIDDEN: 503,
  DATA_SOURCE_PAGINATION_LIMIT_EXCEEDED: 503, CONSISTENCY_DATA_INVALID: 502, CONSISTENCY_CHECK_FAILED: 500,
  INVALID_TOOL_OUTPUT: 502,
  AUTH_CONFIGURATION_MISSING: 503, AUTH_INVALID_CREDENTIALS: 401, AUTH_REQUIRED: 401,
  AUTH_ROLE_FORBIDDEN: 403, AUTH_SESSION_EXPIRED: 401, CSRF_INVALID: 403,
  AUTH_RATE_LIMITED: 429,
  ACTOR_SESSION_MISMATCH: 409, AUDIT_CONFIGURATION_MISSING: 503, AUDIT_TIMEOUT: 504,
  AUDIT_REQUEST_FAILED: 502, AUDIT_REQUEST_REJECTED: 502, AUDIT_INVALID_RESPONSE: 502,
  AUDIT_PAGINATION_INVALID: 502, AUDIT_PAGINATION_LIMIT_EXCEEDED: 503,
  AUDIT_TABLE_NOT_CONFIGURED: 503, AUDIT_TABLE_SCHEMA_INVALID: 503, ACTION_SCHEMA_INVALID: 503,
  ACTION_FIELD_NOT_ALLOWED: 400, ACTION_STATUS_NOT_ALLOWED: 400, AUDIT_LINK_FAILED: 502,
  LEGACY_RECORD_DETECTED: 409, MIGRATION_DUPLICATE_SKIPPED: 409, MIGRATION_FAILED: 500,
  FORMAL_SCHEMA_REQUIRED: 409, MIGRATION_PREVIEW_REQUIRED: 403, MIGRATION_TOKEN_INVALID: 403,
  MIGRATION_TOKEN_EXPIRED: 410, MIGRATION_ALREADY_COMPLETED: 409, MIGRATION_PARTIAL_FAILURE: 500,
  LEGACY_AUDIT_INVALID: 409, LEGACY_DRAFT_INVALID: 409, ACTION_AUDIT_LINK_MISMATCH: 409,
  ACTION_AUDIT_ORPHAN: 409, ACTION_AUDIT_DUPLICATE: 409, REPAIR_NOT_SAFE: 409,
  REPAIR_AMBIGUOUS: 409, REPAIR_CONFIRMATION_REQUIRED: 403,
});

function isAllowedWriteOrigin(req) {
  const origin = String(req.headers?.origin || '');
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.origin === 'https://nexaeon-web.vercel.app'
      || (['localhost', '127.0.0.1'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol));
  } catch {
    return false;
  }
}

async function handleOrchestratorOperationRequest(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('CDN-Cache-Control', 'private, no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'private, no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
  }
  if (!isAllowedWriteOrigin(req)) return res.status(403).json({ ok: false, errorCode: 'ORIGIN_NOT_ALLOWED' });
  try {
    const actor = requireAdminCsrf(req, readAdminSession(req));
    const auditRepository = getProductionAuditRepository();
    let payload;
    if (req.query.operation === 'preview') payload = await createOperationPreview({ payload: req.body?.payload, req, actor, auditRepository });
    else if (req.query.operation === 'execute') payload = await executeConfirmedOperation({ body: req.body, req, actor, auditRepository });
    else if (req.query.operation === 'cancel') payload = await cancelOperation({ body: req.body, actor, auditRepository });
    else return res.status(404).json({ ok: false, errorCode: 'OPERATION_NOT_FOUND' });
    return res.status(200).json(payload);
  } catch (error) {
    const errorCode = error?.code || 'EXECUTION_FAILED';
    return res.status(OPERATION_ERROR_STATUS[errorCode] || 500).json({ ok: false, errorCode });
  }
}

function privateJson(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('CDN-Cache-Control', 'private, no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'private, no-store');
}

function adminLoginKey(req) {
  return String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 100);
}

function createRateLimitedAdminSession(req) {
  const key = adminLoginKey(req);
  const now = Date.now();
  const current = adminLoginAttempts.get(key);
  const attempt = !current || current.expiresAt <= now ? { count: 0, expiresAt: now + ADMIN_LOGIN_WINDOW_MS } : current;
  if (attempt.count >= ADMIN_LOGIN_MAX_ATTEMPTS) throw Object.assign(new Error('auth_rate_limited'), { code: 'AUTH_RATE_LIMITED' });
  try {
    const session = createAdminSession({ actorId: req.body?.actorId, accessSecret: req.body?.accessSecret });
    adminLoginAttempts.delete(key);
    return session;
  } catch (error) {
    if (error?.code === 'AUTH_INVALID_CREDENTIALS') adminLoginAttempts.set(key, { ...attempt, count: attempt.count + 1 });
    throw error;
  }
}

async function handleAdminRequest(req, res) {
  privateJson(res);
  try {
    if (req.query.admin === 'session') {
      if (req.method === 'GET') {
        const session = readAdminSession(req);
        return res.status(200).json({ ok: true, authenticated: true, actorId: session.actorId, role: session.role, expiresAt: new Date(session.expiresAt).toISOString(), csrfToken: session.csrfToken });
      }
      if (req.method === 'POST') {
        if (!isAllowedWriteOrigin(req)) return res.status(403).json({ ok: false, errorCode: 'ORIGIN_NOT_ALLOWED' });
        const session = createRateLimitedAdminSession(req);
        res.setHeader('Set-Cookie', session.cookie);
        return res.status(200).json({ ok: true, authenticated: true, actorId: session.claims.actorId, role: session.claims.role, expiresAt: new Date(session.claims.expiresAt).toISOString(), csrfToken: session.claims.csrfToken });
      }
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
    }
    if (req.query.admin === 'logout') {
      if (req.method !== 'POST') return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
      if (!isAllowedWriteOrigin(req)) return res.status(403).json({ ok: false, errorCode: 'ORIGIN_NOT_ALLOWED' });
      requireAdminCsrf(req, readAdminSession(req));
      res.setHeader('Set-Cookie', clearAdminSessionCookie());
      return res.status(200).json({ ok: true });
    }
    if (req.query.admin === 'audit') {
      if (req.method !== 'GET') return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
      const session = readAdminSession(req);
      const records = await getProductionAuditRepository().listAuditRecordsForAdmin({
        dateFrom: String(req.query.dateFrom || '').slice(0, 40), dateTo: String(req.query.dateTo || '').slice(0, 40),
        agentId: String(req.query.agentId || '').slice(0, 40), toolId: String(req.query.toolId || '').slice(0, 80),
        executionStatus: String(req.query.executionStatus || '').slice(0, 40), recordType: String(req.query.recordType || '').slice(0, 20),
        operationId: String(req.query.operationId || '').slice(0, 80), externalRecordId: String(req.query.externalRecordId || '').slice(0, 120),
        limit: Math.min(200, Number(req.query.limit) || 100),
      });
      return res.status(200).json({ ok: true, actorId: session.actorId, role: session.role, count: records.length, records });
    }
    if (req.query.admin === 'migration-preview') {
      if (req.method !== 'POST') return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
      if (!isAllowedWriteOrigin(req)) return res.status(403).json({ ok: false, errorCode: 'ORIGIN_NOT_ALLOWED' });
      const actor = requireAdminCsrf(req, readAdminSession(req));
      return res.status(200).json(await previewLegacyMigration({ actor, req }));
    }
    if (req.query.admin === 'migration-preflight') {
      if (req.method !== 'GET') return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
      const actor = readAdminSession(req);
      const payload = await inspectMigrationSafety({ actor });
      console.info(JSON.stringify({
        service: 'nexaeon-admin', category: 'migration_preflight_completed', preflightOk: payload.preflight?.ok,
        checkedWriteCount: payload.preflight?.checkedWriteCount, writesPerformed: payload.preflight?.writesPerformed,
        issues: (payload.preflight?.issues || []).map(({ code, tableRole, fieldName, actualType, expectedType }) => ({ code, tableRole, fieldName, actualType, expectedType })),
        remainingLegacyAuditCount: payload.partialWrites?.remainingLegacyAuditCount,
        remainingLegacyDraftCount: payload.partialWrites?.remainingLegacyDraftCount,
        legacyAudits: (payload.partialWrites?.legacyAudits || []).map(({ sourceRecordId, sourceOperationId, state, targetAuditRecordIds, migrationBatchIds }) => ({ sourceRecordId, sourceOperationId, state, targetAuditRecordIds, migrationBatchIds })),
        legacyDrafts: (payload.partialWrites?.drafts || []).filter(({ state, migrationBatchId }) => state === 'not-written' || migrationBatchId).map(({ sourceRecordId, operationId, state, migrationBatchId, auditLinkRecordIds }) => ({ sourceRecordId, operationId, state, migrationBatchId, auditLinkRecordIds })),
        migrationAudits: payload.partialWrites?.migrationAudits || [], duplicateAuditIds: payload.partialWrites?.duplicateAuditIds || [],
        duplicateMigrationSources: payload.partialWrites?.duplicateMigrationSources || [], persistedMigrationBatchIds: payload.partialWrites?.persistedMigrationBatchIds || [],
      }));
      return res.status(200).json(payload);
    }
    if (req.query.admin === 'migration-execute') {
      if (req.method !== 'POST') return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
      if (!isAllowedWriteOrigin(req)) return res.status(403).json({ ok: false, errorCode: 'ORIGIN_NOT_ALLOWED' });
      const actor = requireAdminCsrf(req, readAdminSession(req));
      return res.status(200).json(await executeLegacyMigration({ body: req.body, actor, req }));
    }
    if (req.query.admin === 'migration-status' || req.query.admin === 'migration-verify') {
      if (req.method !== 'GET') return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
      readAdminSession(req);
      const migrationBatchId = String(req.query.migrationBatchId || '').slice(0, 140);
      if (!migrationBatchId) return res.status(400).json({ ok: false, errorCode: 'INVALID_INPUT' });
      const payload = req.query.admin === 'migration-status' ? await getMigrationStatus({ migrationBatchId }) : await verifyMigrationBatch({ migrationBatchId });
      return res.status(200).json({ ok: true, ...payload });
    }
    if (req.query.admin === 'consistency') {
      if (req.method !== 'GET') return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
      const session = readAdminSession(req);
      const payload = await runConsistencyCheck();
      console.info(JSON.stringify({
        service: 'nexaeon-admin', category: 'consistency_check_completed',
        actionCount: payload.actionCount, auditCount: payload.auditCount, counts: payload.counts,
        results: (payload.results || []).map((item) => ({
          category: item.category, reason: item.reason || null, actionRecordId: item.actionRecordId,
          auditRecordId: item.auditRecordId, operationId: item.operationId || null,
          candidateAuditRecordIds: item.candidateAuditRecordIds || [], candidateBasis: item.candidateBasis || null,
          candidateCount: item.candidateCount || 0,
          candidateMatches: (item.candidateMatches || []).map(({ auditRecordId, matchScore, evidence }) => ({
            auditRecordId, matchScore, evidence: (evidence || []).map(({ field, match, weight }) => ({ field, match, weight })),
          })),
          recommendedAction: item.recommendedAction || null,
          currentAuditRecordId: item.currentAuditRecordId || null, expectedAuditRecordId: item.expectedAuditRecordId || null,
          lifecycleOperationId: item.lifecycleOperationId || null, lifecycleAuditRecordIds: item.lifecycleAuditRecordIds || [], duplicateBasis: item.duplicateBasis || null,
          auditId: item.auditId || null, sourceRecordId: item.sourceRecordId || null,
          auditRecordIds: item.auditRecordIds || [], actionRecordIds: item.actionRecordIds || [], safe: item.safe === true,
        })),
      }));
      return res.status(200).json({ ok: true, actorId: session.actorId, ...payload });
    }
    if (req.query.admin === 'repair-preview' || req.query.admin === 'repair-execute') {
      if (req.method !== 'POST') return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
      if (!isAllowedWriteOrigin(req)) return res.status(403).json({ ok: false, errorCode: 'ORIGIN_NOT_ALLOWED' });
      const actor = requireAdminCsrf(req, readAdminSession(req));
      const payload = req.query.admin === 'repair-preview'
        ? await previewActionAuditRepair({ issue: req.body?.issue, actor, req })
        : await executeActionAuditRepair({ body: req.body, actor, req });
      return res.status(200).json(payload);
    }
    return res.status(404).json({ ok: false, errorCode: 'ADMIN_ROUTE_NOT_FOUND' });
  } catch (error) {
    const errorCode = error?.code || 'ADMIN_REQUEST_FAILED';
    const status = OPERATION_ERROR_STATUS[errorCode] || 500;
    const details = Object.fromEntries(Object.entries({
      upstreamStatus: Number.isInteger(error?.status) ? error.status : undefined,
      airtableErrorType: error?.airtableErrorType,
      tableRole: error?.tableRole, tableName: error?.tableName, fieldName: error?.fieldName,
      actualType: error?.actualType, expectedType: error?.expectedType,
    }).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    if (status >= 500) console.error(JSON.stringify({ service: 'nexaeon-admin', category: 'admin_request_failed', adminRoute: String(req.query?.admin || '').slice(0, 40), errorCode, ...details }));
    return res.status(status).json({ ok: false, errorCode, ...(Object.keys(details).length ? { details } : {}) });
  }
}

export default async function handler(req, res) {
  if (req.query?.admin) {
    await handleAdminRequest(req, res);
    return;
  }
  if (req.query?.agent === 'networker') {
    await handleNetworkerChatRequest(req, res);
    return;
  }
  if (req.query?.agent === 'orchestrator') {
    if (req.query?.operation) {
      await handleOrchestratorOperationRequest(req, res);
      return;
    }
    await handleOrchestratorChatRequest(req, res);
    return;
  }
  if (req.query?.agent === 'engineer') {
    await handleEngineerChatRequest(req, res);
    return;
  }
  if (req.query?.agent === 'archivist') {
    await handleArchivistChatRequest(req, res);
    return;
  }
  if (req.query?.agent === 'xchange') {
    await handleXchangeChatRequest(req, res);
    return;
  }
  await handleAgentChatRequest(req, res);
}
