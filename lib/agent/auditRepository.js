/* global process */

import { createHash, randomUUID } from 'node:crypto';

const API_ROOT = 'https://api.airtable.com/v0';
const LEGACY_RECORD_PREFIX = '[Audit ';
const JSON_LIMIT = 12_000;

export const AUDIT_SCHEMA_VERSION = 'v1';
export const AUDIT_RECORD_TYPE = Object.freeze({ FORMAL: 'formal', LEGACY: 'legacy', MIGRATED: 'migrated' });
export const AUDIT_FIELD_NAMES = Object.freeze([
  'Audit ID', 'Operation ID', 'Idempotency Key', 'Timestamp', 'Agent ID', 'Tool ID', 'Permission Level',
  'Target Data Source', 'Action Type', 'Execution Status', 'Confirmation Status', 'Confirmation Timestamp',
  'Actor ID', 'Actor Role', 'Actor Session Hash', 'Sanitized Input', 'Sanitized Output', 'External Record ID',
  'Error Code', 'Error Message', 'Duration Ms', 'Preview Hash', 'Requester Fingerprint',
  'Audit Persistence Status', 'Created At', 'Schema Version', 'Record Type',
]);

function clean(value, limit = 4000) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim().slice(0, limit);
}

function redactString(value, limit = 4000) {
  return clean(value, limit)
    .replace(/(?:sk-[a-z0-9_-]{8,}|(?:api[_ -]?key|authorization|cookie|password|secret|token)\s*[:=]\s*[^\s,;]+)/giu, '[redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[redacted]');
}

function sanitize(value, depth = 0) {
  if (depth > 6) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !/authorization|cookie|password|secret|token|api.?key/iu.test(key))
      .slice(0, 100)
      .map(([key, item]) => [clean(key, 100), sanitize(item, depth + 1)]));
  }
  return typeof value === 'string' ? redactString(value) : value;
}

function safeJson(value) {
  const serialized = JSON.stringify(sanitize(value ?? {}));
  return serialized.length <= JSON_LIMIT ? serialized : JSON.stringify({ truncated: true, preview: serialized.slice(0, JSON_LIMIT - 40) });
}

function parseJson(value) {
  try { return sanitize(JSON.parse(String(value || '{}'))); } catch { return {}; }
}

export function hashActorSession(sessionId) {
  return sessionId ? createHash('sha256').update(String(sessionId)).digest('hex').slice(0, 48) : '';
}

export function normalizeAuditRecord(record = {}) {
  const confirmationStatus = clean(record.confirmationStatus, 40)
    || (record.userConfirmation ? 'confirmed' : record.executionStatus === 'previewed' ? 'pending' : 'not_required');
  return {
    auditId: clean(record.auditId || randomUUID(), 80),
    auditRecordId: clean(record.auditRecordId, 120) || null,
    operationId: clean(record.operationId, 80),
    idempotencyKey: clean(record.idempotencyKey, 80),
    timestamp: clean(record.timestamp || new Date().toISOString(), 40),
    agentId: clean(record.agentId, 40),
    toolId: clean(record.toolId, 80),
    permissionLevel: clean(record.permissionLevel, 40),
    targetDataSource: clean(record.targetDataSource, 100),
    actionType: clean(record.actionType, 40),
    executionStatus: clean(record.executionStatus, 40),
    confirmationStatus,
    confirmationTimestamp: record.confirmationTimestamp ? clean(record.confirmationTimestamp, 40) : null,
    actorId: clean(record.actorId, 160),
    actorRole: clean(record.actorRole, 40),
    actorSessionHash: clean(record.actorSessionHash || hashActorSession(record.actorSessionId), 80),
    sanitizedInput: sanitize(record.sanitizedInput || {}),
    sanitizedOutput: sanitize(record.sanitizedOutput || {}),
    externalRecordId: clean(record.externalRecordId, 120) || null,
    errorCode: clean(record.errorCode, 100) || null,
    errorMessage: redactString(record.errorMessage, 1000) || null,
    duration: Math.max(0, Math.round(Number(record.duration) || 0)),
    previewHash: clean(record.previewHash, 80),
    requesterFingerprint: clean(record.requesterFingerprint, 80),
    auditPersistenceStatus: clean(record.auditPersistenceStatus || 'dedicated', 40),
    createdAt: clean(record.createdAt || record.timestamp || new Date().toISOString(), 40),
    schemaVersion: clean(record.schemaVersion || AUDIT_SCHEMA_VERSION, 20),
    recordType: clean(record.recordType || AUDIT_RECORD_TYPE.FORMAL, 20),
    replayed: Boolean(record.replayed),
    source: clean(record.source || 'server', 80),
  };
}

export function validateAuditSchema(fieldNames) {
  const existing = new Set(fieldNames || []);
  const missing = AUDIT_FIELD_NAMES.filter((name) => !existing.has(name));
  if (missing.length) throw Object.assign(new Error('audit_table_schema_invalid'), { code: 'AUDIT_TABLE_SCHEMA_INVALID', missing });
  return true;
}

export function createMemoryAuditRepository(seed = []) {
  const records = seed.map(normalizeAuditRecord);
  const executionClaims = new Set(records.filter((record) => record.source === 'xchange-execution-claim').map((record) => record.operationId));
  return {
    async createAuditRecord(record) {
      const normalized = normalizeAuditRecord(record);
      records.push(normalized);
      return { auditRecordId: normalized.auditId, record: normalized, persistence: 'memory' };
    },
    async updateAuditExecutionResult(operationId, patch) { return this.createAuditRecord({ ...patch, operationId }); },
    async acquireExecutionLock(record) {
      const normalized = normalizeAuditRecord(record);
      if (executionClaims.has(normalized.operationId)) return { acquired: false, persistence: 'memory' };
      executionClaims.add(normalized.operationId);
      records.push(normalized);
      return { acquired: true, auditRecordId: normalized.auditId, record: normalized, persistence: 'memory' };
    },
    async getAuditRecord(id) { return records.find((record) => record.auditId === id || record.operationId === id) || null; },
    async getAuditRecordByOperationId(operationId) { return records.findLast((record) => record.operationId === operationId) || null; },
    async getAuditRecordByIdempotencyKey(idempotencyKey) { return records.findLast((record) => record.idempotencyKey === idempotencyKey) || null; },
    async getAuditLifecycleByOperationId(operationId) { return records.filter((record) => record.operationId === operationId).sort((a, b) => a.timestamp.localeCompare(b.timestamp)); },
    async listAuditRecords(filters = {}) { return listMatching(records, filters); },
    async listAuditRecordsForAdmin(filters = {}) { return listMatching(records, filters); },
  };
}

function boundedLimit(value) { return Math.min(200, Math.max(1, Number(value) || 50)); }

function matches(record, filters) {
  if (filters.agentId && record.agentId !== filters.agentId) return false;
  if (filters.toolId && record.toolId !== filters.toolId) return false;
  if (filters.executionStatus && record.executionStatus !== filters.executionStatus) return false;
  if (filters.recordType && record.recordType !== filters.recordType) return false;
  if (filters.operationId && !record.operationId.toLowerCase().includes(String(filters.operationId).toLowerCase())) return false;
  if (filters.externalRecordId && !String(record.externalRecordId || '').toLowerCase().includes(String(filters.externalRecordId).toLowerCase())) return false;
  if (filters.dateFrom && record.timestamp < filters.dateFrom) return false;
  if (filters.dateTo && record.timestamp > filters.dateTo) return false;
  return true;
}

function listMatching(records, filters) {
  return records.filter((record) => matches(record, filters)).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, boundedLimit(filters.limit));
}

function airtableConfig(env) {
  const apiKey = clean(env.AIRTABLE_API_KEY, 512);
  const baseId = clean(env.AIRTABLE_BASE_ID, 100);
  const auditTableId = clean(env.AIRTABLE_AUDIT_TABLE_ID, 100);
  const projectsTableId = clean(env.AIRTABLE_PROJECTS_TABLE_ID, 100);
  if (!auditTableId) throw Object.assign(new Error('audit_table_not_configured'), { code: 'AUDIT_TABLE_NOT_CONFIGURED' });
  if (!apiKey || !baseId) throw Object.assign(new Error('audit_configuration_missing'), { code: 'AUDIT_CONFIGURATION_MISSING' });
  return { apiKey, baseId, auditTableId, projectsTableId };
}

async function request(url, options, fetchImpl, context = {}) {
  let response;
  try { response = await fetchImpl(url, options); } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    throw Object.assign(new Error('audit_request_failed'), { code: timeout ? 'AUDIT_TIMEOUT' : 'AUDIT_REQUEST_FAILED', tableRole: context.tableRole, pageNumber: context.pageNumber });
  }
  if (!response.ok) {
    const code = response.status === 422 ? 'AUDIT_TABLE_SCHEMA_INVALID' : 'AUDIT_REQUEST_REJECTED';
    throw Object.assign(new Error('audit_request_rejected'), { code, status: response.status });
  }
  return response.json();
}

function toAirtableFields(record) {
  return {
    'Audit ID': record.auditId,
    'Operation ID': record.operationId,
    'Idempotency Key': record.idempotencyKey,
    Timestamp: record.timestamp,
    'Agent ID': record.agentId,
    'Tool ID': record.toolId,
    'Permission Level': record.permissionLevel || undefined,
    'Target Data Source': record.targetDataSource,
    'Action Type': record.actionType || undefined,
    'Execution Status': record.executionStatus || undefined,
    'Confirmation Status': record.confirmationStatus || undefined,
    'Confirmation Timestamp': record.confirmationTimestamp || undefined,
    'Actor ID': record.actorId,
    'Actor Role': record.actorRole || undefined,
    'Actor Session Hash': record.actorSessionHash,
    'Sanitized Input': safeJson(record.sanitizedInput),
    'Sanitized Output': safeJson(record.sanitizedOutput),
    'External Record ID': record.externalRecordId || undefined,
    'Error Code': record.errorCode || undefined,
    'Error Message': record.errorMessage || undefined,
    'Duration Ms': record.duration,
    'Preview Hash': record.previewHash,
    'Requester Fingerprint': record.requesterFingerprint,
    'Audit Persistence Status': record.auditPersistenceStatus || 'dedicated',
    'Created At': record.createdAt,
    'Schema Version': record.schemaVersion,
    'Record Type': record.recordType,
  };
}

function removeUndefined(fields) { return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== '')); }

function fromAirtableRecord(item) {
  const fields = item.fields || {};
  return normalizeAuditRecord({
    auditId: fields['Audit ID'], auditRecordId: item.id, operationId: fields['Operation ID'], idempotencyKey: fields['Idempotency Key'],
    timestamp: fields.Timestamp, agentId: fields['Agent ID'], toolId: fields['Tool ID'], permissionLevel: fields['Permission Level'],
    targetDataSource: fields['Target Data Source'], actionType: fields['Action Type'], executionStatus: fields['Execution Status'],
    confirmationStatus: fields['Confirmation Status'], confirmationTimestamp: fields['Confirmation Timestamp'],
    actorId: fields['Actor ID'], actorRole: fields['Actor Role'], actorSessionHash: fields['Actor Session Hash'],
    sanitizedInput: parseJson(fields['Sanitized Input']), sanitizedOutput: parseJson(fields['Sanitized Output']),
    externalRecordId: fields['External Record ID'], errorCode: fields['Error Code'], errorMessage: fields['Error Message'],
    duration: fields['Duration Ms'], previewHash: fields['Preview Hash'], requesterFingerprint: fields['Requester Fingerprint'],
    auditPersistenceStatus: fields['Audit Persistence Status'], createdAt: fields['Created At'], schemaVersion: fields['Schema Version'],
    recordType: fields['Record Type'],
  });
}

function fromLegacyRecord(item) {
  const parsed = parseJson(item.fields?.['Public Summary']);
  return normalizeAuditRecord({ ...parsed, auditRecordId: item.id, actorSessionHash: hashActorSession(parsed.actorSessionId), actorSessionId: undefined, schemaVersion: 'legacy', recordType: AUDIT_RECORD_TYPE.LEGACY, auditPersistenceStatus: 'legacy_projects', source: 'projects-hidden-record' });
}

export function createAirtableAuditRepository({ env = process.env, fetchImpl = fetch, timeoutMs = 8_000 } = {}) {
  const cfg = airtableConfig(env);
  const auditUrl = `${API_ROOT}/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.auditTableId)}`;
  const headers = { Authorization: `Bearer ${cfg.apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' };

  async function append(record) {
    const normalized = normalizeAuditRecord(record);
    const result = await request(auditUrl, {
      method: 'POST', headers, signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ records: [{ fields: removeUndefined(toAirtableFields(normalized)) }], typecast: false }),
    }, fetchImpl);
    const auditRecordId = result.records?.[0]?.id;
    if (!auditRecordId) throw Object.assign(new Error('audit_invalid_response'), { code: 'AUDIT_INVALID_RESPONSE' });
    return { auditRecordId, record: normalized, persistence: 'airtable-dedicated' };
  }

  async function listPages(url, { tableRole, filterByFormula = '' }) {
    const records = [];
    let offset = '';
    let pageNumber = 0;
    const seenOffsets = new Set();
    do {
      pageNumber += 1;
      const query = new URL(url);
      query.searchParams.set('pageSize', '100');
      if (filterByFormula) query.searchParams.set('filterByFormula', filterByFormula);
      if (offset) query.searchParams.set('offset', offset);
      const page = await request(query, { headers, signal: AbortSignal.timeout(timeoutMs) }, fetchImpl, { tableRole, pageNumber });
      if (!page || typeof page !== 'object' || !Array.isArray(page.records)) throw Object.assign(new Error('audit_invalid_response'), { code: 'AUDIT_INVALID_RESPONSE', tableRole, pageNumber });
      if (page.offset !== undefined && typeof page.offset !== 'string') throw Object.assign(new Error('audit_invalid_response'), { code: 'AUDIT_INVALID_RESPONSE', tableRole, pageNumber });
      records.push(...page.records);
      const nextOffset = page.offset || '';
      if (nextOffset && seenOffsets.has(nextOffset)) throw Object.assign(new Error('audit_pagination_invalid'), { code: 'AUDIT_PAGINATION_INVALID', tableRole, pageNumber });
      if (nextOffset) seenOffsets.add(nextOffset);
      offset = nextOffset;
      if (offset && records.length >= 1000) throw Object.assign(new Error('audit_pagination_limit'), { code: 'AUDIT_PAGINATION_LIMIT_EXCEEDED', tableRole, pageNumber });
    } while (offset);
    return records;
  }

  async function listDedicated() {
    return (await listPages(auditUrl, { tableRole: 'audit' })).map(fromAirtableRecord);
  }

  async function listLegacy() {
    if (!cfg.projectsTableId) return [];
    const url = `${API_ROOT}/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.projectsTableId)}`;
    const formula = `LEFT({Project Name}, ${LEGACY_RECORD_PREFIX.length})=${JSON.stringify(LEGACY_RECORD_PREFIX)}`;
    return (await listPages(url, { tableRole: 'projects', filterByFormula: formula })).map(fromLegacyRecord);
  }

  const repository = {
    createAuditRecord: append,
    async updateAuditExecutionResult(operationId, patch) { return append({ ...patch, operationId }); },
    async acquireExecutionLock(record) {
      const normalized = normalizeAuditRecord(record);
      const result = await request(auditUrl, {
        method: 'POST', headers, signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          performUpsert: { fieldsToMergeOn: ['Audit ID'] },
          records: [{ fields: removeUndefined(toAirtableFields(normalized)) }],
          typecast: false,
        }),
      }, fetchImpl);
      const auditRecordId = result.records?.[0]?.id;
      if (!auditRecordId) throw Object.assign(new Error('audit_invalid_response'), { code: 'AUDIT_INVALID_RESPONSE' });
      const acquired = Array.isArray(result.createdRecords) && result.createdRecords.includes(auditRecordId);
      const updated = Array.isArray(result.updatedRecords) && result.updatedRecords.includes(auditRecordId);
      if (!acquired && !updated) throw Object.assign(new Error('audit_invalid_response'), { code: 'AUDIT_INVALID_RESPONSE' });
      return { acquired, auditRecordId, record: normalized, persistence: 'airtable-dedicated' };
    },
    async getAuditRecord(id) {
      const records = await listDedicated();
      return records.find((record) => record.auditId === id || record.operationId === id) || null;
    },
    async getAuditRecordByOperationId(operationId) { return listMatching((await listDedicated()).filter((record) => record.operationId === operationId), { limit: 1 })[0] || null; },
    async getAuditRecordByIdempotencyKey(idempotencyKey) { return listMatching((await listDedicated()).filter((record) => record.idempotencyKey === idempotencyKey), { limit: 1 })[0] || null; },
    async getAuditLifecycleByOperationId(operationId) { return (await listDedicated()).filter((record) => record.operationId === operationId).sort((a, b) => a.timestamp.localeCompare(b.timestamp)); },
    async listAuditRecords(filters = {}) { return this.listAuditRecordsForAdmin(filters); },
    async listAuditRecordsForAdmin(filters = {}) {
      const [formal, legacy] = await Promise.all([
        filters.recordType === 'legacy' ? [] : listDedicated(),
        filters.recordType === 'formal' ? [] : listLegacy(),
      ]);
      return listMatching([...formal, ...legacy], filters);
    },
  };
  return repository;
}

export function getProductionAuditRepository(options = {}) { return createAirtableAuditRepository(options); }
