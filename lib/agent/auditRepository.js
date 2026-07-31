/* global process */

import { randomUUID } from 'node:crypto';

const API_ROOT = 'https://api.airtable.com/v0';
const RECORD_PREFIX = '[Audit ';

function clean(value, limit = 4000) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim().slice(0, limit);
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
  return typeof value === 'string' ? clean(value) : value;
}

export function normalizeAuditRecord(record) {
  return {
    auditId: clean(record.auditId || randomUUID(), 80),
    operationId: clean(record.operationId, 80),
    timestamp: clean(record.timestamp || new Date().toISOString(), 40),
    actorId: clean(record.actorId, 160),
    actorRole: clean(record.actorRole, 40),
    actorSessionId: clean(record.actorSessionId, 80),
    agentId: clean(record.agentId, 40),
    toolId: clean(record.toolId, 80),
    permissionLevel: clean(record.permissionLevel, 40),
    targetDataSource: clean(record.targetDataSource, 100),
    actionType: clean(record.actionType, 40),
    userConfirmation: Boolean(record.userConfirmation),
    confirmationTimestamp: record.confirmationTimestamp ? clean(record.confirmationTimestamp, 40) : null,
    sanitizedInput: sanitize(record.sanitizedInput || {}),
    previewHash: clean(record.previewHash, 80),
    idempotencyKey: clean(record.idempotencyKey, 80),
    executionStatus: clean(record.executionStatus, 40),
    externalRecordId: clean(record.externalRecordId, 120) || null,
    errorCode: clean(record.errorCode, 100) || null,
    duration: Math.max(0, Math.round(Number(record.duration) || 0)),
    replayed: Boolean(record.replayed),
    source: clean(record.source || 'server', 80),
  };
}

export function createMemoryAuditRepository(seed = []) {
  const records = seed.map(normalizeAuditRecord);
  return {
    async createAuditRecord(record) {
      const normalized = normalizeAuditRecord(record);
      records.push(normalized);
      return { auditRecordId: normalized.auditId, record: normalized, persistence: 'memory' };
    },
    async updateAuditExecutionResult(operationId, patch) {
      return this.createAuditRecord({ ...patch, operationId });
    },
    async getAuditRecord(id) { return records.find((record) => record.auditId === id || record.operationId === id) || null; },
    async listAuditRecords(filters = {}) {
      return records.filter((record) => matches(record, filters)).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, boundedLimit(filters.limit));
    },
  };
}

function boundedLimit(value) {
  return Math.min(200, Math.max(1, Number(value) || 50));
}

function matches(record, filters) {
  if (filters.agentId && record.agentId !== filters.agentId) return false;
  if (filters.toolId && record.toolId !== filters.toolId) return false;
  if (filters.executionStatus && record.executionStatus !== filters.executionStatus) return false;
  if (filters.dateFrom && record.timestamp < filters.dateFrom) return false;
  if (filters.dateTo && record.timestamp > filters.dateTo) return false;
  return true;
}

function airtableConfig(env) {
  const apiKey = clean(env.AIRTABLE_API_KEY, 512);
  const baseId = clean(env.AIRTABLE_BASE_ID, 100);
  const tableId = clean(env.AIRTABLE_AUDIT_TABLE_ID || env.AIRTABLE_PROJECTS_TABLE_ID, 100);
  if (!apiKey || !baseId || !tableId) throw Object.assign(new Error('audit_configuration_missing'), { code: 'AUDIT_CONFIGURATION_MISSING' });
  return { apiKey, baseId, tableId, dedicated: Boolean(env.AIRTABLE_AUDIT_TABLE_ID?.trim()) };
}

async function request(url, options, fetchImpl) {
  let response;
  try { response = await fetchImpl(url, options); } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    throw Object.assign(new Error('audit_request_failed'), { code: timeout ? 'AUDIT_TIMEOUT' : 'AUDIT_REQUEST_FAILED' });
  }
  if (!response.ok) throw Object.assign(new Error('audit_request_rejected'), { code: 'AUDIT_REQUEST_REJECTED', status: response.status });
  return response.json();
}

export function createAirtableAuditRepository({ env = process.env, fetchImpl = fetch, timeoutMs = 8_000 } = {}) {
  const cfg = airtableConfig(env);
  const url = `${API_ROOT}/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.tableId)}`;
  const headers = { Authorization: `Bearer ${cfg.apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  async function append(record) {
    const normalized = normalizeAuditRecord(record);
    const result = await request(url, {
      method: 'POST', headers, signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ records: [{ fields: {
        'Project Name': `${RECORD_PREFIX}${normalized.operationId} ${normalized.timestamp} ${normalized.auditId.slice(0, 8)}]`,
        'Public Summary': JSON.stringify(normalized),
      } }], typecast: false }),
    }, fetchImpl);
    const auditRecordId = result.records?.[0]?.id;
    if (!auditRecordId) throw Object.assign(new Error('audit_invalid_response'), { code: 'AUDIT_INVALID_RESPONSE' });
    return { auditRecordId, record: normalized, persistence: cfg.dedicated ? 'airtable-dedicated' : 'airtable-shared-hidden' };
  }
  return {
    createAuditRecord: append,
    async updateAuditExecutionResult(operationId, patch) { return append({ ...patch, operationId }); },
    async getAuditRecord(id) {
      const records = await this.listAuditRecords({ limit: 200 });
      return records.find((record) => record.auditId === id || record.operationId === id) || null;
    },
    async listAuditRecords(filters = {}) {
      const records = [];
      let offset = '';
      do {
        const query = new URL(url);
        query.searchParams.set('pageSize', '100');
        query.searchParams.set('filterByFormula', `LEFT({Project Name}, ${RECORD_PREFIX.length})=${JSON.stringify(RECORD_PREFIX)}`);
        if (offset) query.searchParams.set('offset', offset);
        const page = await request(query, { headers, signal: AbortSignal.timeout(timeoutMs) }, fetchImpl);
        for (const item of page.records || []) {
          try { records.push(normalizeAuditRecord(JSON.parse(item.fields?.['Public Summary'] || '{}'))); } catch { /* Ignore malformed non-audit rows. */ }
        }
        offset = page.offset || '';
      } while (offset && records.length < 500);
      return records.filter((record) => matches(record, filters)).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, boundedLimit(filters.limit));
    },
  };
}

export function getProductionAuditRepository(options = {}) {
  return createAirtableAuditRepository(options);
}

