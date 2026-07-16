import { adaptPublicApiItem, adaptPublicApiPayload } from './publicApiAdapter.js';

export function adaptNotionItem(sourceId, item, payload = {}) {
  return adaptPublicApiItem(sourceId, item, { ...payload, source: 'notion' });
}

export function adaptNotionPayload(sourceId, payload = {}) {
  return adaptPublicApiPayload(sourceId, { ...payload, source: 'notion' });
}
