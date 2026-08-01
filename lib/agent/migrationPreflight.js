const LINK_TYPE = 'multipleRecordLinks';
const AUDIT_ID_TYPE = 'singleLineText';
const WRITABLE_TEXT_TYPES = new Set(['singleLineText', 'multilineText', 'email', 'url', 'phoneNumber', 'richText']);
const READ_ONLY_TYPES = new Set(['formula', 'rollup', 'lookup', 'count', 'createdTime', 'lastModifiedTime', 'createdBy', 'lastModifiedBy', 'autoNumber', 'button']);

const REQUIRED_FIELDS = Object.freeze({
  projects: ['Project Name', 'Action Draft Schema Version', 'Draft Status', 'Operation ID', 'Idempotency Key', 'Created By', 'Created Via Agent', 'Execution Status', 'Source Tool ID', 'Audit Record ID'],
  audit: ['Audit ID', 'Operation ID', 'Idempotency Key', 'Timestamp', 'Agent ID', 'Tool ID', 'Permission Level', 'Target Data Source', 'Action Type', 'Execution Status', 'Confirmation Status', 'Confirmation Timestamp', 'Actor ID', 'Actor Role', 'Actor Session Hash', 'Sanitized Input', 'Sanitized Output', 'External Record ID', 'Error Code', 'Duration Ms', 'Preview Hash', 'Requester Fingerprint', 'Audit Persistence Status', 'Created At', 'Schema Version', 'Record Type'],
});

function issue(code, role, fieldName, field, expected, detail) {
  return { code, tableRole: role, fieldName, actualType: field?.type || null, expectedType: expected, detail };
}

function valueIssue(role, field, value) {
  const type = field.type;
  if (READ_ONLY_TYPES.has(type)) return issue('DATA_SOURCE_FIELD_TYPE_INVALID', role, field.name, field, 'writable field', 'read-only-field');
  if (type === LINK_TYPE) {
    const valid = Array.isArray(value) && value.every((item) => typeof item === 'string' && /^rec[A-Za-z0-9]+$/u.test(item));
    return valid ? null : issue('DATA_SOURCE_LINK_INVALID', role, field.name, field, 'record ID array', 'linked-record-payload');
  }
  if (type === 'multipleSelects') return Array.isArray(value) ? null : issue('DATA_SOURCE_FIELD_TYPE_INVALID', role, field.name, field, 'array', 'multiple-select-payload');
  if (type === 'singleSelect') {
    if (typeof value !== 'string') return issue('DATA_SOURCE_FIELD_TYPE_INVALID', role, field.name, field, 'single select string', 'single-select-payload');
    if (field.choices?.length && !field.choices.includes(value)) return issue('DATA_SOURCE_FIELD_TYPE_INVALID', role, field.name, field, `one of: ${field.choices.join(', ')}`, `missing-select-choice:${value}`);
    return null;
  }
  if (['number', 'currency', 'percent', 'duration', 'rating'].includes(type)) return Number.isFinite(Number(value)) ? null : issue('DATA_SOURCE_FIELD_TYPE_INVALID', role, field.name, field, 'number', 'numeric-payload');
  if (type === 'checkbox') return typeof value === 'boolean' ? null : issue('DATA_SOURCE_FIELD_TYPE_INVALID', role, field.name, field, 'boolean', 'checkbox-payload');
  if (['date', 'dateTime'].includes(type)) return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? null : issue('DATA_SOURCE_FIELD_TYPE_INVALID', role, field.name, field, 'ISO date string', 'date-payload');
  if (WRITABLE_TEXT_TYPES.has(type)) return ['string', 'number', 'boolean'].includes(typeof value) ? null : issue('DATA_SOURCE_FIELD_TYPE_INVALID', role, field.name, field, 'scalar', 'text-payload');
  return null;
}

export function validateMigrationPreflight({ schema, writes = [], target = {} }) {
  const tables = new Map((schema || []).map((table) => [table.role, table]));
  const issues = [];
  const tableReports = [];
  for (const role of ['projects', 'audit']) {
    const table = tables.get(role);
    if (!table) {
      issues.push(issue('DATA_SOURCE_TABLE_MISSING', role, '', null, 'configured Airtable table', 'table-not-found'));
      continue;
    }
    const fields = new Map((table.fields || []).map((field) => [field.name, field]));
    for (const fieldName of REQUIRED_FIELDS[role]) {
      if (!fields.has(fieldName)) issues.push(issue('DATA_SOURCE_FIELD_MISSING', role, fieldName, null, 'existing writable field', 'field-not-found'));
      else if (role === 'projects' && fieldName === 'Audit Record ID' && fields.get(fieldName).type !== AUDIT_ID_TYPE) {
        const auditIdField = fields.get(fieldName);
        issues.push(issue('DATA_SOURCE_FIELD_TYPE_INVALID', role, fieldName, auditIdField, AUDIT_ID_TYPE, 'canonical-audit-record-id-is-text'));
        if (auditIdField.type === LINK_TYPE && auditIdField.linkedTableId !== target.auditTableId) issues.push(issue('DATA_SOURCE_LINK_TARGET_INVALID', role, fieldName, auditIdField, target.auditTableId, 'linked-table-mismatch'));
      }
    }
    tableReports.push({ role, tableId: table.tableId, tableName: table.name, fields: (table.fields || []).map((field) => ({
      fieldName: field.name, fieldId: field.id || null, actualType: field.type || null,
      expectedType: role === 'projects' && field.name === 'Audit Record ID' ? AUDIT_ID_TYPE : null,
      choices: field.choices || [], linkedTableId: field.linkedTableId || null, requiredByMigration: REQUIRED_FIELDS[role].includes(field.name),
    })) });
  }
  for (const write of writes) {
    const table = tables.get(write.tableRole);
    const fields = new Map((table?.fields || []).map((field) => [field.name, field]));
    for (const [fieldName, value] of Object.entries(write.fields || {})) {
      if (value === undefined || value === null || value === '') continue;
      const field = fields.get(fieldName);
      if (!field) {
        issues.push(issue('DATA_SOURCE_FIELD_MISSING', write.tableRole, fieldName, null, 'existing writable field', `write:${write.kind}`));
        continue;
      }
      const invalid = valueIssue(write.tableRole, field, value);
      if (invalid) issues.push({ ...invalid, writeKind: write.kind, sourceRecordId: write.sourceRecordId || null });
    }
  }
  const unique = [...new Map(issues.map((item) => [JSON.stringify(item), item])).values()];
  return {
    ok: unique.length === 0,
    target: { baseId: target.baseId || null, projectsTableId: target.projectsTableId || null, auditTableId: target.auditTableId || null },
    tables: tableReports,
    issues: unique,
    checkedWriteCount: writes.length,
    writeMethods: ['POST', 'PATCH'],
    writesPerformed: 0,
    schemaMappings: [
      { concept: 'Migration Batch ID', tableRole: 'audit', actualFieldName: 'Operation ID' },
      { concept: 'Migration Status', tableRole: 'audit', actualFieldName: 'Execution Status' },
      { concept: 'Audit Schema Version', tableRole: 'audit', actualFieldName: 'Schema Version' },
      { concept: 'Audit Record Reference', tableRole: 'projects', actualFieldName: 'Audit Record ID', expectedType: AUDIT_ID_TYPE, payloadFormat: 'Airtable record ID string' },
      { concept: 'Action Draft Schema Version', tableRole: 'projects', actualFieldName: 'Action Draft Schema Version' },
    ],
  };
}

export function assertMigrationPreflight(report) {
  if (report.ok) return report;
  const first = report.issues[0];
  throw Object.assign(new Error('migration_preflight_failed'), {
    code: first.code, tableRole: first.tableRole, fieldName: first.fieldName,
    actualType: first.actualType, expectedType: first.expectedType,
  });
}

export function prepareFieldsForSchema(fields, table) {
  const definitions = new Map((table?.fields || []).map((field) => [field.name, field]));
  return Object.fromEntries(Object.entries(fields || {}).map(([name, value]) => {
    const field = definitions.get(name);
    if (field?.type === LINK_TYPE && typeof value === 'string' && value) return [name, [value]];
    return [name, value];
  }));
}
