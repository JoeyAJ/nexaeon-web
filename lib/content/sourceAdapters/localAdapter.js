import { adaptPublicApiItem, adaptPublicApiPayload } from './publicApiAdapter.js';

export function adaptLocalItem(sourceId, item, payload = {}) {
  return adaptPublicApiItem(sourceId, item, { ...payload, source: 'fallback' });
}

export function adaptLocalPayload(sourceId, payload = {}) {
  return adaptPublicApiPayload(sourceId, { ...payload, source: 'fallback' });
}
