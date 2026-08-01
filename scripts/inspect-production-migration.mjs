import { createAirtableMigrationDataSource } from '../lib/agent/migrationDataSource.js';
import { inspectMigrationSafety, previewLegacyMigration, runConsistencyCheck } from '../lib/agent/legacyMigrationRuntime.js';

const dataSource = createAirtableMigrationDataSource();
let schema = [];
let schemaError = null;
try { schema = await dataSource.inspectSchema(); } catch (error) { schemaError = error?.code || 'SCHEMA_INSPECTION_UNAVAILABLE'; }
const req = { headers: { 'x-forwarded-for': '127.0.0.1', 'user-agent': 'nexaeon-production-dry-run' } };
const actor = { actorId: 'production-dry-run', role: 'admin', sessionId: 'read-only-inspection' };
const preview = await previewLegacyMigration({ actor, req, dataSource });
const consistency = await runConsistencyCheck({ dataSource });
const safety = await inspectMigrationSafety({ actor, dataSource });
const safeSchema = schema.map((table) => ({ role: table.role, tableId: table.tableId, name: table.name, primaryField: table.fields.find(({ isPrimary }) => isPrimary)?.name || null, fields: table.fields.map(({ id, name, type, linkedTableId, choices }) => ({ id, name, type, linkedTableId: linkedTableId || null, choices })) }));

console.log(JSON.stringify({
  mode: 'read-only', schema: safeSchema, schemaError,
  dryRun: {
    migrationBatchId: preview.migrationBatchId,
    legacyAuditCount: preview.legacyAuditCount,
    legacyDraftCount: preview.legacyDraftCount,
    alreadyMigratedCount: preview.alreadyMigratedCount,
    duplicateSkipCount: preview.duplicateSkipCount,
    invalidRecordCount: preview.invalidRecordCount,
    recordsToCreate: preview.recordsToCreate.length,
    recordsToUpdate: preview.recordsToUpdate.length,
    recordsToSkip: preview.recordsToSkip.length,
    warnings: preview.warnings.map(({ code }) => code),
    estimatedWrites: preview.estimatedWrites,
    rollbackSupport: preview.rollbackSupport,
    sourceRecordsDeleted: preview.sourceRecordsDeleted,
    primaryFieldsChanged: preview.primaryFieldsChanged,
    expiresAt: preview.expiresAt,
  },
  consistency: { actionCount: consistency.actionCount, auditCount: consistency.auditCount, counts: consistency.counts },
  preflight: safety.preflight,
  partialWrites: safety.partialWrites,
}, null, 2));
