/* global process */

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const MARKER_PREFIX = '[NexAeon draft idempotency:';

export const ACTION_DRAFT_SCHEMA_VERSION = 'v1';
export const ACTION_DRAFT_FIELD_NAMES = Object.freeze([
  'Project Name', 'Public Summary', 'Draft Status', 'Operation ID', 'Idempotency Key', 'Created By',
  'Created Via Agent', 'Execution Status', 'Audit Record ID', 'Confirmation Timestamp', 'Source Tool ID',
  'Action Draft Schema Version',
]);
export const ACTION_DRAFT_STATUS = Object.freeze(['Draft', 'Pending Review']);
export const ACTION_EXECUTION_STATUS = Object.freeze(['Succeeded']);

function config(env) {
  const apiKey = env.AIRTABLE_API_KEY?.trim();
  const baseId = env.AIRTABLE_BASE_ID?.trim();
  const tableId = env.AIRTABLE_PROJECTS_TABLE_ID?.trim();
  if (!apiKey || !baseId || !tableId) throw Object.assign(new Error('missing_action_data_source'), { code: 'DATA_SOURCE_CONFIGURATION_MISSING' });
  return { apiKey, baseId, tableId };
}

function marker(idempotencyKey) { return `${MARKER_PREFIX}${idempotencyKey}]`; }

export function validateActionDraftSchema(fieldNames) {
  const existing = new Set(fieldNames || []);
  const missing = ACTION_DRAFT_FIELD_NAMES.filter((name) => !existing.has(name));
  if (missing.length) throw Object.assign(new Error('action_schema_invalid'), { code: 'ACTION_SCHEMA_INVALID', missing });
  return true;
}

function assertAllowedStatus(draftStatus, executionStatus) {
  if (!ACTION_DRAFT_STATUS.includes(draftStatus)) throw Object.assign(new Error('action_status_not_allowed'), { code: 'ACTION_STATUS_NOT_ALLOWED' });
  if (!ACTION_EXECUTION_STATUS.includes(executionStatus)) throw Object.assign(new Error('action_status_not_allowed'), { code: 'ACTION_STATUS_NOT_ALLOWED' });
}

function recordFields(payload, metadata = {}) {
  const draftStatus = metadata.draftStatus || 'Draft';
  const executionStatus = metadata.executionStatus || 'Succeeded';
  assertAllowedStatus(draftStatus, executionStatus);
  const fields = {
    'Project Name': `[Draft ${metadata.idempotencyKey.slice(0, 12)}] ${payload.title}`,
    'Public Summary': `${payload.description}\n\n${marker(metadata.idempotencyKey)}`,
    'Draft Status': draftStatus,
    'Operation ID': metadata.operationId,
    'Idempotency Key': metadata.idempotencyKey,
    'Created By': metadata.createdBy,
    'Created Via Agent': 'orchestrator',
    'Execution Status': executionStatus,
    'Confirmation Timestamp': metadata.confirmationTimestamp,
    'Source Tool ID': 'createActionDraft',
    'Action Draft Schema Version': ACTION_DRAFT_SCHEMA_VERSION,
  };
  for (const key of Object.keys(fields)) if (!ACTION_DRAFT_FIELD_NAMES.includes(key)) throw Object.assign(new Error('action_field_not_allowed'), { code: 'ACTION_FIELD_NOT_ALLOWED' });
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

async function airtableRequest(url, options, fetchImpl) {
  let response;
  try { response = await fetchImpl(url, options); } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    throw Object.assign(new Error(timedOut ? 'action_write_timeout' : 'action_write_failed'), { code: timedOut ? 'DATA_SOURCE_TIMEOUT' : 'DATA_SOURCE_REQUEST_FAILED' });
  }
  if (!response.ok) {
    const code = response.status === 422 ? 'ACTION_SCHEMA_INVALID' : 'DATA_SOURCE_REJECTED';
    throw Object.assign(new Error('action_write_rejected'), { code, status: response.status });
  }
  return response.json();
}

export async function createAirtableActionDraft({ payload, idempotencyKey, operationId, createdBy, confirmationTimestamp, env = process.env, fetchImpl = fetch, timeoutMs = 8_000 }) {
  const { apiKey, baseId, tableId } = config(env);
  const url = `${AIRTABLE_API_URL}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`;
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  const signal = AbortSignal.timeout(timeoutMs);
  const idMarker = marker(idempotencyKey);
  const lookupUrl = new URL(url);
  lookupUrl.searchParams.set('maxRecords', '1');
  lookupUrl.searchParams.set('filterByFormula', `OR({Idempotency Key}=${JSON.stringify(idempotencyKey)},FIND(${JSON.stringify(idMarker)}, {Public Summary}))`);
  const existing = await airtableRequest(lookupUrl, { headers, signal }, fetchImpl);
  if (existing.records?.[0]?.id) return { externalRecordId: existing.records[0].id, replayed: true, legacy: !existing.records[0].fields?.['Action Draft Schema Version'] };

  const fields = recordFields(payload, { idempotencyKey, operationId, createdBy, confirmationTimestamp });
  const result = await airtableRequest(url, {
    method: 'PATCH', headers, signal,
    body: JSON.stringify({ performUpsert: { fieldsToMergeOn: ['Idempotency Key'] }, records: [{ fields }], typecast: false }),
  }, fetchImpl);
  const externalRecordId = result.records?.[0]?.id;
  if (!externalRecordId) throw Object.assign(new Error('action_write_invalid_response'), { code: 'DATA_SOURCE_INVALID_RESPONSE' });
  return { externalRecordId, replayed: Boolean(result.updatedRecords?.length), legacy: false };
}

export async function linkAirtableActionDraftAudit({ externalRecordId, auditRecordId, env = process.env, fetchImpl = fetch, timeoutMs = 8_000 }) {
  if (!auditRecordId) throw Object.assign(new Error('audit_link_failed'), { code: 'AUDIT_LINK_FAILED' });
  const { apiKey, baseId, tableId } = config(env);
  const url = `${AIRTABLE_API_URL}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}/${encodeURIComponent(externalRecordId)}`;
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  try {
    await airtableRequest(url, { method: 'PATCH', headers, signal: AbortSignal.timeout(timeoutMs), body: JSON.stringify({ fields: { 'Audit Record ID': auditRecordId }, typecast: false }) }, fetchImpl);
  } catch (error) {
    throw Object.assign(new Error('audit_link_failed'), { code: 'AUDIT_LINK_FAILED', cause: error });
  }
  return { externalRecordId, auditRecordId };
}

export function getActionDraftFields(payload, idempotencyKey, metadata = {}) {
  return recordFields(payload, { ...metadata, idempotencyKey, operationId: metadata.operationId || 'assigned-on-confirmation', createdBy: metadata.createdBy || 'authenticated-admin', confirmationTimestamp: metadata.confirmationTimestamp || 'assigned-on-confirmation' });
}
