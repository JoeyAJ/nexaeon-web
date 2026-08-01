import assert from 'node:assert/strict';
import test from 'node:test';

import { checkActionAuditConsistency } from '../lib/agent/actionAuditConsistency.js';
import { executeActionAuditRepair, executeLegacyMigration, MIGRATION_CONFIRMATION_TTL_MS, previewActionAuditRepair, previewLegacyMigration, runConsistencyCheck, verifyMigrationBatch } from '../lib/agent/legacyMigrationRuntime.js';
import { createAirtableMigrationDataSource, isLegacyAuditProject, isLegacyDraftProject, mapLegacyDraftUpdate, parseLegacyAuditProject } from '../lib/agent/migrationDataSource.js';

const env = { NEXAEON_TOOL_EXECUTION_SECRET: 'migration-test-secret' };
const actor = { actorId: 'admin-1', role: 'admin', sessionId: 'session-1' };
const req = { headers: { 'x-forwarded-for': '203.0.113.10', 'user-agent': 'migration-test' } };

function legacyAudit(id = 'rec-legacy-audit') {
  return { id, fields: { 'Project Name': '[Audit old-op] hidden', 'Public Summary': JSON.stringify({ auditId: 'old-audit', operationId: 'old-op', idempotencyKey: 'old-idem', agentId: 'orchestrator', toolId: 'createActionDraft', executionStatus: 'succeeded', externalRecordId: 'rec-old-action', timestamp: '2026-07-31T00:00:00.000Z', actorId: 'old-admin', errorMessage: 'token=must-redact' }) } };
}
function legacyDraft(id = 'rec-legacy-draft') {
  return { id, fields: { 'Project Name': '[Draft abc123] Keep primary', 'Public Summary': 'Legacy draft\n\n[NexAeon draft idempotency:idem-legacy]' } };
}
function memorySource(seedProjects = [legacyAudit(), legacyDraft()], seedAudits = []) {
  const projects = structuredClone(seedProjects); const audits = structuredClone(seedAudits); let auditNumber = 0;
  const parse = (raw) => { try { return JSON.parse(raw || '{}'); } catch { return {}; } };
  return {
    projects, audits,
    async listProjects() { return structuredClone(projects); },
    async listAudits() { return structuredClone(audits); },
    async createAudit(fields) {
      const id = `rec-created-${++auditNumber}`;
      const input = parse(fields['Sanitized Input']); const output = parse(fields['Sanitized Output']);
      audits.push({ id, fields: structuredClone(fields), operationId: fields['Operation ID'], idempotencyKey: fields['Idempotency Key'], externalRecordId: fields['External Record ID'] || '', agentId: fields['Agent ID'], toolId: fields['Tool ID'], executionStatus: fields['Execution Status'], schemaVersion: fields['Schema Version'], recordType: fields['Record Type'], sanitizedInput: input, sanitizedOutput: output, errorCode: fields['Error Code'] || '' });
      return id;
    },
    async upsertAudit(fields) {
      const existing = audits.find((audit) => audit.fields?.['Audit ID'] === fields['Audit ID']);
      if (existing) return existing.id;
      return this.createAudit(fields);
    },
    async updateProject(recordId, fields) { const record = projects.find(({ id }) => id === recordId); Object.assign(record.fields, fields); return recordId; },
    async updateAudit(recordId, fields) { const record = audits.find(({ id }) => id === recordId); Object.assign(record.fields, fields); Object.assign(record, { externalRecordId: fields['External Record ID'] ?? record.externalRecordId }); return recordId; },
  };
}
function formalAction(overrides = {}) {
  return { id: 'rec-action', fields: { 'Project Name': '[Draft hash] Action', 'Draft Status': 'Draft', 'Operation ID': 'op-1', 'Idempotency Key': 'idem-1', 'Created By': 'admin', 'Created Via Agent': 'orchestrator', 'Execution Status': 'Succeeded', 'Audit Record ID': ['rec-audit'], 'Source Tool ID': 'createActionDraft', 'Action Draft Schema Version': 'v1', ...(overrides.fields || {}) }, ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'fields')) };
}
function formalAudit(overrides = {}) {
  return { id: 'rec-audit', fields: {}, auditId: 'audit-1', operationId: 'op-1', idempotencyKey: 'idem-1', externalRecordId: 'rec-action', agentId: 'orchestrator', toolId: 'createActionDraft', executionStatus: 'succeeded', schemaVersion: 'v1', ...overrides };
}

test('legacy identification is strict and draft mapping preserves primary field', () => {
  const audit = legacyAudit(); const draft = legacyDraft();
  assert.equal(isLegacyAuditProject(audit), true); assert.equal(parseLegacyAuditProject(audit).payload.operationId, 'old-op');
  assert.equal(isLegacyDraftProject(draft), true);
  const mapped = mapLegacyDraftUpdate(draft);
  assert.equal(mapped.primaryField, draft.fields['Project Name']); assert.equal(mapped.fields['Idempotency Key'], 'idem-legacy');
  assert.equal(mapped.fields['Draft Status'], 'Draft'); assert.equal(mapped.fields['Action Draft Schema Version'], 'v1');
  assert.equal('Project Name' in mapped.fields, false); assert.equal('Audit Record ID' in mapped.fields, false);
  assert.equal(isLegacyAuditProject({ id: 'normal', fields: { 'Project Name': 'Normal project' } }), false);
});

test('migration dry-run reports real creates, updates, invalids, warnings, no deletion, and bounded confirmation', async () => {
  const source = memorySource([...memorySource().projects, { id: 'bad-audit', fields: { 'Project Name': '[Audit invalid]', 'Public Summary': 'not json' } }]);
  const now = Date.UTC(2026, 7, 1);
  const preview = await previewLegacyMigration({ actor, req, env, now, dataSource: source });
  assert.equal(preview.legacyAuditCount, 2); assert.equal(preview.legacyDraftCount, 1); assert.equal(preview.invalidRecordCount, 1);
  assert.deepEqual(preview.recordsToCreate, ['rec-legacy-audit']); assert.deepEqual(preview.recordsToUpdate, ['rec-legacy-draft']);
  assert.equal(preview.sourceRecordsDeleted, false); assert.equal(preview.primaryFieldsChanged, false); assert.equal(preview.estimatedWrites, 4);
  assert.equal(new Date(preview.expiresAt).getTime(), now + MIGRATION_CONFIRMATION_TTL_MS); assert.ok(preview.confirmationToken);
});

test('migration requires admin, explicit confirmation, matching payload, fingerprint, and unexpired token', async () => {
  const source = memorySource(); const now = Date.UTC(2026, 7, 1);
  await assert.rejects(previewLegacyMigration({ actor: { role: 'visitor' }, req, env, now, dataSource: source }), { code: 'AUTH_ROLE_FORBIDDEN' });
  const preview = await previewLegacyMigration({ actor, req, env, now, dataSource: source });
  const body = { confirm: true, migrationBatchId: preview.migrationBatchId, payloadHash: preview.payloadHash, confirmationToken: preview.confirmationToken };
  await assert.rejects(executeLegacyMigration({ body: { ...body, confirm: false }, actor, req, env, now, dataSource: source }), { code: 'MIGRATION_PREVIEW_REQUIRED' });
  await assert.rejects(executeLegacyMigration({ body: { ...body, payloadHash: 'changed' }, actor, req, env, now, dataSource: source }), { code: 'MIGRATION_TOKEN_INVALID' });
  await assert.rejects(executeLegacyMigration({ body, actor, req: { headers: { ...req.headers, 'user-agent': 'changed' } }, env, now, dataSource: source }), { code: 'MIGRATION_TOKEN_INVALID' });
  await assert.rejects(executeLegacyMigration({ body, actor, req, env, now: now + MIGRATION_CONFIRMATION_TTL_MS + 1, dataSource: source }), { code: 'MIGRATION_TOKEN_EXPIRED' });
});

test('confirmed migration creates a redacted legacy-migrated audit, updates formal draft fields, retains source and is idempotent', async () => {
  const source = memorySource(); const originalNames = source.projects.map(({ fields }) => fields['Project Name']);
  const preview = await previewLegacyMigration({ actor, req, env, dataSource: source });
  const body = { confirm: true, migrationBatchId: preview.migrationBatchId, payloadHash: preview.payloadHash, confirmationToken: preview.confirmationToken };
  const result = await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  assert.equal(result.succeededCount, 2); assert.equal(result.failedCount, 0); assert.equal(result.executionStatus, 'succeeded');
  assert.deepEqual(source.projects.map(({ fields }) => fields['Project Name']), originalNames);
  assert.equal(source.projects.length, 2); assert.equal(source.projects[1].fields['Action Draft Schema Version'], 'v1');
  const migrated = source.audits.find(({ recordType }) => recordType === 'legacy-migrated');
  assert.equal(migrated.sanitizedOutput.migrationSourceRecordId, 'rec-legacy-audit');
  assert.equal(JSON.stringify(migrated).includes('must-redact'), false);
  const replay = await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  assert.equal(replay.replayed, true); assert.equal(source.audits.filter(({ recordType }) => recordType === 'legacy-migrated').length, 1);
  const verified = await verifyMigrationBatch({ migrationBatchId: preview.migrationBatchId, dataSource: source });
  assert.equal(verified.migratedAuditCount, 1); assert.equal(verified.remainingLegacyDraftCount, 0); assert.equal(verified.sourceRecordsRetained, true);
});

test('consistency checker classifies consistent, mismatch, orphan, duplicate, legacy, and missing fields', () => {
  const action = { id: 'rec-action', fields: { 'Project Name': '[Draft hash] Action', 'Draft Status': 'Draft', 'Operation ID': 'op-1', 'Idempotency Key': 'idem-1', 'Created By': 'admin', 'Created Via Agent': 'orchestrator', 'Execution Status': 'Succeeded', 'Audit Record ID': 'rec-audit', 'Source Tool ID': 'createActionDraft', 'Action Draft Schema Version': 'v1' } };
  const audit = { id: 'rec-audit', operationId: 'op-1', idempotencyKey: 'idem-1', externalRecordId: 'rec-action', agentId: 'orchestrator', toolId: 'createActionDraft', executionStatus: 'succeeded', schemaVersion: 'v1' };
  assert.equal(checkActionAuditConsistency({ projects: [action], audits: [audit] }).counts.consistent, 1);
  const mismatch = checkActionAuditConsistency({ projects: [action], audits: [{ ...audit, operationId: 'other' }] });
  assert.equal(mismatch.counts['operation-mismatch'], 1);
  const orphan = checkActionAuditConsistency({ projects: [], audits: [audit] }); assert.equal(orphan.counts['audit-missing-action'], 1);
  const duplicate = checkActionAuditConsistency({ projects: [action, { ...action, id: 'rec-action-2', fields: { ...action.fields, 'Audit Record ID': '' } }], audits: [audit] });
  assert.equal(duplicate.counts.duplicate, 1);
  assert.equal(checkActionAuditConsistency({ projects: [legacyDraft()], audits: [] }).counts.legacy, 1);
  assert.equal(checkActionAuditConsistency({ projects: [{ ...action, fields: { ...action.fields, 'Created By': '' } }], audits: [audit] }).counts.unknown, 1);
});

test('consistency checker accepts Airtable linked-record arrays for a normal Action/Audit pair', () => {
  const result = checkActionAuditConsistency({ projects: [formalAction()], audits: [formalAudit()] });
  assert.equal(result.actionCount, 1); assert.equal(result.auditCount, 1); assert.equal(result.counts.consistent, 1);
});

test('consistency checker reports an Action missing its Audit link', () => {
  const result = checkActionAuditConsistency({ projects: [formalAction({ fields: { 'Audit Record ID': [] } })], audits: [formalAudit()] });
  const issue = result.results.find(({ category }) => category === 'action-missing-audit');
  assert.equal(result.counts['action-missing-audit'], 1); assert.equal(issue.candidateAuditRecordId, 'rec-audit');
});

test('consistency checker reports an Audit whose Action is missing', () => {
  const result = checkActionAuditConsistency({ projects: [], audits: [formalAudit()] });
  assert.equal(result.counts['audit-missing-action'], 1);
});

test('consistency checker reports duplicate physical Audits with the same Audit ID', () => {
  const result = checkActionAuditConsistency({ projects: [formalAction()], audits: [formalAudit(), formalAudit({ id: 'rec-audit-copy' })] });
  const duplicate = result.results.find(({ reason }) => reason === 'duplicate-audit-id');
  assert.equal(result.counts.duplicate, 1); assert.deepEqual(duplicate.auditRecordIds, ['rec-audit', 'rec-audit-copy']);
});

test('legacy Draft without operation ID is retained as a visible legacy issue', () => {
  const record = legacyDraft(); record.fields['Audit Record ID'] = ['rec-audit'];
  const issue = checkActionAuditConsistency({ projects: [record], audits: [] }).results[0];
  assert.equal(issue.category, 'legacy'); assert.deepEqual(issue.missingFields, ['Operation ID']);
});

test('legacy Draft without an Audit link is retained as a visible legacy issue', () => {
  const record = legacyDraft(); record.fields['Operation ID'] = 'legacy-op';
  const issue = checkActionAuditConsistency({ projects: [record], audits: [] }).results[0];
  assert.equal(issue.category, 'legacy'); assert.deepEqual(issue.missingFields, ['Audit Record ID']);
});

test('malformed Airtable record is counted as unknown without hiding the valid records', async () => {
  const source = createAirtableMigrationDataSource({
    env: { AIRTABLE_API_KEY: 'test-key', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_PROJECTS_TABLE_ID: 'projects', AIRTABLE_AUDIT_TABLE_ID: 'audits' },
    fetchImpl: async (url) => ({ ok: true, json: async () => String(url).includes('/projects') ? { records: [null, formalAction()] } : { records: [{ id: 'rec-audit', fields: { 'Audit ID': 'audit-1', 'Operation ID': 'op-1', 'Idempotency Key': 'idem-1', 'External Record ID': 'rec-action', 'Agent ID': 'orchestrator', 'Tool ID': 'createActionDraft', 'Execution Status': 'succeeded', 'Schema Version': 'v1' } }] } }),
  });
  const result = await runConsistencyCheck({ dataSource: source });
  assert.equal(result.counts.unknown, 1); assert.equal(result.counts.consistent, 1);
  assert.equal(result.results.find(({ reason }) => reason === 'malformed-project-record').actionRecordId, 'malformed-project-1');
});

test('Airtable request failure preserves an explicit safe error code', async () => {
  const source = createAirtableMigrationDataSource({
    env: { AIRTABLE_API_KEY: 'test-key', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_PROJECTS_TABLE_ID: 'projects', AIRTABLE_AUDIT_TABLE_ID: 'audits' },
    fetchImpl: async () => { throw new TypeError('secret-bearing upstream failure'); },
  });
  await assert.rejects(runConsistencyCheck({ dataSource: source }), { code: 'DATA_SOURCE_REQUEST_FAILED', message: 'migration_request_failed' });
});

test('repair preview and confirm only patch uniquely verified ID links', async () => {
  const action = { id: 'rec-action', fields: { 'Project Name': '[Draft hash] Action', 'Draft Status': 'Draft', 'Operation ID': 'op-1', 'Idempotency Key': 'idem-1', 'Created By': 'admin', 'Created Via Agent': 'orchestrator', 'Execution Status': 'Succeeded', 'Audit Record ID': '', 'Source Tool ID': 'createActionDraft', 'Action Draft Schema Version': 'v1' } };
  const audit = { id: 'rec-audit', fields: {}, operationId: 'op-1', idempotencyKey: 'idem-1', externalRecordId: 'rec-action', agentId: 'orchestrator', toolId: 'createActionDraft', executionStatus: 'succeeded', schemaVersion: 'v1', sanitizedOutput: {} };
  const source = memorySource([action], [audit]);
  const issue = checkActionAuditConsistency({ projects: source.projects, audits: source.audits }).results.find(({ category }) => category === 'action-missing-audit');
  const preview = await previewActionAuditRepair({ issue, actor, req, env, dataSource: source });
  assert.deepEqual(preview.updates, [{ target: 'action', recordId: 'rec-action', fields: { 'Audit Record ID': 'rec-audit' } }]);
  await assert.rejects(executeActionAuditRepair({ body: { ...preview, issue, confirm: false }, actor, req, env, dataSource: source }), { code: 'REPAIR_CONFIRMATION_REQUIRED' });
  const result = await executeActionAuditRepair({ body: { ...preview, issue, confirm: true }, actor, req, env, dataSource: source });
  assert.equal(result.executionStatus, 'succeeded'); assert.equal(source.projects[0].fields['Audit Record ID'], 'rec-audit');
});

test('ambiguous or conflicting repair is rejected without writing', async () => {
  const baseAction = { id: 'rec-action', fields: { 'Project Name': '[Draft] A', 'Operation ID': 'op-1', 'Idempotency Key': 'idem-1', 'Action Draft Schema Version': 'v1' } };
  const audit = { id: 'rec-audit', operationId: 'op-1', idempotencyKey: 'idem-1', externalRecordId: '', toolId: 'createActionDraft', schemaVersion: 'v1' };
  const source = memorySource([baseAction, { ...baseAction, id: 'rec-action-2' }], [audit]);
  await assert.rejects(previewActionAuditRepair({ issue: { repairable: true, operationId: 'op-1' }, actor, req, env, dataSource: source }), { code: 'REPAIR_AMBIGUOUS' });
  assert.equal(source.projects.every(({ fields }) => !fields['Audit Record ID']), true);
});

test('an Action-linked preview audit can safely receive its missing External Record ID despite append-only sibling events', async () => {
  const action = { id: 'rec-action', fields: { 'Project Name': '[Draft] A', 'Draft Status': 'Draft', 'Operation ID': 'op-1', 'Idempotency Key': 'idem-1', 'Created By': 'admin', 'Created Via Agent': 'orchestrator', 'Execution Status': 'Succeeded', 'Audit Record ID': 'rec-preview', 'Source Tool ID': 'createActionDraft', 'Action Draft Schema Version': 'v1' } };
  const previewAudit = { id: 'rec-preview', fields: {}, operationId: 'op-1', idempotencyKey: 'idem-1', externalRecordId: '', agentId: 'orchestrator', toolId: 'createActionDraft', executionStatus: 'previewed', schemaVersion: 'v1', sanitizedOutput: {} };
  const finalAudit = { ...previewAudit, id: 'rec-final', externalRecordId: 'rec-action', executionStatus: 'succeeded' };
  const source = memorySource([action], [previewAudit, finalAudit]);
  const checked = checkActionAuditConsistency({ projects: source.projects, audits: source.audits });
  const issue = checked.results.find(({ category }) => category === 'link-mismatch');
  assert.equal(issue.repairable, true); assert.equal(checked.counts['audit-missing-action'], 0);
  const preview = await previewActionAuditRepair({ issue, actor, req, env, dataSource: source });
  assert.deepEqual(preview.updates, [{ target: 'audit', recordId: 'rec-preview', fields: { 'External Record ID': 'rec-action' } }]);
});

test('partial migration failure is audited and the same confirmed batch safely resumes remaining records', async () => {
  const source = memorySource(); const upsertAudit = source.upsertAudit.bind(source); let failLegacyOnce = true;
  source.upsertAudit = async (fields) => {
    if (fields['Record Type'] === 'legacy-migrated' && failLegacyOnce) { failLegacyOnce = false; throw Object.assign(new Error('temporary'), { code: 'DATA_SOURCE_REQUEST_FAILED' }); }
    return upsertAudit(fields);
  };
  const preview = await previewLegacyMigration({ actor, req, env, dataSource: source });
  const body = { confirm: true, migrationBatchId: preview.migrationBatchId, payloadHash: preview.payloadHash, confirmationToken: preview.confirmationToken };
  const partial = await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  assert.equal(partial.executionStatus, 'partial_failure'); assert.equal(partial.failedCount, 1);
  const resumed = await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  assert.equal(resumed.executionStatus, 'succeeded'); assert.equal(source.audits.filter(({ recordType }) => recordType === 'legacy-migrated').length, 1);
});
