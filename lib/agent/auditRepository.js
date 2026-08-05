/* global process */

import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';

const API_ROOT = 'https://api.airtable.com/v0';
const LEGACY_RECORD_PREFIX = '[Audit ';
export const AUDIT_JSON_BYTE_LIMIT = 12_000;
const VALIDATION_SNAPSHOT_DATA_LIMIT = 11_000;

export const AUDIT_SCHEMA_VERSION = 'v1';
export const AUDIT_RECORD_TYPE = Object.freeze({ FORMAL: 'formal', LEGACY: 'legacy', MIGRATED: 'migrated' });
export const AUDIT_SELECT_VALUES = Object.freeze({
  'Permission Level': Object.freeze(['READ', 'WRITE_CONFIRM', 'RESTRICTED']),
  'Action Type': Object.freeze(['create', 'read', 'update', 'delete', 'execute']),
  'Execution Status': Object.freeze(['previewed', 'executing', 'succeeded', 'failed', 'expired', 'cancelled']),
  'Confirmation Status': Object.freeze(['pending', 'confirmed', 'not_required', 'cancelled', 'superseded']),
  'Audit Persistence Status': Object.freeze(['dedicated', 'airtable-dedicated', 'fallback_log', 'legacy_projects']),
  'Schema Version': Object.freeze(['v1', 'legacy']),
  'Record Type': Object.freeze(Object.values(AUDIT_RECORD_TYPE)),
});
const AUDIT_SELECT_ALLOWLISTS = Object.freeze(Object.fromEntries(
  Object.entries(AUDIT_SELECT_VALUES).map(([fieldName, values]) => [fieldName, new Set(values)]),
));
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

function safeDiagnosticString(value, limit = 1000) {
  return redactString(value, limit);
}

function parseAirtableResponse(rawBody) {
  if (!rawBody) return { payload: {}, responseJsonInvalid: true };
  try { return { payload: JSON.parse(rawBody), responseJsonInvalid: false }; }
  catch { return { payload: {}, responseJsonInvalid: true }; }
}

function airtableErrorDetails(payload, rawBody) {
  const upstreamError = payload?.error;
  const airtableErrorType = safeDiagnosticString(typeof upstreamError === 'string' ? upstreamError : upstreamError?.type, 100);
  const airtableErrorMessage = safeDiagnosticString(typeof upstreamError === 'object' ? upstreamError?.message : '', 1000);
  const safeResponseBody = upstreamError && typeof upstreamError === 'object'
    ? JSON.stringify({ error: { type: airtableErrorType || null, message: airtableErrorMessage || null } })
    : safeDiagnosticString(rawBody, 1000);
  return {
    airtableErrorType,
    airtableErrorMessage,
    airtableResponseBody: safeResponseBody || null,
    airtableResponseBodyBytes: auditUtf8Bytes(rawBody),
    airtableResponseBodyHash: createHash('sha256').update(String(rawBody || '')).digest('hex').slice(0, 24),
  };
}

function logAirtableRejection(logger, response, context, details, diagnosticReason) {
  try {
    logger(JSON.stringify({
      service: 'nexaeon-audit', category: 'airtable_request_rejected',
      httpStatus: Number(response.status) || null, tableRole: context.tableRole || null,
      operation: context.operation || null, airtableErrorType: details.airtableErrorType || null,
      airtableErrorMessage: details.airtableErrorMessage || null,
      airtableResponseBody: details.airtableResponseBody,
      airtableResponseBodyBytes: details.airtableResponseBodyBytes,
      airtableResponseBodyHash: details.airtableResponseBodyHash,
      diagnosticReason, fieldNames: Array.isArray(context.fieldNames) ? context.fieldNames.slice(0, 50) : [],
      fieldByteSizes: context.fieldByteSizes || {}, requestBodyBytes: Number(context.requestBodyBytes) || null,
    }));
  } catch { /* diagnostics must never alter fail-closed behavior */ }
}

export function sanitizeAuditValue(value, depth = 0, path = []) {
  if (depth > 6) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 100).map((item, index) => sanitizeAuditValue(item, depth + 1, [...path, String(index)]));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => ['tokenUsage', 'inputTokens', 'outputTokens', 'totalTokens'].includes(key) || !/authorization|cookie|password|secret|token|api.?key/iu.test(key))
      .slice(0, 100)
      .map(([key, item]) => {
        const safeKey = clean(key, 100);
        return [safeKey, sanitizeAuditValue(item, depth + 1, [...path, safeKey])];
      }));
  }
  const isPackedValidationData = path.at(-2) === 'validationSnapshot' && path.at(-1) === 'data';
  return typeof value === 'string' ? redactString(value, isPackedValidationData ? VALIDATION_SNAPSHOT_DATA_LIMIT : 4000) : value;
}

export function auditUtf8Bytes(value) {
  return Buffer.byteLength(String(value ?? ''), 'utf8');
}

function compactOversizedJson(value, originalBytes) {
  const object = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const scalarSummary = Object.fromEntries(Object.entries(object)
    .filter(([, item]) => item === null || ['string', 'number', 'boolean'].includes(typeof item))
    .slice(0, 30)
    .map(([key, item]) => [key, typeof item === 'string' ? redactString(item, 240) : item]));
  return {
    compacted: true,
    compactReason: 'utf8_byte_limit',
    originalBytes,
    preserved: scalarSummary,
    omittedKeys: Object.keys(object).filter((key) => !(key in scalarSummary)).slice(0, 100),
  };
}

export function safeAuditJson(value) {
  const sanitized = sanitizeAuditValue(value ?? {});
  const serialized = JSON.stringify(sanitized);
  if (auditUtf8Bytes(serialized) <= AUDIT_JSON_BYTE_LIMIT) return serialized;
  const compacted = JSON.stringify(compactOversizedJson(sanitized, auditUtf8Bytes(serialized)));
  if (auditUtf8Bytes(compacted) <= AUDIT_JSON_BYTE_LIMIT) return compacted;
  return JSON.stringify({ compacted: true, compactReason: 'utf8_byte_limit', originalBytes: auditUtf8Bytes(serialized) });
}

function parseJson(value) {
  try { return sanitizeAuditValue(JSON.parse(String(value || '{}'))); } catch { return {}; }
}

export function hashActorSession(sessionId) {
  return sessionId ? createHash('sha256').update(String(sessionId)).digest('hex').slice(0, 48) : '';
}

export function normalizeAuditSelectValue(fieldName, value, { optional = true } = {}) {
  const allowlist = AUDIT_SELECT_ALLOWLISTS[fieldName];
  if (!allowlist) throw Object.assign(new Error('audit_select_field_unknown'), {
    code: 'AUDIT_SELECT_FIELD_UNKNOWN', fieldName,
  });
  if ((value === undefined || value === null || value === '') && optional) return '';
  if (typeof value !== 'string' || !allowlist.has(value)) {
    throw Object.assign(new Error('audit_select_value_invalid'), {
      code: 'AUDIT_SELECT_VALUE_INVALID', fieldName, valueType: Array.isArray(value) ? 'array' : typeof value,
    });
  }
  return value;
}

export function normalizeAuditRecord(record = {}) {
  const confirmationStatus = record.confirmationStatus
    || (record.userConfirmation ? 'confirmed' : record.executionStatus === 'previewed' ? 'pending' : 'not_required');
  return {
    auditId: clean(record.auditId || randomUUID(), 80),
    auditRecordId: clean(record.auditRecordId, 120) || null,
    operationId: clean(record.operationId, 80),
    idempotencyKey: clean(record.idempotencyKey, 80),
    timestamp: clean(record.timestamp || new Date().toISOString(), 40),
    agentId: clean(record.agentId, 40),
    toolId: clean(record.toolId, 80),
    permissionLevel: normalizeAuditSelectValue('Permission Level', record.permissionLevel),
    targetDataSource: clean(record.targetDataSource, 100),
    actionType: normalizeAuditSelectValue('Action Type', record.actionType),
    executionStatus: normalizeAuditSelectValue('Execution Status', record.executionStatus),
    confirmationStatus: normalizeAuditSelectValue('Confirmation Status', confirmationStatus),
    confirmationTimestamp: record.confirmationTimestamp ? clean(record.confirmationTimestamp, 40) : null,
    actorId: clean(record.actorId, 160),
    actorRole: clean(record.actorRole, 40),
    actorSessionHash: clean(record.actorSessionHash || hashActorSession(record.actorSessionId), 80),
    sanitizedInput: sanitizeAuditValue(record.sanitizedInput || {}),
    sanitizedOutput: sanitizeAuditValue(record.sanitizedOutput || {}),
    externalRecordId: clean(record.externalRecordId, 120) || null,
    errorCode: clean(record.errorCode, 100) || null,
    errorMessage: redactString(record.errorMessage, 1000) || null,
    duration: Math.max(0, Math.round(Number(record.duration) || 0)),
    previewHash: clean(record.previewHash, 80),
    requesterFingerprint: clean(record.requesterFingerprint, 80),
    auditPersistenceStatus: normalizeAuditSelectValue('Audit Persistence Status', record.auditPersistenceStatus || 'dedicated', { optional: false }),
    createdAt: clean(record.createdAt || record.timestamp || new Date().toISOString(), 40),
    schemaVersion: normalizeAuditSelectValue('Schema Version', record.schemaVersion || AUDIT_SCHEMA_VERSION, { optional: false }),
    recordType: normalizeAuditSelectValue('Record Type', record.recordType || AUDIT_RECORD_TYPE.FORMAL, { optional: false }),
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
    throw Object.assign(new Error('audit_request_failed'), {
      code: timeout ? 'AUDIT_TIMEOUT' : 'AUDIT_REQUEST_FAILED', tableRole: context.tableRole,
      pageNumber: context.pageNumber, operation: context.operation, diagnosticReason: timeout ? 'request_timeout' : 'network_failure',
    });
  }
  let rawBody = '';
  let payload;
  let responseJsonInvalid = false;
  if (typeof response.text === 'function') {
    try { rawBody = await response.text(); }
    catch {
      throw Object.assign(new Error('audit_invalid_response'), {
        code: 'AUDIT_INVALID_RESPONSE', status: response.status, operation: context.operation,
        diagnosticReason: 'response_body_read_failed',
      });
    }
    ({ payload, responseJsonInvalid } = parseAirtableResponse(rawBody));
  } else {
    // Compatibility for injected test doubles; real Fetch responses always use text() above.
    try { payload = await response.json(); rawBody = JSON.stringify(payload); }
    catch { payload = {}; responseJsonInvalid = true; }
  }
  if (response.ok && responseJsonInvalid) throw Object.assign(new Error('audit_invalid_response'), {
    code: 'AUDIT_INVALID_RESPONSE', status: response.status, operation: context.operation, diagnosticReason: 'invalid_json',
  });
  if (!response.ok) {
    const details = airtableErrorDetails(payload, rawBody);
    const { airtableErrorType, airtableErrorMessage: upstreamMessage } = details;
    let diagnosticReason = 'request_rejected';
    if (responseJsonInvalid) diagnosticReason = 'invalid_json';
    else if (response.status === 401) diagnosticReason = 'authentication_failed';
    else if (response.status === 403) diagnosticReason = 'permission_denied';
    else if (response.status === 404) diagnosticReason = 'base_or_table_not_found';
    else if ([413, 422].includes(response.status) && /request(?: body)?[^.]{0,30}(?:too large|exceed)|payload too large|entity too large/iu.test(`${airtableErrorType} ${upstreamMessage}`)) diagnosticReason = 'request_body_too_large';
    else if (response.status === 422 && /too (?:long|large)|max(?:imum)?.{0,20}(?:length|size)|exceed.{0,20}(?:character|byte|size)|string_too_long/iu.test(`${airtableErrorType} ${upstreamMessage}`)) diagnosticReason = 'field_too_large';
    else if (response.status === 422 && /unknown field|field.*not found/iu.test(`${airtableErrorType} ${upstreamMessage}`)) diagnosticReason = 'unknown_field';
    else if (response.status === 422 && /invalid_multiple_choice_options|select.{0,20}(?:option|choice)|(?:option|choice).{0,20}(?:invalid|not found)/iu.test(`${airtableErrorType} ${upstreamMessage}`)) diagnosticReason = 'select_option_invalid';
    else if (response.status === 422 && /invalid_date|invalid_datetime|date(?:time)?.{0,20}invalid/iu.test(`${airtableErrorType} ${upstreamMessage}`)) diagnosticReason = 'invalid_datetime';
    else if (response.status === 422 && /invalid_json|invalid.{0,20}json|json.{0,20}(?:invalid|parse|malformed)/iu.test(`${airtableErrorType} ${upstreamMessage}`)) diagnosticReason = 'invalid_json';
    else if (response.status === 422 && /fieldsToMergeOn|merge field|computed field/iu.test(`${airtableErrorType} ${upstreamMessage}`)) diagnosticReason = 'merge_field_invalid';
    else if (response.status === 422 && /performUpsert|parameter validation|invalid request/iu.test(`${airtableErrorType} ${upstreamMessage}`)) diagnosticReason = 'upsert_payload_invalid';
    else if (response.status === 422 && /cannot accept|field type|type mismatch|invalid.*value/iu.test(`${airtableErrorType} ${upstreamMessage}`)) diagnosticReason = 'field_type_invalid';
    else if (response.status === 422) diagnosticReason = 'general_422';
    else if (response.status === 429) diagnosticReason = 'rate_limited';
    const fieldNames = Array.isArray(context.fieldNames) ? context.fieldNames.slice(0, 50) : [];
    const rejectedFieldNames = fieldNames.filter((fieldName) => upstreamMessage.toLowerCase().includes(String(fieldName).toLowerCase()));
    logAirtableRejection(context.logger || console.error, response, context, details, diagnosticReason);
    throw Object.assign(new Error('audit_request_rejected'), {
      code: response.status === 422 ? 'AUDIT_SCHEMA_INVALID' : 'AUDIT_REQUEST_REJECTED', status: response.status,
      airtableErrorType, diagnosticReason, tableRole: context.tableRole, operation: context.operation,
      airtableErrorMessage: details.airtableErrorMessage,
      airtableResponseBody: details.airtableResponseBody,
      airtableResponseBodyBytes: details.airtableResponseBodyBytes,
      airtableResponseBodyHash: details.airtableResponseBodyHash,
      fieldNames: fieldNames.length ? fieldNames : undefined,
      rejectedFieldNames: rejectedFieldNames.length ? rejectedFieldNames : undefined,
      fieldByteSizes: context.fieldByteSizes,
      requestBodyBytes: context.requestBodyBytes,
    });
  }
  return payload;
}

export function toAirtableFields(record) {
  const sanitizedOutput = { ...record.sanitizedOutput, source: record.source };
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
    'Sanitized Input': safeAuditJson(record.sanitizedInput),
    'Sanitized Output': safeAuditJson(sanitizedOutput),
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

export function fromAirtableRecord(item) {
  const fields = item.fields || {};
  const sanitizedOutput = parseJson(fields['Sanitized Output']);
  return normalizeAuditRecord({
    auditId: fields['Audit ID'], auditRecordId: item.id, operationId: fields['Operation ID'], idempotencyKey: fields['Idempotency Key'],
    timestamp: fields.Timestamp, agentId: fields['Agent ID'], toolId: fields['Tool ID'], permissionLevel: fields['Permission Level'],
    targetDataSource: fields['Target Data Source'], actionType: fields['Action Type'], executionStatus: fields['Execution Status'],
    confirmationStatus: fields['Confirmation Status'], confirmationTimestamp: fields['Confirmation Timestamp'],
    actorId: fields['Actor ID'], actorRole: fields['Actor Role'], actorSessionHash: fields['Actor Session Hash'],
    sanitizedInput: parseJson(fields['Sanitized Input']), sanitizedOutput,
    externalRecordId: fields['External Record ID'], errorCode: fields['Error Code'], errorMessage: fields['Error Message'],
    duration: fields['Duration Ms'], previewHash: fields['Preview Hash'], requesterFingerprint: fields['Requester Fingerprint'],
    auditPersistenceStatus: fields['Audit Persistence Status'], createdAt: fields['Created At'], schemaVersion: fields['Schema Version'],
    recordType: fields['Record Type'], source: sanitizedOutput.source,
  });
}

function recordIds(items) {
  if (!Array.isArray(items)) return null;
  return items.map((item) => clean(typeof item === 'string' ? item : item?.id, 120)).filter(Boolean);
}

function fromLegacyRecord(item) {
  const parsed = parseJson(item.fields?.['Public Summary']);
  return normalizeAuditRecord({ ...parsed, auditRecordId: item.id, actorSessionHash: hashActorSession(parsed.actorSessionId), actorSessionId: undefined, schemaVersion: 'legacy', recordType: AUDIT_RECORD_TYPE.LEGACY, auditPersistenceStatus: 'legacy_projects', source: 'projects-hidden-record' });
}

export function createAirtableAuditRepository({ env = process.env, fetchImpl = fetch, timeoutMs = 8_000, logger = console.error } = {}) {
  const cfg = airtableConfig(env);
  const auditUrl = `${API_ROOT}/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.auditTableId)}`;
  const headers = { Authorization: `Bearer ${cfg.apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' };

  async function append(record) {
    const normalized = normalizeAuditRecord(record);
    const fields = removeUndefined(toAirtableFields(normalized));
    const requestBody = JSON.stringify({ records: [{ fields }], typecast: false });
    const fieldByteSizes = Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, auditUtf8Bytes(value)]));
    const result = await request(auditUrl, {
      method: 'POST', headers, signal: AbortSignal.timeout(timeoutMs),
      body: requestBody,
    }, fetchImpl, {
      tableRole: 'audit', operation: 'append_audit_record', fieldNames: Object.keys(fields),
      fieldByteSizes, requestBodyBytes: auditUtf8Bytes(requestBody), logger,
    });
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
      const page = await request(query, { headers, signal: AbortSignal.timeout(timeoutMs) }, fetchImpl, { tableRole, pageNumber, operation: 'list_audit_records', logger });
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
      const fields = removeUndefined(toAirtableFields(normalized));
      const requestBody = JSON.stringify({
        performUpsert: { fieldsToMergeOn: ['Audit ID'] },
        records: [{ fields }],
        typecast: false,
      });
      let result;
      try {
        result = await request(auditUrl, {
          method: 'PATCH', headers, signal: AbortSignal.timeout(timeoutMs),
          body: requestBody,
        }, fetchImpl, {
          tableRole: 'audit', operation: 'acquire_execution_lock', fieldNames: Object.keys(fields),
          fieldByteSizes: Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, auditUtf8Bytes(value)])),
          requestBodyBytes: auditUtf8Bytes(requestBody), logger,
        });
      } catch (error) {
        throw Object.assign(new Error('audit_lock_failed'), {
          code: 'AUDIT_LOCK_FAILED', causeCode: error?.code || 'AUDIT_REQUEST_FAILED', status: error?.status,
          airtableErrorType: error?.airtableErrorType, diagnosticReason: error?.diagnosticReason || 'lock_request_failed',
          airtableErrorMessage: error?.airtableErrorMessage, airtableResponseBody: error?.airtableResponseBody,
          airtableResponseBodyBytes: error?.airtableResponseBodyBytes, airtableResponseBodyHash: error?.airtableResponseBodyHash,
          tableRole: error?.tableRole || 'audit', operation: 'acquire_execution_lock', fieldNames: error?.fieldNames,
          rejectedFieldNames: error?.rejectedFieldNames, fieldByteSizes: error?.fieldByteSizes,
          requestBodyBytes: error?.requestBodyBytes,
        });
      }
      const auditRecordId = result.records?.[0]?.id;
      if (!auditRecordId) throw Object.assign(new Error('audit_lock_failed'), { code: 'AUDIT_LOCK_FAILED', causeCode: 'AUDIT_INVALID_RESPONSE', diagnosticReason: 'missing_record_id', operation: 'acquire_execution_lock' });
      const createdRecordIds = recordIds(result.createdRecords);
      const updatedRecordIds = recordIds(result.updatedRecords);
      if (!createdRecordIds || !updatedRecordIds) throw Object.assign(new Error('audit_lock_failed'), { code: 'AUDIT_LOCK_FAILED', causeCode: 'AUDIT_INVALID_RESPONSE', diagnosticReason: 'missing_upsert_outcome_arrays', operation: 'acquire_execution_lock' });
      const acquired = createdRecordIds.includes(auditRecordId);
      const updated = updatedRecordIds.includes(auditRecordId);
      if (acquired === updated) throw Object.assign(new Error('audit_lock_failed'), { code: 'AUDIT_LOCK_FAILED', causeCode: 'AUDIT_INVALID_RESPONSE', diagnosticReason: 'ambiguous_upsert_outcome', operation: 'acquire_execution_lock' });
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
