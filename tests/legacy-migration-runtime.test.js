import assert from 'node:assert/strict';
import test from 'node:test';

import { checkActionAuditConsistency } from '../lib/agent/actionAuditConsistency.js';
import { canonicalActionType, executeActionAuditRepair, executeLegacyMigration, inspectMigrationSafety, MIGRATION_CONFIRMATION_TTL_MS, previewActionAuditRepair, previewLegacyMigration, runConsistencyCheck, verifyMigrationBatch } from '../lib/agent/legacyMigrationRuntime.js';
import { createAirtableMigrationDataSource, isLegacyAuditProject, isLegacyDraftProject, mapLegacyDraftUpdate, parseLegacyAuditProject } from '../lib/agent/migrationDataSource.js';
import { validateMigrationPreflight } from '../lib/agent/migrationPreflight.js';

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
    describeTarget() { return { baseId: 'app-test', projectsTableId: 'tbl-projects', auditTableId: 'tbl-audits' }; },
    async inspectSchema() {
      const projectNames = ['Project Name', 'Action Draft Schema Version', 'Draft Status', 'Operation ID', 'Idempotency Key', 'Created By', 'Created Via Agent', 'Execution Status', 'Source Tool ID', 'Audit Record ID'];
      const auditNames = ['Audit ID', 'Operation ID', 'Idempotency Key', 'Timestamp', 'Agent ID', 'Tool ID', 'Permission Level', 'Target Data Source', 'Action Type', 'Execution Status', 'Confirmation Status', 'Confirmation Timestamp', 'Actor ID', 'Actor Role', 'Actor Session Hash', 'Sanitized Input', 'Sanitized Output', 'External Record ID', 'Error Code', 'Duration Ms', 'Preview Hash', 'Requester Fingerprint', 'Audit Persistence Status', 'Created At', 'Schema Version', 'Record Type'];
      return [
        { role: 'projects', tableId: 'tbl-projects', name: 'Projects', fields: projectNames.map((name) => ({ name, type: 'singleLineText', choices: [] })) },
        { role: 'audit', tableId: 'tbl-audits', name: 'NexAeon Tool Execution Audit', fields: auditNames.map((name) => ({ name, type: 'singleLineText', choices: [] })) },
      ];
    },
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

test('confirmed migration creates a redacted migrated audit, updates formal draft fields, retains source and is idempotent', async () => {
  const source = memorySource(); const originalNames = source.projects.map(({ fields }) => fields['Project Name']);
  const preview = await previewLegacyMigration({ actor, req, env, dataSource: source });
  const body = { confirm: true, migrationBatchId: preview.migrationBatchId, payloadHash: preview.payloadHash, confirmationToken: preview.confirmationToken };
  const result = await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  assert.equal(result.succeededCount, 2); assert.equal(result.failedCount, 0); assert.equal(result.executionStatus, 'succeeded');
  assert.deepEqual(source.projects.map(({ fields }) => fields['Project Name']), originalNames);
  assert.equal(source.projects.length, 2); assert.equal(source.projects[1].fields['Action Draft Schema Version'], 'v1');
  const migrated = source.audits.find(({ recordType }) => recordType === 'migrated');
  assert.equal(migrated.sanitizedOutput.migrationSourceRecordId, 'rec-legacy-audit');
  assert.equal(JSON.stringify(migrated).includes('must-redact'), false);
  const replay = await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  assert.equal(replay.replayed, true); assert.equal(source.audits.filter(({ recordType }) => recordType === 'migrated').length, 1);
  const verified = await verifyMigrationBatch({ migrationBatchId: preview.migrationBatchId, dataSource: source });
  assert.equal(verified.migratedAuditCount, 1); assert.equal(verified.remainingLegacyDraftCount, 0); assert.equal(verified.sourceRecordsRetained, true);
});

test('migration links a legacy Draft to its uniquely identified migrated Audit', async () => {
  const draft = legacyDraft('rec-legacy-draft');
  const audit = legacyAudit('rec-legacy-audit');
  audit.fields['Public Summary'] = JSON.stringify({ auditId: 'legacy-audit', operationId: 'legacy-op', idempotencyKey: 'idem-legacy', agentId: 'orchestrator', toolId: 'createActionDraft', executionStatus: 'succeeded', externalRecordId: 'rec-legacy-draft' });
  const source = memorySource([audit, draft]);
  const preview = await previewLegacyMigration({ actor, req, env, dataSource: source });
  const body = { confirm: true, migrationBatchId: preview.migrationBatchId, payloadHash: preview.payloadHash, confirmationToken: preview.confirmationToken };
  await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  const migrated = source.audits.find(({ recordType }) => recordType === 'migrated');
  const updated = source.projects.find(({ id }) => id === 'rec-legacy-draft');
  assert.equal(updated.fields['Audit Record ID'], migrated.id); assert.equal(updated.fields['Operation ID'], 'legacy-op');
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
  assert.equal(preview.safe, true); assert.equal(preview.before.action.auditRecordId, null); assert.equal(preview.after.action.auditRecordId, 'rec-audit');
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

test('an Action-linked preview audit with a succeeded lifecycle sibling is valid and remains unchanged', () => {
  const action = { id: 'rec-action', fields: { 'Project Name': '[Draft] A', 'Draft Status': 'Draft', 'Operation ID': 'op-1', 'Idempotency Key': 'idem-1', 'Created By': 'admin', 'Created Via Agent': 'orchestrator', 'Execution Status': 'Succeeded', 'Audit Record ID': 'rec-preview', 'Source Tool ID': 'createActionDraft', 'Action Draft Schema Version': 'v1' } };
  const previewAudit = { id: 'rec-preview', fields: {}, operationId: 'op-1', idempotencyKey: 'idem-1', externalRecordId: '', agentId: 'orchestrator', toolId: 'createActionDraft', executionStatus: 'previewed', schemaVersion: 'v1', sanitizedOutput: {} };
  const finalAudit = { ...previewAudit, id: 'rec-final', externalRecordId: 'rec-action', executionStatus: 'succeeded' };
  const source = memorySource([action], [previewAudit, finalAudit]);
  const checked = checkActionAuditConsistency({ projects: source.projects, audits: source.audits });
  const result = checked.results.find(({ actionRecordId }) => actionRecordId === 'rec-action');
  assert.equal(result.category, 'consistent'); assert.equal(result.reason, 'linked-preview-with-succeeded-lifecycle');
  assert.deepEqual(result.lifecycleAuditRecordIds, ['rec-preview', 'rec-final']);
  assert.equal(checked.counts['link-mismatch'], 0); assert.equal(checked.counts['audit-missing-action'], 0);
});

test('migration lifecycle audits and legal Action lifecycle siblings are not false duplicates', () => {
  const action = formalAction({ fields: { 'Audit Record ID': 'rec-preview' } });
  const previewAudit = formalAudit({ id: 'rec-preview', auditId: 'audit-preview', externalRecordId: '', executionStatus: 'previewed' });
  const finalAudit = formalAudit({ id: 'rec-final', auditId: 'audit-final', externalRecordId: 'rec-action', executionStatus: 'succeeded' });
  const migrationStart = formalAudit({ id: 'rec-migration-start', auditId: 'migration-start:batch', operationId: 'batch', idempotencyKey: 'migration:key', toolId: 'executeLegacyMigration', recordType: 'formal', externalRecordId: '' });
  const migrationEnd = formalAudit({ id: 'rec-migration-end', auditId: 'migration-end:batch', operationId: 'batch', idempotencyKey: 'migration:key', toolId: 'executeLegacyMigration', recordType: 'formal', externalRecordId: '' });
  const checked = checkActionAuditConsistency({ projects: [action], audits: [previewAudit, finalAudit, migrationStart, migrationEnd] });
  assert.equal(checked.counts.consistent, 1); assert.equal(checked.counts.duplicate, 0); assert.equal(checked.auditCount, 2);
});

test('true duplicate detection reports concrete record IDs and basis', () => {
  const sourceAudit = formalAudit({ id: 'rec-migrated-1', auditId: 'audit-one', recordType: 'migrated', sanitizedOutput: { migrationSourceRecordId: 'rec-source' } });
  const duplicateSource = formalAudit({ id: 'rec-migrated-2', auditId: 'audit-two', recordType: 'migrated', sanitizedOutput: { migrationSourceRecordId: 'rec-source' } });
  const checked = checkActionAuditConsistency({ projects: [], audits: [sourceAudit, duplicateSource] });
  const duplicate = checked.results.find(({ reason }) => reason === 'duplicate-migration-source');
  assert.equal(duplicate.duplicateBasis, 'migration-source-record-id'); assert.equal(duplicate.sourceRecordId, 'rec-source');
  assert.deepEqual(duplicate.auditRecordIds, ['rec-migrated-1', 'rec-migrated-2']);
});

test('Unknown migrated Draft fields get a unique canonical Audit candidate in repair preview', async () => {
  const action = formalAction({ id: 'rec-legacy-draft', fields: { 'Operation ID': 'Unknown', 'Audit Record ID': '', 'Idempotency Key': 'idem-legacy' } });
  const audit = formalAudit({ id: 'rec-migrated-audit', operationId: 'legacy-op', idempotencyKey: 'idem-legacy', externalRecordId: 'rec-legacy-draft', recordType: 'migrated' });
  const source = memorySource([action], [audit]);
  const issue = checkActionAuditConsistency({ projects: source.projects, audits: source.audits }).results.find(({ category }) => category === 'action-missing-audit');
  assert.equal(issue.safe, true); assert.deepEqual(issue.candidateAuditRecordIds, ['rec-migrated-audit']); assert.equal(issue.candidateBasis, 'external-record-id');
  const preview = await previewActionAuditRepair({ issue, actor, req, env, dataSource: source });
  assert.deepEqual(preview.updates[0].fields, { 'Audit Record ID': 'rec-migrated-audit', 'Operation ID': 'legacy-op' });
});

test('multiple canonical Audit candidates reject repair preview without writes', async () => {
  const action = formalAction({ fields: { 'Audit Record ID': '', 'Operation ID': 'Unknown' } });
  const audits = [formalAudit({ id: 'rec-audit-a', operationId: 'op-a', externalRecordId: '' }), formalAudit({ id: 'rec-audit-b', operationId: 'op-b', externalRecordId: '' })];
  const source = memorySource([action], audits);
  const issue = checkActionAuditConsistency({ projects: source.projects, audits: source.audits }).results.find(({ category }) => category === 'action-missing-audit');
  assert.equal(issue.safe, false); assert.deepEqual(issue.candidateAuditRecordIds, ['rec-audit-a', 'rec-audit-b']);
  await assert.rejects(previewActionAuditRepair({ issue, actor, req, env, dataSource: source }), { code: 'REPAIR_NOT_SAFE' });
  assert.equal(source.projects[0].fields['Audit Record ID'], '');
});

test('no canonical Audit candidate rejects repair preview without writes', async () => {
  const source = memorySource([formalAction({ fields: { 'Audit Record ID': '', 'Operation ID': 'Unknown' } })], []);
  const issue = checkActionAuditConsistency({ projects: source.projects, audits: source.audits }).results.find(({ category }) => category === 'action-missing-audit');
  assert.equal(issue.safe, false); assert.deepEqual(issue.candidateAuditRecordIds, []);
  await assert.rejects(previewActionAuditRepair({ issue, actor, req, env, dataSource: source }), { code: 'REPAIR_NOT_SAFE' });
  assert.equal(source.projects[0].fields['Audit Record ID'], '');
});

test('partial migration failure is audited and the same confirmed batch safely resumes remaining records', async () => {
  const source = memorySource(); const upsertAudit = source.upsertAudit.bind(source); let failLegacyOnce = true;
  source.upsertAudit = async (fields) => {
    if (fields['Record Type'] === 'migrated' && failLegacyOnce) { failLegacyOnce = false; throw Object.assign(new Error('temporary'), { code: 'DATA_SOURCE_REQUEST_FAILED' }); }
    return upsertAudit(fields);
  };
  const preview = await previewLegacyMigration({ actor, req, env, dataSource: source });
  const body = { confirm: true, migrationBatchId: preview.migrationBatchId, payloadHash: preview.payloadHash, confirmationToken: preview.confirmationToken };
  const partial = await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  assert.equal(partial.executionStatus, 'partial_failure'); assert.equal(partial.failedCount, 1);
  const resumed = await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  assert.equal(resumed.executionStatus, 'succeeded'); assert.equal(source.audits.filter(({ recordType }) => recordType === 'migrated').length, 1);
});

test('execute performs zero writes until complete schema and payload preflight succeeds', async () => {
  const source = memorySource(); let writes = 0;
  const inspectSchema = source.inspectSchema.bind(source);
  source.inspectSchema = async () => (await inspectSchema()).map((table) => table.role === 'audit' ? { ...table, fields: table.fields.filter(({ name }) => name !== 'Tool ID') } : table);
  for (const method of ['createAudit', 'upsertAudit', 'updateProject']) {
    const original = source[method].bind(source); source[method] = async (...args) => { writes += 1; return original(...args); };
  }
  const preview = await previewLegacyMigration({ actor, req, env, dataSource: source });
  const body = { confirm: true, migrationBatchId: preview.migrationBatchId, payloadHash: preview.payloadHash, confirmationToken: preview.confirmationToken };
  await assert.rejects(executeLegacyMigration({ body, actor, req, env, dataSource: source }), { code: 'DATA_SOURCE_FIELD_MISSING', fieldName: 'Tool ID' });
  assert.equal(writes, 0);
});

test('preflight rejects a linked Audit field and a malformed linked-record payload precisely', () => {
  const schema = [
    { role: 'projects', tableId: 'projects', name: 'Projects', fields: [{ name: 'Audit Record ID', type: 'multipleRecordLinks' }] },
    { role: 'audit', tableId: 'audits', name: 'Audit', fields: [{ name: 'Tool ID', type: 'formula' }] },
  ];
  const report = validateMigrationPreflight({ schema, writes: [
    { kind: 'draft', tableRole: 'projects', fields: { 'Audit Record ID': 'not-an-array' } },
    { kind: 'audit', tableRole: 'audit', fields: { 'Tool ID': 'executeLegacyMigration' } },
  ] });
  assert.ok(report.issues.some(({ code, fieldName }) => code === 'DATA_SOURCE_LINK_INVALID' && fieldName === 'Audit Record ID'));
  assert.ok(report.issues.some(({ code, fieldName }) => code === 'DATA_SOURCE_FIELD_TYPE_INVALID' && fieldName === 'Tool ID'));
  assert.equal(report.writesPerformed, 0);
});

test('preflight reports linked table mismatch separately from canonical text-field mismatch', () => {
  const source = memorySource();
  return source.inspectSchema().then((schema) => {
    const projects = schema.find(({ role }) => role === 'projects');
    const auditId = projects.fields.find(({ name }) => name === 'Audit Record ID');
    Object.assign(auditId, { type: 'multipleRecordLinks', linkedTableId: 'tbl-wrong' });
    const report = validateMigrationPreflight({ schema, writes: [], target: source.describeTarget() });
    assert.ok(report.issues.some(({ code, fieldName }) => code === 'DATA_SOURCE_LINK_TARGET_INVALID' && fieldName === 'Audit Record ID'));
    assert.equal(report.writesPerformed, 0);
  });
});

test('canonical Action Type and Record Type use existing Production select choices', async () => {
  assert.equal(canonicalActionType('executeLegacyMigration'), 'execute');
  assert.equal(canonicalActionType('createActionDraft'), 'create');
  const source = memorySource(); const preview = await previewLegacyMigration({ actor, req, env, dataSource: source });
  const body = { confirm: true, migrationBatchId: preview.migrationBatchId, payloadHash: preview.payloadHash, confirmationToken: preview.confirmationToken };
  await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  const migrationAudits = source.audits.filter(({ toolId }) => toolId === 'executeLegacyMigration');
  const migrated = source.audits.find(({ recordType }) => recordType === 'migrated');
  assert.ok(migrationAudits.every(({ fields }) => fields['Action Type'] === 'execute'));
  assert.equal(migrated.fields['Action Type'], 'create'); assert.equal(migrated.fields['Record Type'], 'migrated');
});

test('schema-aligned text Audit Record ID and canonical selects pass with zero preflight writes', async () => {
  const source = memorySource(); const inspectSchema = source.inspectSchema.bind(source);
  source.inspectSchema = async () => (await inspectSchema()).map((table) => table.role !== 'audit' ? table : {
    ...table, fields: table.fields.map((field) => field.name === 'Action Type' ? { ...field, type: 'singleSelect', choices: ['create', 'read', 'update', 'delete', 'execute'] } : field.name === 'Record Type' ? { ...field, type: 'singleSelect', choices: ['formal', 'legacy', 'migrated'] } : field),
  });
  const report = await inspectMigrationSafety({ actor, dataSource: source });
  assert.equal(report.preflight.ok, true); assert.equal(report.preflight.checkedWriteCount, 4); assert.equal(report.preflight.writesPerformed, 0);
  const auditId = report.preflight.tables.find(({ role }) => role === 'projects').fields.find(({ fieldName }) => fieldName === 'Audit Record ID');
  assert.equal(auditId.actualType, 'singleLineText'); assert.equal(auditId.expectedType, 'singleLineText');
});

test('unsupported single-select choice blocks preflight without writing', async () => {
  const source = memorySource(); const inspectSchema = source.inspectSchema.bind(source);
  source.inspectSchema = async () => (await inspectSchema()).map((table) => table.role !== 'audit' ? table : {
    ...table, fields: table.fields.map((field) => field.name === 'Action Type' ? { ...field, type: 'singleSelect', choices: ['create'] } : field),
  });
  const report = await inspectMigrationSafety({ actor, dataSource: source });
  assert.equal(report.preflight.ok, false); assert.equal(report.preflight.writesPerformed, 0);
  assert.ok(report.preflight.issues.some(({ fieldName, detail }) => fieldName === 'Action Type' && detail === 'missing-select-choice:execute'));
});

test('existing v1 Draft is unchanged and duplicate execute creates no second migration audit', async () => {
  const v1 = formalAction({ id: 'rec-v1' }); const before = structuredClone(v1);
  const source = memorySource([legacyAudit(), v1]);
  const preview = await previewLegacyMigration({ actor, req, env, dataSource: source });
  const body = { confirm: true, migrationBatchId: preview.migrationBatchId, payloadHash: preview.payloadHash, confirmationToken: preview.confirmationToken };
  await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  const auditCount = source.audits.length;
  const replay = await executeLegacyMigration({ body, actor, req, env, dataSource: source });
  assert.deepEqual(source.projects.find(({ id }) => id === 'rec-v1'), before);
  assert.equal(replay.replayed, true); assert.equal(source.audits.length, auditCount);
});

test('Airtable 422 preserves safe upstream type and maps unknown field without leaking payload', async () => {
  const source = createAirtableMigrationDataSource({
    env: { AIRTABLE_API_KEY: 'secret-key', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_PROJECTS_TABLE_ID: 'projects', AIRTABLE_AUDIT_TABLE_ID: 'audits' },
    fetchImpl: async () => ({ ok: false, status: 422, json: async () => ({ error: { type: 'UNKNOWN_FIELD_NAME', message: 'Unknown field name: Tool ID secret-key' } }) }),
  });
  await assert.rejects(source.createAudit({ 'Tool ID': 'executeLegacyMigration' }), (error) => {
    assert.equal(error.code, 'DATA_SOURCE_FIELD_MISSING'); assert.equal(error.airtableErrorType, 'UNKNOWN_FIELD_NAME'); assert.equal(error.fieldName, 'Tool ID');
    assert.equal(JSON.stringify(error).includes('secret-key'), false); return true;
  });
});

test('partial-write inspection reports source, target, batch, operation, and duplicate evidence', async () => {
  const source = memorySource();
  source.audits.push({ id: 'rec-migrated', fields: { 'Audit ID': 'old-audit' }, auditId: 'old-audit', operationId: 'old-op', toolId: 'createActionDraft', recordType: 'migrated', sanitizedOutput: { migrationSourceRecordId: 'rec-legacy-audit', migrationBatchId: 'migration-old' } });
  source.audits.push({ ...structuredClone(source.audits[0]), id: 'rec-migrated-copy' });
  const report = await inspectMigrationSafety({ actor, dataSource: source });
  assert.equal(report.partialWrites.legacyAudits[0].state, 'written');
  assert.deepEqual(report.partialWrites.legacyAudits[0].targetAuditRecordIds, ['rec-migrated', 'rec-migrated-copy']);
  assert.deepEqual(report.partialWrites.legacyAudits[0].migrationBatchIds, ['migration-old']);
  assert.equal(report.partialWrites.duplicateAuditIds[0].key, 'old-audit');
});

test('partial-write evidence remains available when Airtable schema metadata permission is missing', async () => {
  const source = memorySource();
  source.inspectSchema = async () => { throw Object.assign(new Error('forbidden'), { code: 'DATA_SOURCE_SCHEMA_METADATA_FORBIDDEN', status: 403, airtableErrorType: 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND' }); };
  const report = await inspectMigrationSafety({ actor, dataSource: source });
  assert.equal(report.preflight.ok, false); assert.equal(report.preflight.writesPerformed, 0);
  assert.equal(report.preflight.issues[0].code, 'DATA_SOURCE_SCHEMA_METADATA_FORBIDDEN');
  assert.equal(report.partialWrites.legacyAudits[0].sourceRecordId, 'rec-legacy-audit');
  assert.equal(report.partialWrites.drafts[0].sourceRecordId, 'rec-legacy-draft');
});

test('dry-run skips an existing migrated Audit and existing Draft v1', async () => {
  const draft = legacyDraft(); draft.fields['Action Draft Schema Version'] = 'v1';
  const migrated = { id: 'rec-migrated', fields: { 'Audit ID': 'old-audit' }, auditId: 'old-audit', operationId: 'old-op', toolId: 'createActionDraft', recordType: 'migrated', sanitizedOutput: { migrationSourceRecordId: 'rec-legacy-audit', migrationBatchId: 'migration-old' } };
  const preview = await previewLegacyMigration({ actor, req, env, dataSource: memorySource([legacyAudit(), draft], [migrated]) });
  assert.deepEqual(preview.recordsToCreate, []); assert.deepEqual(preview.recordsToUpdate, []); assert.equal(preview.alreadyMigratedCount, 2);
});
