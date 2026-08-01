import assert from 'node:assert/strict';
import test from 'node:test';

import { createAirtableAuditRepository } from '../lib/agent/auditRepository.js';

const env = { AIRTABLE_API_KEY: 'test-key', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_PROJECTS_TABLE_ID: 'projects', AIRTABLE_AUDIT_TABLE_ID: 'audits' };

function response(payload) { return { ok: true, status: 200, json: async () => payload }; }

test('admin audit timeout remains explicit and identifies the timed-out table page', async () => {
  const repository = createAirtableAuditRepository({ env, fetchImpl: async () => { throw Object.assign(new Error('timeout with secret'), { name: 'TimeoutError' }); } });
  await assert.rejects(repository.listAuditRecordsForAdmin({ recordType: 'formal' }), { code: 'AUDIT_TIMEOUT', tableRole: 'audit', pageNumber: 1 });
});

test('admin audit paginates dedicated and legacy records without truncation', async () => {
  const calls = [];
  const repository = createAirtableAuditRepository({ env, fetchImpl: async (url) => {
    const parsed = new URL(url); const isAudit = parsed.pathname.endsWith('/audits'); const offset = parsed.searchParams.get('offset') || '';
    calls.push({ isAudit, offset });
    if (isAudit) return response(offset ? { records: [{ id: 'rec-audit-2', fields: { 'Audit ID': 'audit-2', Timestamp: '2026-08-01T00:00:02.000Z' } }] } : { records: [{ id: 'rec-audit-1', fields: { 'Audit ID': 'audit-1', Timestamp: '2026-08-01T00:00:01.000Z' } }], offset: 'audit-next' });
    return response(offset ? { records: [{ id: 'rec-legacy-2', fields: { 'Public Summary': '{"auditId":"legacy-2","timestamp":"2026-08-01T00:00:04.000Z"}' } }] } : { records: [{ id: 'rec-legacy-1', fields: { 'Public Summary': '{"auditId":"legacy-1","timestamp":"2026-08-01T00:00:03.000Z"}' } }], offset: 'legacy-next' });
  } });
  const records = await repository.listAuditRecordsForAdmin({ limit: 10 });
  assert.equal(records.length, 4); assert.equal(calls.length, 4);
  assert.deepEqual(new Set(records.map(({ auditId }) => auditId)), new Set(['audit-1', 'audit-2', 'legacy-1', 'legacy-2']));
});

test('malformed Airtable audit response fails explicitly instead of returning an empty list', async () => {
  const repository = createAirtableAuditRepository({ env, fetchImpl: async () => response({ records: 'not-an-array' }) });
  await assert.rejects(repository.listAuditRecordsForAdmin({ recordType: 'formal' }), { code: 'AUDIT_INVALID_RESPONSE', tableRole: 'audit', pageNumber: 1 });
});
