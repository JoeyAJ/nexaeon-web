/* global process */

const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0';
const LEGACY_AUDIT_PREFIX = '[Audit ';
const LEGACY_DRAFT_PREFIX = '[Draft ';
const LEGACY_IDEMPOTENCY_MARKER = '[NexAeon draft idempotency:';

function clean(value, limit = 4000) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim().slice(0, limit);
}

function configuration(env = process.env) {
  const apiKey = clean(env.AIRTABLE_API_KEY, 512);
  const baseId = clean(env.AIRTABLE_BASE_ID, 100);
  const projectsTableId = clean(env.AIRTABLE_PROJECTS_TABLE_ID, 100);
  const auditTableId = clean(env.AIRTABLE_AUDIT_TABLE_ID, 100);
  if (!apiKey || !baseId || !projectsTableId || !auditTableId) {
    throw Object.assign(new Error('migration_configuration_missing'), { code: 'DATA_SOURCE_CONFIGURATION_MISSING' });
  }
  return { apiKey, baseId, projectsTableId, auditTableId };
}

async function request(url, options, fetchImpl) {
  let response;
  try { response = await fetchImpl(url, options); } catch (error) {
    const timeout = error?.name === 'AbortError' || error?.name === 'TimeoutError';
    throw Object.assign(new Error('migration_request_failed'), { code: timeout ? 'DATA_SOURCE_TIMEOUT' : 'DATA_SOURCE_REQUEST_FAILED' });
  }
  if (!response.ok) {
    throw Object.assign(new Error('migration_request_rejected'), { code: response.status === 422 ? 'DATA_SOURCE_SCHEMA_INVALID' : 'DATA_SOURCE_REJECTED', status: response.status });
  }
  try {
    const payload = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('invalid_payload');
    return payload;
  } catch {
    throw Object.assign(new Error('migration_invalid_response'), { code: 'DATA_SOURCE_INVALID_RESPONSE' });
  }
}

function parseJson(value) {
  try { return JSON.parse(String(value || '{}')); } catch { return null; }
}

export function isLegacyAuditProject(record) {
  return clean(record?.fields?.['Project Name'], 200).startsWith(LEGACY_AUDIT_PREFIX);
}

export function isLegacyDraftProject(record) {
  const fields = record?.fields || {};
  const name = clean(fields['Project Name'], 300);
  const summary = clean(fields['Public Summary'], 6000);
  return (name.startsWith(LEGACY_DRAFT_PREFIX) || summary.includes(LEGACY_IDEMPOTENCY_MARKER))
    && clean(fields['Action Draft Schema Version'], 40) !== 'v1';
}

export function parseLegacyAuditProject(record) {
  if (!isLegacyAuditProject(record)) return null;
  const payload = parseJson(record.fields?.['Public Summary']);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return { sourceRecordId: clean(record.id, 120), sourceName: clean(record.fields?.['Project Name'], 300), payload };
}

function markerValue(summary) {
  const escaped = LEGACY_IDEMPOTENCY_MARKER.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return String(summary || '').match(new RegExp(`${escaped}([^\\]]+)\\]`, 'u'))?.[1]?.trim().slice(0, 80) || '';
}

export function mapLegacyDraftUpdate(record) {
  if (!isLegacyDraftProject(record)) return null;
  const fields = record.fields || {};
  const nameHash = clean(fields['Project Name'], 300).match(/^\[Draft\s+([^\]]+)\]/u)?.[1]?.slice(0, 80) || '';
  const idempotencyKey = clean(fields['Idempotency Key'], 80) || markerValue(fields['Public Summary']) || nameHash || 'Unknown';
  const operationId = clean(fields['Operation ID'], 80) || 'Unknown';
  return {
    sourceRecordId: clean(record.id, 120),
    primaryField: fields['Project Name'],
    fields: {
      'Draft Status': ['Draft', 'Proposed', 'Pending Review'].includes(fields['Draft Status']) ? fields['Draft Status'] : 'Draft',
      'Operation ID': operationId,
      'Idempotency Key': idempotencyKey,
      'Created By': clean(fields['Created By'], 160) || 'Legacy Migration',
      'Created Via Agent': clean(fields['Created Via Agent'], 80) || 'orchestrator',
      'Execution Status': clean(fields['Execution Status'], 80) || 'Succeeded',
      'Source Tool ID': clean(fields['Source Tool ID'], 80) || 'createActionDraft',
      'Action Draft Schema Version': 'v1',
    },
    consistencyStatus: fields['Audit Record ID'] ? 'linked' : 'missing-audit',
  };
}

export function linkedRecordIds(value) {
  const values = Array.isArray(value) ? value : value === undefined || value === null || value === '' ? [] : [value];
  return values.filter((item) => typeof item === 'string').map((item) => clean(item, 120)).filter(Boolean);
}

function normalizeProject(record, index) {
  const validRecord = Boolean(record && typeof record === 'object' && !Array.isArray(record));
  const validFields = Boolean(validRecord && record.fields && typeof record.fields === 'object' && !Array.isArray(record.fields));
  const id = validRecord ? clean(record.id, 120) : '';
  const malformedReasons = [];
  if (!validRecord) malformedReasons.push('record-not-object');
  if (validRecord && !id) malformedReasons.push('record-id-missing');
  if (validRecord && !validFields) malformedReasons.push('fields-not-object');
  return {
    id: id || `malformed-project-${index + 1}`,
    fields: validFields ? { ...record.fields } : {},
    createdTime: validRecord ? clean(record.createdTime, 40) : '',
    malformed: malformedReasons.length > 0,
    malformedReasons,
  };
}

function normalizeAudit(record, index) {
  const validRecord = Boolean(record && typeof record === 'object' && !Array.isArray(record));
  const validFields = Boolean(validRecord && record.fields && typeof record.fields === 'object' && !Array.isArray(record.fields));
  const id = validRecord ? clean(record.id, 120) : '';
  const fields = validFields ? record.fields : {};
  const externalRecordIds = linkedRecordIds(fields['External Record ID']);
  const malformedReasons = [];
  if (!validRecord) malformedReasons.push('record-not-object');
  if (validRecord && !id) malformedReasons.push('record-id-missing');
  if (validRecord && !validFields) malformedReasons.push('fields-not-object');
  if (Array.isArray(fields['External Record ID']) && externalRecordIds.length !== fields['External Record ID'].length) malformedReasons.push('external-record-link-invalid');
  if (externalRecordIds.length > 1) malformedReasons.push('external-record-link-multiple');
  return {
    id: id || `malformed-audit-${index + 1}`, fields: { ...fields },
    auditId: clean(fields['Audit ID'], 120), operationId: clean(fields['Operation ID'], 80),
    idempotencyKey: clean(fields['Idempotency Key'], 80), externalRecordId: externalRecordIds[0] || '', externalRecordIds,
    agentId: clean(fields['Agent ID'], 80), toolId: clean(fields['Tool ID'], 80),
    executionStatus: clean(fields['Execution Status'], 80), schemaVersion: clean(fields['Schema Version'], 40),
    recordType: clean(fields['Record Type'], 40), sanitizedInput: parseJson(fields['Sanitized Input']) || {},
    sanitizedOutput: parseJson(fields['Sanitized Output']) || {}, errorCode: clean(fields['Error Code'], 100),
    malformed: malformedReasons.length > 0,
    malformedReasons,
  };
}

export function createAirtableMigrationDataSource({ env = process.env, fetchImpl = fetch, timeoutMs = 8_000 } = {}) {
  const cfg = configuration(env);
  const headers = { Authorization: `Bearer ${cfg.apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  const tableUrl = (tableId) => `${AIRTABLE_API_ROOT}/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(tableId)}`;

  async function listTable(tableId) {
    const records = [];
    let offset = '';
    const seenOffsets = new Set();
    do {
      const url = new URL(tableUrl(tableId));
      url.searchParams.set('pageSize', '100');
      if (offset) url.searchParams.set('offset', offset);
      const page = await request(url, { headers, signal: AbortSignal.timeout(timeoutMs) }, fetchImpl);
      if (!Array.isArray(page.records)) throw Object.assign(new Error('migration_invalid_records'), { code: 'DATA_SOURCE_INVALID_RESPONSE' });
      if (page.offset !== undefined && typeof page.offset !== 'string') throw Object.assign(new Error('migration_invalid_offset'), { code: 'DATA_SOURCE_PAGINATION_INVALID' });
      records.push(...page.records);
      const nextOffset = page.offset || '';
      if (nextOffset && seenOffsets.has(nextOffset)) throw Object.assign(new Error('migration_repeated_offset'), { code: 'DATA_SOURCE_PAGINATION_INVALID' });
      if (nextOffset) seenOffsets.add(nextOffset);
      offset = nextOffset;
      if (offset && records.length >= 1000) throw Object.assign(new Error('migration_pagination_limit'), { code: 'DATA_SOURCE_PAGINATION_LIMIT_EXCEEDED' });
    } while (offset);
    return records;
  }

  return {
    async inspectSchema() {
      const metadata = await request(`${AIRTABLE_API_ROOT}/meta/bases/${encodeURIComponent(cfg.baseId)}/tables`, { headers, signal: AbortSignal.timeout(timeoutMs) }, fetchImpl);
      const selected = (metadata.tables || []).filter(({ id }) => id === cfg.projectsTableId || id === cfg.auditTableId);
      return selected.map((table) => ({ role: table.id === cfg.projectsTableId ? 'projects' : 'audit', name: clean(table.name, 120), primaryFieldId: clean(table.primaryFieldId, 120), fields: (table.fields || []).map((field) => ({ name: clean(field.name, 160), type: clean(field.type, 80), isPrimary: field.id === table.primaryFieldId })) }));
    },
    async listProjects() { return (await listTable(cfg.projectsTableId)).map(normalizeProject); },
    async listAudits() { return (await listTable(cfg.auditTableId)).map(normalizeAudit); },
    async createAudit(fields) {
      const result = await request(tableUrl(cfg.auditTableId), {
        method: 'POST', headers, signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ records: [{ fields: Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== '')) }], typecast: false }),
      }, fetchImpl);
      const id = clean(result.records?.[0]?.id, 120);
      if (!id) throw Object.assign(new Error('audit_invalid_response'), { code: 'AUDIT_INVALID_RESPONSE' });
      return id;
    },
    async upsertAudit(fields) {
      const result = await request(tableUrl(cfg.auditTableId), {
        method: 'PATCH', headers, signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ performUpsert: { fieldsToMergeOn: ['Audit ID'] }, records: [{ fields: Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== '')) }], typecast: false }),
      }, fetchImpl);
      const id = clean(result.records?.[0]?.id, 120);
      if (!id) throw Object.assign(new Error('audit_invalid_response'), { code: 'AUDIT_INVALID_RESPONSE' });
      return id;
    },
    async updateProject(recordId, fields) {
      const result = await request(`${tableUrl(cfg.projectsTableId)}/${encodeURIComponent(recordId)}`, {
        method: 'PATCH', headers, signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ fields, typecast: false }),
      }, fetchImpl);
      if (!result.id) throw Object.assign(new Error('project_invalid_response'), { code: 'DATA_SOURCE_INVALID_RESPONSE' });
      return clean(result.id, 120);
    },
    async updateAudit(recordId, fields) {
      const result = await request(`${tableUrl(cfg.auditTableId)}/${encodeURIComponent(recordId)}`, {
        method: 'PATCH', headers, signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ fields, typecast: false }),
      }, fetchImpl);
      if (!result.id) throw Object.assign(new Error('audit_invalid_response'), { code: 'AUDIT_INVALID_RESPONSE' });
      return clean(result.id, 120);
    },
  };
}
