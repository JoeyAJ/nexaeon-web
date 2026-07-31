import { AUDIT_RECORD_TYPE, AUDIT_SCHEMA_VERSION, normalizeAuditRecord } from './auditRepository.js';

export async function migrateLegacyAuditRecords({ legacyRecords = [], repository }) {
  if (!repository?.createAuditRecord || !repository?.getAuditRecord) throw Object.assign(new Error('migration_repository_invalid'), { code: 'MIGRATION_FAILED' });
  const summary = { scanned: legacyRecords.length, migrated: 0, duplicateSkipped: 0, failed: 0, errors: [] };
  for (const legacy of legacyRecords) {
    try {
      const normalized = normalizeAuditRecord({ ...legacy, schemaVersion: AUDIT_SCHEMA_VERSION, recordType: AUDIT_RECORD_TYPE.MIGRATED, auditPersistenceStatus: 'dedicated', source: 'legacy-projects-migration' });
      const existing = await repository.getAuditRecord(normalized.auditId);
      if (existing) { summary.duplicateSkipped += 1; continue; }
      await repository.createAuditRecord(normalized);
      summary.migrated += 1;
    } catch {
      summary.failed += 1;
      summary.errors.push({ auditId: String(legacy?.auditId || '').slice(0, 80), errorCode: 'MIGRATION_FAILED' });
    }
  }
  return summary;
}
