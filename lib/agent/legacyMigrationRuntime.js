/* global process */

import { Buffer } from 'node:buffer';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { checkActionAuditConsistency, resolveSafeRepair } from './actionAuditConsistency.js';
import { createAirtableMigrationDataSource, isLegacyAuditProject, isLegacyDraftProject, mapLegacyDraftUpdate, parseLegacyAuditProject } from './migrationDataSource.js';
import { createRequesterFingerprint, redactSecrets } from './toolExecutionRuntime.js';

export const MIGRATION_CONFIRMATION_TTL_MS = 5 * 60 * 1000;
const SOURCE_TABLE = 'Projects';
const TARGET_TABLE = 'NexAeon Tool Execution Audit';

function fail(code) { throw Object.assign(new Error(code.toLowerCase()), { code }); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function digest(value) { return createHash('sha256').update(canonical(value)).digest('hex'); }
function secret(env = process.env) {
  const value = String(env.NEXAEON_TOOL_EXECUTION_SECRET || env.AIRTABLE_API_KEY || '').trim();
  if (!value) fail('MIGRATION_TOKEN_INVALID');
  return value;
}
function encode(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function tokenFor(claims, env) {
  const encoded = encode(claims);
  return `${encoded}.${createHmac('sha256', secret(env)).update(encoded).digest('base64url')}`;
}
function readToken(token, { env = process.env, now = Date.now(), kind, actor, fingerprint }) {
  const [encoded, signature, extra] = String(token || '').split('.');
  if (!encoded || !signature || extra) fail('MIGRATION_TOKEN_INVALID');
  const expected = createHmac('sha256', secret(env)).update(encoded).digest('base64url');
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) fail('MIGRATION_TOKEN_INVALID');
  let claims;
  try { claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { fail('MIGRATION_TOKEN_INVALID'); }
  if (claims.kind !== kind || claims.actorId !== actor?.actorId || claims.actorRole !== 'admin'
    || claims.actorSessionHash !== digest(actor?.sessionId || '').slice(0, 48) || claims.requesterFingerprint !== fingerprint) fail('MIGRATION_TOKEN_INVALID');
  if (Number(claims.expiresAt) <= now) fail('MIGRATION_TOKEN_EXPIRED');
  return claims;
}

function safeJson(value) {
  const redacted = redactSecrets(value);
  const serialized = JSON.stringify(redacted).replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}\b/gu, '$1.[redacted]');
  return serialized.length <= 12_000 ? serialized : JSON.stringify({ truncated: true, preview: serialized.slice(0, 11_900) });
}

function auditFields({ auditId = randomUUID(), operationId, idempotencyKey, timestamp = new Date().toISOString(), agentId = 'system', toolId, executionStatus, actor, fingerprint, sanitizedInput = {}, sanitizedOutput = {}, externalRecordId, errorCode, duration = 0, recordType = 'formal' }) {
  return {
    'Audit ID': auditId, 'Operation ID': operationId, 'Idempotency Key': idempotencyKey, Timestamp: timestamp,
    'Agent ID': agentId, 'Tool ID': toolId, 'Permission Level': toolId === 'checkActionAuditConsistency' ? 'READ' : 'WRITE_CONFIRM',
    'Target Data Source': toolId === 'checkActionAuditConsistency' ? 'airtable-action-audit' : 'airtable-legacy-migration',
    'Action Type': toolId, 'Execution Status': executionStatus, 'Confirmation Status': executionStatus === 'previewed' ? 'pending' : 'confirmed',
    'Confirmation Timestamp': executionStatus === 'previewed' ? undefined : timestamp,
    'Actor ID': actor?.actorId || 'system', 'Actor Role': actor?.role || 'admin',
    'Actor Session Hash': digest(actor?.sessionId || '').slice(0, 48), 'Sanitized Input': safeJson(sanitizedInput),
    'Sanitized Output': safeJson(sanitizedOutput), 'External Record ID': externalRecordId || undefined,
    'Error Code': errorCode || undefined, 'Duration Ms': Math.max(0, Math.round(duration)),
    'Preview Hash': digest(sanitizedInput), 'Requester Fingerprint': fingerprint || '',
    'Audit Persistence Status': 'dedicated', 'Created At': timestamp, 'Schema Version': 'v1', 'Record Type': recordType,
  };
}

function inventory(projects, audits) {
  const migratedSources = new Set(audits.map((audit) => String(audit.sanitizedOutput?.migrationSourceRecordId || '')).filter(Boolean));
  const legacyAuditCandidates = projects.filter(isLegacyAuditProject);
  const invalidAudits = legacyAuditCandidates.filter((record) => !parseLegacyAuditProject(record));
  const validAudits = legacyAuditCandidates.map(parseLegacyAuditProject).filter(Boolean);
  const legacyDrafts = projects.map(mapLegacyDraftUpdate).filter(Boolean);
  const alreadyMigratedAudits = validAudits.filter(({ sourceRecordId }) => migratedSources.has(sourceRecordId));
  const auditsToCreate = validAudits.filter(({ sourceRecordId }) => !migratedSources.has(sourceRecordId));
  const alreadyMigratedDrafts = projects.filter((record) => String(record.fields?.['Project Name'] || '').startsWith('[Draft ')
    && String(record.fields?.['Action Draft Schema Version'] || '') === 'v1');
  return { invalidAudits, legacyAuditCandidates, legacyDrafts, alreadyMigratedAudits, alreadyMigratedDrafts, auditsToCreate };
}

function previewPayload({ projects, audits, migrationBatchId, now }) {
  const found = inventory(projects, audits);
  const auditIds = found.auditsToCreate.map(({ sourceRecordId }) => sourceRecordId);
  const draftIds = found.legacyDrafts.map(({ sourceRecordId }) => sourceRecordId);
  const warnings = [];
  for (const draft of found.legacyDrafts) {
    if (draft.fields['Operation ID'] === 'Unknown') warnings.push({ recordId: draft.sourceRecordId, code: 'MISSING_OPERATION_ID' });
    if (draft.fields['Idempotency Key'] === 'Unknown') warnings.push({ recordId: draft.sourceRecordId, code: 'MISSING_IDEMPOTENCY_KEY' });
    if (draft.consistencyStatus === 'missing-audit') warnings.push({ recordId: draft.sourceRecordId, code: 'MISSING_AUDIT_LINK' });
  }
  return {
    migrationBatchId,
    legacyAuditCount: found.legacyAuditCandidates.length,
    legacyDraftCount: found.legacyDrafts.length,
    alreadyMigratedCount: found.alreadyMigratedAudits.length + found.alreadyMigratedDrafts.length,
    duplicateSkipCount: found.alreadyMigratedAudits.length,
    invalidRecordCount: found.invalidAudits.length,
    recordsToCreate: auditIds,
    recordsToUpdate: draftIds,
    recordsToSkip: [...found.alreadyMigratedAudits.map(({ sourceRecordId }) => sourceRecordId), ...found.invalidAudits.map(({ id }) => id)],
    warnings,
    estimatedWrites: auditIds.length + draftIds.length + 2,
    rollbackSupport: false,
    destructiveChanges: false,
    sourceRecordsDeleted: false,
    primaryFieldsChanged: false,
    generatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + MIGRATION_CONFIRMATION_TTL_MS).toISOString(),
  };
}

export async function previewLegacyMigration({ actor, req, env = process.env, now = Date.now(), dataSource = createAirtableMigrationDataSource({ env }) }) {
  if (actor?.role !== 'admin') fail('AUTH_ROLE_FORBIDDEN');
  const [projects, audits] = await Promise.all([dataSource.listProjects(), dataSource.listAudits()]);
  const migrationBatchId = `migration-${new Date(now).toISOString().slice(0, 10)}-${randomUUID()}`;
  const preview = previewPayload({ projects, audits, migrationBatchId, now });
  const recordIds = [...preview.recordsToCreate, ...preview.recordsToUpdate].sort();
  const payloadHash = digest({ migrationBatchId, recordIds, preview: { ...preview, expiresAt: undefined, generatedAt: undefined } });
  const requesterFingerprint = createRequesterFingerprint(req);
  const claims = { kind: 'legacy-migration', migrationBatchId, actorId: actor.actorId, actorRole: actor.role, actorSessionHash: digest(actor.sessionId).slice(0, 48), requesterFingerprint, payloadHash, recordIds, issuedAt: now, expiresAt: now + MIGRATION_CONFIRMATION_TTL_MS };
  return { ...preview, permissionLevel: 'WRITE_CONFIRM', payloadHash, confirmationToken: tokenFor(claims, env) };
}

function mapLegacyAuditFields(legacy, { batchId, actor, fingerprint, now }) {
  const payload = redactSecrets(legacy.payload || {});
  const operationId = String(payload.operationId || 'Unknown').slice(0, 80);
  const idempotencyKey = String(payload.idempotencyKey || `legacy-source:${legacy.sourceRecordId}`).slice(0, 80);
  return auditFields({
    auditId: String(payload.auditId || `legacy:${legacy.sourceRecordId}`).slice(0, 120), operationId, idempotencyKey,
    timestamp: String(payload.timestamp || new Date(now).toISOString()).slice(0, 40), agentId: String(payload.agentId || 'Unknown').slice(0, 80),
    toolId: String(payload.toolId || 'Unknown').slice(0, 80), executionStatus: String(payload.executionStatus || 'unknown').slice(0, 80), actor,
    fingerprint, externalRecordId: String(payload.externalRecordId || '').slice(0, 120), errorCode: String(payload.errorCode || '').slice(0, 100),
    duration: payload.duration, recordType: 'legacy-migrated',
    sanitizedInput: payload.sanitizedInput || {},
    sanitizedOutput: { ...(payload.sanitizedOutput || {}), migrationSourceRecordId: legacy.sourceRecordId, migrationTimestamp: new Date(now).toISOString(), migrationBatchId: batchId, originalActorId: payload.actorId || 'Unknown', originalActorRole: payload.actorRole || 'Unknown', originalErrorMessage: payload.errorMessage || undefined },
  });
}

export async function executeLegacyMigration({ body, actor, req, env = process.env, now = Date.now(), dataSource = createAirtableMigrationDataSource({ env }) }) {
  if (actor?.role !== 'admin') fail('AUTH_ROLE_FORBIDDEN');
  if (body?.confirm !== true) fail('MIGRATION_PREVIEW_REQUIRED');
  const fingerprint = createRequesterFingerprint(req);
  const claims = readToken(body.confirmationToken, { env, now, kind: 'legacy-migration', actor, fingerprint });
  if (body.migrationBatchId !== claims.migrationBatchId || body.payloadHash !== claims.payloadHash) fail('MIGRATION_TOKEN_INVALID');
  const [projects, audits] = await Promise.all([dataSource.listProjects(), dataSource.listAudits()]);
  const previousRuns = audits.filter((audit) => audit.operationId === claims.migrationBatchId && audit.toolId === 'executeLegacyMigration');
  const completedRun = previousRuns.findLast((audit) => audit.executionStatus === 'succeeded');
  if (completedRun) return { ...(completedRun.sanitizedOutput || {}), replayed: true };
  const refreshed = previewPayload({ projects, audits, migrationBatchId: claims.migrationBatchId, now: claims.issuedAt });
  const currentRecordIds = [...refreshed.recordsToCreate, ...refreshed.recordsToUpdate].sort();
  const isResume = previousRuns.some((audit) => audit.errorCode === 'MIGRATION_PARTIAL_FAILURE' || audit.executionStatus === 'failed');
  const recordSetValid = currentRecordIds.every((id) => claims.recordIds.includes(id));
  if ((!isResume && digest(currentRecordIds) !== digest(claims.recordIds)) || (isResume && !recordSetValid)) fail('MIGRATION_TOKEN_INVALID');

  const startedAt = new Date(now).toISOString(); const started = Date.now();
  const report = { migrationBatchId: claims.migrationBatchId, startedAt, completedAt: null, sourceTable: SOURCE_TABLE, targetTable: TARGET_TABLE, attemptedCount: currentRecordIds.length, succeededCount: 0, skippedCount: refreshed.recordsToSkip.length, failedCount: 0, createdAuditRecordIds: [], updatedActionRecordIds: [], errorCodes: [], executionStatus: 'executing', dryRunHash: claims.payloadHash };
  await dataSource.createAudit(auditFields({ operationId: claims.migrationBatchId, idempotencyKey: `migration:${claims.payloadHash.slice(0, 48)}`, toolId: 'executeLegacyMigration', executionStatus: 'executing', actor, fingerprint, sanitizedInput: { migrationBatchId: claims.migrationBatchId, recordIds: claims.recordIds, dryRunHash: claims.payloadHash }, sanitizedOutput: { sourceTable: SOURCE_TABLE, targetTable: TARGET_TABLE, attemptedCount: report.attemptedCount } }));

  const found = inventory(projects, audits);
  for (const legacy of found.auditsToCreate) {
    try {
      const fields = mapLegacyAuditFields(legacy, { batchId: claims.migrationBatchId, actor, fingerprint, now: Date.now() });
      const id = await (dataSource.upsertAudit ? dataSource.upsertAudit(fields) : dataSource.createAudit(fields));
      report.createdAuditRecordIds.push(id); report.succeededCount += 1;
    } catch (error) { report.failedCount += 1; report.errorCodes.push(error?.code || 'LEGACY_AUDIT_INVALID'); }
  }
  for (const draft of found.legacyDrafts) {
    try {
      const before = projects.find(({ id }) => id === draft.sourceRecordId);
      await dataSource.updateProject(draft.sourceRecordId, draft.fields);
      if (before?.fields?.['Project Name'] !== draft.primaryField) fail('LEGACY_DRAFT_INVALID');
      report.updatedActionRecordIds.push(draft.sourceRecordId); report.succeededCount += 1;
    } catch (error) { report.failedCount += 1; report.errorCodes.push(error?.code || 'LEGACY_DRAFT_INVALID'); }
  }
  report.completedAt = new Date().toISOString(); report.durationMs = Date.now() - started;
  report.executionStatus = report.failedCount ? 'partial_failure' : 'succeeded';
  await dataSource.createAudit(auditFields({ operationId: claims.migrationBatchId, idempotencyKey: `migration:${claims.payloadHash.slice(0, 48)}`, toolId: 'executeLegacyMigration', executionStatus: report.failedCount ? 'failed' : 'succeeded', actor, fingerprint, errorCode: report.failedCount ? 'MIGRATION_PARTIAL_FAILURE' : '', duration: report.durationMs, sanitizedInput: { migrationBatchId: claims.migrationBatchId, dryRunHash: claims.payloadHash }, sanitizedOutput: report }));
  return report;
}

export async function getMigrationStatus({ migrationBatchId, dataSource = createAirtableMigrationDataSource() }) {
  const audits = await dataSource.listAudits();
  const records = audits.filter((audit) => audit.operationId === migrationBatchId && audit.toolId === 'executeLegacyMigration');
  return { migrationBatchId, status: records.at(-1)?.executionStatus || 'not-found', records: records.map(({ id, executionStatus, sanitizedOutput }) => ({ auditRecordId: id, executionStatus, report: sanitizedOutput })) };
}

export async function verifyMigrationBatch({ migrationBatchId, dataSource = createAirtableMigrationDataSource() }) {
  const [projects, audits] = await Promise.all([dataSource.listProjects(), dataSource.listAudits()]);
  const migrated = audits.filter((audit) => audit.recordType === 'legacy-migrated' && audit.sanitizedOutput?.migrationBatchId === migrationBatchId);
  const stillLegacyDrafts = projects.filter(isLegacyDraftProject);
  return { migrationBatchId, migratedAuditCount: migrated.length, remainingLegacyDraftCount: stillLegacyDrafts.length, sourceRecordsRetained: migrated.every((audit) => projects.some(({ id }) => id === audit.sanitizedOutput?.migrationSourceRecordId)), consistency: checkActionAuditConsistency({ projects, audits }) };
}

export async function runConsistencyCheck({ dataSource = createAirtableMigrationDataSource() } = {}) {
  try {
    const [projects, audits] = await Promise.all([dataSource.listProjects(), dataSource.listAudits()]);
    return checkActionAuditConsistency({ projects, audits });
  } catch (error) {
    if (error?.code) throw error;
    throw Object.assign(new Error('consistency_check_failed'), { code: 'CONSISTENCY_CHECK_FAILED' });
  }
}

export async function previewActionAuditRepair({ issue, actor, req, env = process.env, now = Date.now(), dataSource = createAirtableMigrationDataSource({ env }) }) {
  if (actor?.role !== 'admin') fail('AUTH_ROLE_FORBIDDEN');
  const [projects, audits] = await Promise.all([dataSource.listProjects(), dataSource.listAudits()]);
  const repair = resolveSafeRepair({ issue, projects, audits });
  const fingerprint = createRequesterFingerprint(req); const payloadHash = digest(repair);
  const claims = { kind: 'action-audit-repair', actorId: actor.actorId, actorRole: actor.role, actorSessionHash: digest(actor.sessionId).slice(0, 48), requesterFingerprint: fingerprint, payloadHash, repair, issuedAt: now, expiresAt: now + MIGRATION_CONFIRMATION_TTL_MS };
  return { ...repair, payloadHash, permissionLevel: 'WRITE_CONFIRM', rollbackSupport: false, expiresAt: new Date(claims.expiresAt).toISOString(), confirmationToken: tokenFor(claims, env) };
}

export async function executeActionAuditRepair({ body, actor, req, env = process.env, now = Date.now(), dataSource = createAirtableMigrationDataSource({ env }) }) {
  if (body?.confirm !== true) fail('REPAIR_CONFIRMATION_REQUIRED');
  const fingerprint = createRequesterFingerprint(req);
  const claims = readToken(body.confirmationToken, { env, now, kind: 'action-audit-repair', actor, fingerprint });
  if (claims.payloadHash !== body.payloadHash) fail('MIGRATION_TOKEN_INVALID');
  const [projects, audits] = await Promise.all([dataSource.listProjects(), dataSource.listAudits()]);
  const verified = resolveSafeRepair({ issue: { ...body.issue, repairable: true }, projects, audits });
  if (digest(verified) !== claims.payloadHash) fail('REPAIR_NOT_SAFE');
  for (const update of verified.updates) {
    if (update.target === 'action') await dataSource.updateProject(update.recordId, update.fields);
    else if (update.target === 'audit') await dataSource.updateAudit(update.recordId, update.fields);
    else fail('REPAIR_NOT_SAFE');
  }
  const repairAudit = auditFields({ auditId: `repair:${claims.payloadHash.slice(0, 64)}`, operationId: `repair:${verified.operationId}`, idempotencyKey: `repair:${claims.payloadHash.slice(0, 48)}`, toolId: 'repairActionAuditLink', executionStatus: 'succeeded', actor, fingerprint, sanitizedInput: { operationId: verified.operationId, actionRecordId: verified.actionRecordId, auditRecordId: verified.auditRecordId }, sanitizedOutput: { updatedTargets: verified.updates.map(({ target, recordId }) => ({ target, recordId })) } });
  const auditRecordId = await (dataSource.upsertAudit ? dataSource.upsertAudit(repairAudit) : dataSource.createAudit(repairAudit));
  return { ok: true, executionStatus: 'succeeded', auditRecordId, ...verified };
}
