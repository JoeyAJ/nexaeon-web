import { adaptPublicApiItem, adaptPublicApiPayload } from './publicApiAdapter.js';

export function adaptAirtableItem(sourceId, item, payload = {}) {
  return adaptPublicApiItem(sourceId, item, { ...payload, source: 'airtable' });
}

export function adaptAirtablePayload(sourceId, payload = {}) {
  return adaptPublicApiPayload(sourceId, { ...payload, source: 'airtable' });
}
