const FORMAL_ACTION_FIELDS = [
  'Draft Status', 'Operation ID', 'Idempotency Key', 'Created By', 'Created Via Agent',
  'Execution Status', 'Source Tool ID', 'Action Draft Schema Version',
];
const CONSISTENCY_CATEGORIES = ['consistent', 'action-missing-audit', 'audit-missing-action', 'link-mismatch', 'operation-mismatch', 'idempotency-mismatch', 'duplicate', 'legacy', 'unknown'];

function value(fields, name) { return String(fields?.[name] ?? '').trim(); }
function linkedIds(fields, name) {
  const raw = fields?.[name];
  const values = Array.isArray(raw) ? raw : raw === undefined || raw === null || raw === '' ? [] : [raw];
  return values.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}
function validProject(record) { return Boolean(record && typeof record === 'object' && !Array.isArray(record) && record.fields && typeof record.fields === 'object' && !Array.isArray(record.fields) && !record.malformed); }
function validAudit(record) { return Boolean(record && typeof record === 'object' && !Array.isArray(record) && typeof record.id === 'string' && record.id && !record.malformed); }
function known(valueToCheck) { return Boolean(valueToCheck && valueToCheck !== 'Unknown'); }
function isActionAudit(audit) { return audit.schemaVersion === 'v1' && audit.toolId === 'createActionDraft' && ['formal', 'migrated'].includes(audit.recordType || 'formal'); }

function safeText(input, limit = 1200) {
  return String(input ?? '')
    .replace(/(bearer\s+)[a-z0-9._~+/=-]+/giu, '$1[REDACTED]')
    .replace(/((?:token|secret|password|api[_ -]?key)\s*[:=]\s*)[^\s,;]+/giu, '$1[REDACTED]')
    .replace(/\s+/gu, ' ').trim().slice(0, limit);
}

function firstField(fields, names) {
  for (const name of names) if (fields?.[name] !== undefined && fields?.[name] !== null && fields?.[name] !== '') return fields[name];
  return '';
}

function isoTime(input) {
  const time = Date.parse(String(input || ''));
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function publicActionDetails(action) {
  const fields = action.fields || {};
  return {
    recordId: action.id,
    idempotencyKey: value(fields, 'Idempotency Key') || null,
    createdBy: value(fields, 'Created By') || null,
    createdViaAgent: value(fields, 'Created Via Agent') || null,
    sourceToolId: value(fields, 'Source Tool ID') || null,
    draftStatus: value(fields, 'Draft Status') || null,
    executionStatus: value(fields, 'Execution Status') || null,
    createdTime: isoTime(action.createdTime || firstField(fields, ['Created Time', 'Created At', 'Created'])) || null,
    updatedTime: isoTime(firstField(fields, ['Last Modified Time', 'Updated Time', 'Updated At', 'Last Modified', 'Modified Time'])) || null,
    legacyNotes: safeText(firstField(fields, ['Legacy Notes', 'Notes']), 1200) || null,
    sanitizedPayload: safeText(firstField(fields, ['Sanitized Input', 'Sanitized Output', 'Public Summary']), 2000) || null,
  };
}

function normalizedTokens(input) {
  return new Set(safeText(input, 6000).toLowerCase().split(/[^\p{L}\p{N}_-]+/u).filter((token) => token.length >= 6 && !['unknown', 'legacy', 'migration', 'createactiondraft'].includes(token)).slice(0, 120));
}

function auditTimestamp(audit) { return isoTime(firstField(audit.fields, ['Timestamp', 'Created Time', 'Created At']) || audit.createdTime); }

export function findForensicAuditCandidates(action, audits = []) {
  const details = publicActionDetails(action);
  const actionPayload = [action.fields?.['Project Name'], action.fields?.['Public Summary'], action.fields?.['Legacy Notes'], action.fields?.Notes].filter(Boolean).join(' ');
  const actionTokens = normalizedTokens(actionPayload);
  const actionTime = Date.parse(details.createdTime || '');
  const matches = audits.filter(isActionAudit).map((audit) => {
    const evidence = [];
    let score = 0;
    if (audit.externalRecordId === action.id) { score += 100; evidence.push({ field: 'External Record ID', weight: 100, match: 'exact' }); }
    if (known(details.idempotencyKey) && audit.idempotencyKey === details.idempotencyKey) { score += 70; evidence.push({ field: 'Idempotency Key', weight: 70, match: 'exact' }); }
    const actionOperation = value(action.fields, 'Operation ID');
    if (known(actionOperation) && audit.operationId === actionOperation) { score += 60; evidence.push({ field: 'Operation ID', weight: 60, match: 'exact' }); }
    if (details.createdViaAgent && audit.agentId === details.createdViaAgent) { score += 12; evidence.push({ field: 'Agent ID', weight: 12, match: 'exact' }); }
    if (details.sourceToolId && audit.toolId === details.sourceToolId) { score += 12; evidence.push({ field: 'Tool ID', weight: 12, match: 'exact' }); }
    const actorId = safeText(firstField(audit.fields, ['Actor ID']), 160);
    if (details.createdBy && actorId && actorId === details.createdBy) { score += 10; evidence.push({ field: 'Actor ID', weight: 10, match: 'exact' }); }
    const timestamp = auditTimestamp(audit);
    const auditTime = Date.parse(timestamp || '');
    if (Number.isFinite(actionTime) && Number.isFinite(auditTime)) {
      const minutes = Math.abs(auditTime - actionTime) / 60000;
      if (minutes <= 5) { score += 20; evidence.push({ field: 'Created timestamp', weight: 20, match: 'within-5-minutes' }); }
      else if (minutes <= 30) { score += 12; evidence.push({ field: 'Created timestamp', weight: 12, match: 'within-30-minutes' }); }
      else if (minutes <= 1440) { score += 4; evidence.push({ field: 'Created timestamp', weight: 4, match: 'within-24-hours' }); }
    }
    const auditPayload = JSON.stringify({ input: audit.sanitizedInput, output: audit.sanitizedOutput });
    const auditTokens = normalizedTokens(auditPayload);
    const commonTokens = [...actionTokens].filter((token) => auditTokens.has(token)).slice(0, 8);
    if (commonTokens.length) {
      const weight = Math.min(18, 6 + commonTokens.length * 3); score += weight;
      evidence.push({ field: 'Sanitized payload fingerprint', weight, match: `${commonTokens.length}-token-overlap` });
    }
    return {
      auditRecordId: audit.id, matchScore: score, evidence, operationId: audit.operationId || null,
      externalRecordId: audit.externalRecordId || null, timestamp, agentId: audit.agentId || null,
      toolId: audit.toolId || null, actorId: actorId || null, executionStatus: audit.executionStatus || null,
    };
  }).filter(({ matchScore, evidence }) => matchScore >= 30 || evidence.some(({ field }) => ['External Record ID', 'Idempotency Key', 'Operation ID'].includes(field)))
    .sort((a, b) => b.matchScore - a.matchScore || a.auditRecordId.localeCompare(b.auditRecordId));
  return { actionDetails: details, matches };
}

function canonicalCandidates(action, audits) {
  const operationId = value(action.fields, 'Operation ID');
  const idempotencyKey = value(action.fields, 'Idempotency Key');
  const actionAudits = audits.filter(isActionAudit);
  const external = actionAudits.filter((audit) => audit.externalRecordId === action.id);
  let candidates; let basis;
  if (external.length) { candidates = external; basis = 'external-record-id'; }
  else if (known(operationId) && known(idempotencyKey)) {
    candidates = actionAudits.filter((audit) => audit.operationId === operationId && audit.idempotencyKey === idempotencyKey); basis = 'operation-id+idempotency-key';
  } else if (known(idempotencyKey)) {
    candidates = actionAudits.filter((audit) => audit.idempotencyKey === idempotencyKey); basis = 'idempotency-key';
  } else if (known(operationId)) {
    candidates = actionAudits.filter((audit) => audit.operationId === operationId); basis = 'operation-id';
  } else { candidates = []; basis = 'none'; }
  if (candidates.length > 1) {
    const succeeded = candidates.filter((audit) => audit.executionStatus === 'succeeded');
    if (succeeded.length === 1) { candidates = succeeded; basis += '+unique-succeeded-lifecycle'; }
  }
  return { candidates, basis };
}

function issue(category, action, audit, details = {}) {
  return {
    category,
    actionRecordId: action?.id || null,
    auditRecordId: audit?.id || null,
    operationId: value(action?.fields, 'Operation ID') || audit?.operationId || '',
    repairable: false,
    ...details,
  };
}

export function checkActionAuditConsistency({ projects = [], audits = [] } = {}) {
  if (!Array.isArray(projects) || !Array.isArray(audits)) throw Object.assign(new Error('consistency_input_invalid'), { code: 'CONSISTENCY_DATA_INVALID' });
  const malformedProjects = projects.filter((record) => !validProject(record));
  const malformedAudits = audits.filter((record) => !validAudit(record));
  const validProjects = projects.filter(validProject);
  const validAudits = audits.filter(validAudit);
  const actions = validProjects.filter((record) => value(record.fields, 'Action Draft Schema Version') === 'v1'
    || value(record.fields, 'Project Name').startsWith('[Draft '));
  const auditById = new Map(validAudits.map((audit) => [audit.id, audit]));
  const formalAudits = validAudits.filter(isActionAudit);
  const auditsByOperation = new Map();
  for (const audit of formalAudits) {
    const values = auditsByOperation.get(audit.operationId) || [];
    values.push(audit); auditsByOperation.set(audit.operationId, values);
  }
  const actionsByOperation = new Map();
  const actionsByIdempotency = new Map();
  for (const action of actions) {
    const operationId = value(action.fields, 'Operation ID');
    const values = actionsByOperation.get(operationId) || [];
    values.push(action); actionsByOperation.set(operationId, values);
    const idempotencyKey = value(action.fields, 'Idempotency Key');
    const idempotentActions = actionsByIdempotency.get(idempotencyKey) || [];
    idempotentActions.push(action); actionsByIdempotency.set(idempotencyKey, idempotentActions);
  }

  const results = [
    ...malformedProjects.map((record) => issue('unknown', { id: record?.id || null, fields: {} }, null, { reason: 'malformed-project-record', malformedReasons: record?.malformedReasons || ['record-invalid'] })),
    ...malformedAudits.map((record) => issue('unknown', null, { id: record?.id || null }, { reason: 'malformed-audit-record', malformedReasons: record?.malformedReasons || ['record-invalid'] })),
  ];
  const linkedAudits = new Set();
  for (const action of actions) {
    const fields = action.fields || {};
    if (value(fields, 'Action Draft Schema Version') !== 'v1') {
      const missingFields = [];
      if (!value(fields, 'Operation ID')) missingFields.push('Operation ID');
      if (linkedIds(fields, 'Audit Record ID').length === 0) missingFields.push('Audit Record ID');
      results.push(issue('legacy', action, null, { reason: missingFields.length ? 'legacy-fields-missing' : 'legacy-schema', missingFields }));
      continue;
    }
    const missingFields = FORMAL_ACTION_FIELDS.filter((name) => !value(fields, name));
    if (missingFields.length) {
      results.push(issue('unknown', action, null, { reason: 'missing-formal-fields', missingFields }));
      continue;
    }
    const auditRecordIds = linkedIds(fields, 'Audit Record ID');
    if (auditRecordIds.length > 1) {
      results.push(issue('unknown', action, null, { reason: 'multiple-audit-links', auditRecordIds }));
      continue;
    }
    const auditRecordId = auditRecordIds[0] || '';
    if (!auditRecordId) {
      const { candidates, basis } = canonicalCandidates(action, validAudits);
      const forensic = findForensicAuditCandidates(action, validAudits);
      const uniqueAction = (actionsByIdempotency.get(value(fields, 'Idempotency Key')) || []).length === 1;
      const safe = candidates.length === 1 && uniqueAction && (!candidates[0].externalRecordId || candidates[0].externalRecordId === action.id);
      const candidateMatches = forensic.matches;
      const recommendedAction = safe ? 'preview-unique-link-repair'
        : candidateMatches.length > 1 ? 'manual-review-required-ambiguous'
          : candidateMatches.length === 1 ? 'retain-unlinked-unless-strong-identity-is-proven'
            : 'retain-unlinked-history-and-document-migration-exception';
      results.push(issue('action-missing-audit', action, null, {
        repairable: safe,
        candidateAuditRecordId: candidates.length === 1 ? candidates[0].id : null,
        candidateAuditRecordIds: candidateMatches.map(({ auditRecordId }) => auditRecordId), candidateCount: candidateMatches.length,
        canonicalCandidateAuditRecordIds: candidates.map(({ id }) => id), candidateMatches,
        candidateOperationId: candidates.length === 1 ? candidates[0].operationId : null,
        candidateBasis: basis, actionDetails: forensic.actionDetails, safe, recommendedAction,
      }));
      continue;
    }
    const audit = auditById.get(auditRecordId);
    if (!audit) {
      results.push(issue('action-missing-audit', action, null));
      continue;
    }
    linkedAudits.add(audit.id);
    if (!audit.externalRecordId) {
      const idempotencyMatches = audit.idempotencyKey === value(fields, 'Idempotency Key');
      const succeededSibling = formalAudits.find((candidate) => candidate.id !== audit.id && candidate.operationId === audit.operationId && candidate.idempotencyKey === audit.idempotencyKey && candidate.executionStatus === 'succeeded' && candidate.externalRecordId === action.id);
      if (isActionAudit(audit) && idempotencyMatches && succeededSibling) {
        linkedAudits.add(succeededSibling.id);
        const sameOperation = audit.operationId === value(fields, 'Operation ID');
        results.push(issue('consistent', action, audit, { reason: sameOperation ? 'linked-preview-with-succeeded-lifecycle' : 'linked-retry-preview-with-succeeded-lifecycle', lifecycleOperationId: audit.operationId, lifecycleAuditRecordIds: [audit.id, succeededSibling.id], expectedAuditRecordId: audit.id, currentAuditRecordId: audit.id })); continue;
      }
      results.push(issue('link-mismatch', action, audit, { reason: 'audit-external-record-missing', repairable: false, safe: false, currentAuditRecordId: audit.id, expectedAuditRecordId: null })); continue;
    }
    if (audit.externalRecordId !== action.id) {
      const { candidates, basis } = canonicalCandidates(action, validAudits);
      results.push(issue('link-mismatch', action, audit, { reason: 'audit-points-to-different-action', repairable: false, safe: false, currentAuditRecordId: audit.id, expectedAuditRecordId: candidates.length === 1 ? candidates[0].id : null, candidateAuditRecordIds: candidates.map(({ id }) => id), candidateBasis: basis })); continue;
    }
    if (audit.operationId !== value(fields, 'Operation ID')) {
      results.push(issue('operation-mismatch', action, audit)); continue;
    }
    if (audit.idempotencyKey !== value(fields, 'Idempotency Key')) {
      results.push(issue('idempotency-mismatch', action, audit)); continue;
    }
    if (audit.agentId !== 'orchestrator' || audit.toolId !== 'createActionDraft' || audit.schemaVersion !== 'v1') {
      results.push(issue('unknown', action, audit, { reason: 'invalid-formal-audit' })); continue;
    }
    const actionSucceeded = value(fields, 'Execution Status') === 'Succeeded';
    const succeededEvent = formalAudits.some((candidate) => candidate.operationId === audit.operationId && candidate.executionStatus === 'succeeded' && candidate.externalRecordId === action.id);
    if (actionSucceeded && audit.executionStatus !== 'succeeded' && !succeededEvent) {
      results.push(issue('unknown', action, audit, { reason: 'status-mismatch' })); continue;
    }
    results.push(issue('consistent', action, audit));
  }

  for (const audit of formalAudits.filter((candidate) => candidate.externalRecordId || candidate.executionStatus === 'succeeded')) {
    if (linkedAudits.has(audit.id)) continue;
    const action = validProjects.find((record) => record.id === audit.externalRecordId);
    if (!audit.externalRecordId || !action) {
      const candidates = actionsByOperation.get(audit.operationId) || [];
      results.push(issue('audit-missing-action', candidates.length === 1 ? candidates[0] : null, audit, {
        repairable: !audit.externalRecordId && candidates.length === 1 && (auditsByOperation.get(audit.operationId) || []).length === 1,
        candidateActionRecordId: candidates.length === 1 ? candidates[0].id : null,
      }));
    }
  }

  const duplicateKeys = new Map();
  for (const action of actions) {
    const key = value(action.fields, 'Idempotency Key');
    if (!key || key === 'Unknown') continue;
    const items = duplicateKeys.get(key) || [];
    items.push(action); duplicateKeys.set(key, items);
  }
  for (const [idempotencyKey, items] of duplicateKeys) {
    if (items.length > 1) results.push(issue('duplicate', null, null, { reason: 'duplicate-action-idempotency-key', duplicateBasis: 'action-idempotency-key', idempotencyKey, actionRecordIds: items.map(({ id }) => id) }));
  }
  const auditsByAuditId = new Map();
  for (const audit of validAudits) {
    if (!audit.auditId) continue;
    const items = auditsByAuditId.get(audit.auditId) || [];
    items.push(audit); auditsByAuditId.set(audit.auditId, items);
  }
  for (const [auditId, items] of auditsByAuditId) {
    if (items.length > 1) results.push(issue('duplicate', null, null, { reason: 'duplicate-audit-id', duplicateBasis: 'audit-id', auditId, auditRecordIds: items.map(({ id }) => id) }));
  }
  const migratedBySource = new Map();
  for (const audit of validAudits.filter((item) => item.recordType === 'migrated')) {
    const sourceRecordId = String(audit.sanitizedOutput?.migrationSourceRecordId || '');
    if (!sourceRecordId) continue;
    migratedBySource.set(sourceRecordId, [...(migratedBySource.get(sourceRecordId) || []), audit]);
  }
  for (const [sourceRecordId, items] of migratedBySource) {
    if (items.length > 1) results.push(issue('duplicate', null, null, { reason: 'duplicate-migration-source', duplicateBasis: 'migration-source-record-id', sourceRecordId, auditRecordIds: items.map(({ id }) => id) }));
  }

  const counts = Object.fromEntries(CONSISTENCY_CATEGORIES.map((category) => [category, results.filter((item) => item.category === category).length]));
  return { checkedAt: new Date().toISOString(), actionCount: actions.length, auditCount: formalAudits.length, counts, results };
}

export function resolveSafeRepair({ issue: selected, projects = [], audits = [] }) {
  if (!selected || !selected.repairable || selected.safe === false) throw Object.assign(new Error('repair_not_safe'), { code: 'REPAIR_NOT_SAFE' });
  const action = projects.find(({ id }) => id === selected.actionRecordId);
  if (!action) throw Object.assign(new Error('repair_ambiguous'), { code: 'REPAIR_AMBIGUOUS' });
  if (linkedIds(action.fields, 'Audit Record ID').length) throw Object.assign(new Error('repair_not_safe'), { code: 'REPAIR_NOT_SAFE' });
  const { candidates, basis } = canonicalCandidates(action, audits);
  if (candidates.length !== 1) throw Object.assign(new Error('repair_ambiguous'), { code: 'REPAIR_AMBIGUOUS' });
  const audit = candidates[0];
  const operationId = audit.operationId;
  if (!known(operationId) || audit.toolId !== 'createActionDraft' || audit.schemaVersion !== 'v1') throw Object.assign(new Error('repair_not_safe'), { code: 'REPAIR_NOT_SAFE' });
  if (value(action.fields, 'Idempotency Key') !== audit.idempotencyKey) throw Object.assign(new Error('repair_not_safe'), { code: 'REPAIR_NOT_SAFE' });
  if (audit.externalRecordId && audit.externalRecordId !== action.id) throw Object.assign(new Error('repair_not_safe'), { code: 'REPAIR_NOT_SAFE' });
  const before = { action: { recordId: action.id, operationId: value(action.fields, 'Operation ID'), auditRecordId: null }, audit: { recordId: audit.id, externalRecordId: audit.externalRecordId || null } };
  const actionFields = { 'Audit Record ID': audit.id };
  if (!known(value(action.fields, 'Operation ID'))) actionFields['Operation ID'] = operationId;
  const updates = [{ target: 'action', recordId: action.id, fields: actionFields }];
  if (!audit.externalRecordId) updates.push({ target: 'audit', recordId: audit.id, fields: { 'External Record ID': action.id } });
  return {
    safe: true, reason: `unique-${basis}`, operationId, actionRecordId: action.id, auditRecordId: audit.id,
    before, after: { action: { recordId: action.id, operationId, auditRecordId: audit.id }, audit: { recordId: audit.id, externalRecordId: action.id } }, updates,
  };
}
