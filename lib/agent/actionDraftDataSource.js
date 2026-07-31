/* global process */

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const MARKER_PREFIX = '[NexAeon draft idempotency:';

function config(env) {
  const apiKey = env.AIRTABLE_API_KEY?.trim();
  const baseId = env.AIRTABLE_BASE_ID?.trim();
  const tableId = env.AIRTABLE_PROJECTS_TABLE_ID?.trim();
  if (!apiKey || !baseId || !tableId) throw Object.assign(new Error('missing_action_data_source'), { code: 'DATA_SOURCE_CONFIGURATION_MISSING' });
  return { apiKey, baseId, tableId };
}

function marker(idempotencyKey) {
  return `${MARKER_PREFIX}${idempotencyKey}]`;
}

function recordFields(payload, idempotencyKey) {
  return {
    'Project Name': `[Draft ${idempotencyKey.slice(0, 12)}] ${payload.title}`,
    'Public Summary': `${payload.description}\n\n${marker(idempotencyKey)}`,
  };
}

async function airtableRequest(url, options, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url, options);
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    throw Object.assign(new Error(timedOut ? 'action_write_timeout' : 'action_write_failed'), { code: timedOut ? 'DATA_SOURCE_TIMEOUT' : 'DATA_SOURCE_REQUEST_FAILED' });
  }
  if (!response.ok) throw Object.assign(new Error('action_write_rejected'), { code: 'DATA_SOURCE_REJECTED', status: response.status });
  return response.json();
}

export async function createAirtableActionDraft({ payload, idempotencyKey, env = process.env, fetchImpl = fetch, timeoutMs = 8_000 }) {
  const { apiKey, baseId, tableId } = config(env);
  const url = `${AIRTABLE_API_URL}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`;
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  const signal = AbortSignal.timeout(timeoutMs);
  const idMarker = marker(idempotencyKey);
  const formula = `FIND(${JSON.stringify(idMarker)}, {Public Summary})`;
  const lookupUrl = new URL(url);
  lookupUrl.searchParams.set('maxRecords', '1');
  lookupUrl.searchParams.set('filterByFormula', formula);
  const existing = await airtableRequest(lookupUrl, { headers, signal }, fetchImpl);
  if (existing.records?.[0]?.id) return { externalRecordId: existing.records[0].id, replayed: true };

  const result = await airtableRequest(url, {
    method: 'PATCH', headers, signal,
    body: JSON.stringify({
      performUpsert: { fieldsToMergeOn: ['Project Name'] },
      records: [{ fields: recordFields(payload, idempotencyKey) }],
      typecast: false,
    }),
  }, fetchImpl);
  const externalRecordId = result.records?.[0]?.id;
  if (!externalRecordId) throw Object.assign(new Error('action_write_invalid_response'), { code: 'DATA_SOURCE_INVALID_RESPONSE' });
  return { externalRecordId, replayed: Boolean(result.updatedRecords?.length) };
}

export function getActionDraftFields(payload, idempotencyKey) {
  return recordFields(payload, idempotencyKey);
}
