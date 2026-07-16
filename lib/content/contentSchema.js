import { normalizeLocalizedText, resolveLocalizedText } from './localization.js';
import { normalizeVisibilityStatus, VISIBILITY_STATUS } from './visibility.js';

export const CONTENT_SOURCES = Object.freeze(['notion', 'airtable', 'local', 'fallback', 'public_api']);
export const CONTENT_MODULES = Object.freeze(['identity', 'research', 'coaching', 'knowledge', 'prototype', 'action']);
export const CONTENT_TYPES = Object.freeze([
  'identity_profile', 'research_literature', 'research_model', 'methodology', 'scale',
  'course', 'coaching_material', 'knowledge_note', 'inspiration', 'brand_content',
  'prototype', 'demo', 'task', 'milestone', 'collaboration_option',
]);

const SENSITIVE_METADATA_KEYS = new Set([
  'apikey', 'token', 'secret', 'databaseid', 'baseid', 'tableid', 'recordid', 'notes',
  'owner', 'blockers', 'email', 'visibility', 'publicstatus', 'raw', 'properties',
]);

function cleanString(value, maxLength = 2000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function normalizeStringArray(value, limit = 50) {
  const input = Array.isArray(value) ? value.flat(Infinity) : value ? [value] : [];
  const seen = new Set();
  const output = [];
  for (const raw of input) {
    const text = cleanString(raw, 160);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    output.push(text);
    if (output.length >= limit) break;
  }
  return output;
}

export function normalizeIsoDate(value) {
  const text = cleanString(value, 80);
  if (!text) return undefined;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : date.toISOString();
}

function normalizePublicUrl(value) {
  const text = cleanString(value, 1000);
  if (!text) return undefined;
  if (text.startsWith('/') && !text.startsWith('//')) return text;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    if (/(^|\.)airtable\.com$|(^|\.)notion\.so$/u.test(url.hostname)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function metadataKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function sanitizeContentMetadata(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 4) return {};
  const output = {};
  for (const [key, raw] of Object.entries(value)) {
    if (SENSITIVE_METADATA_KEYS.has(metadataKey(key))) continue;
    if (raw === null || ['string', 'number', 'boolean'].includes(typeof raw)) {
      output[key] = typeof raw === 'string' ? cleanString(raw, 1000) : raw;
    } else if (Array.isArray(raw)) {
      output[key] = raw.slice(0, 50).map((item) => (
        item && typeof item === 'object' ? sanitizeContentMetadata(item, depth + 1) : item
      ));
    } else if (typeof raw === 'object') {
      output[key] = sanitizeContentMetadata(raw, depth + 1);
    }
  }
  return output;
}

export function validateContentItem(input) {
  const issues = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, issues: ['invalid_item'] };
  if (!cleanString(input.id, 240)) issues.push('missing_id');
  if (!CONTENT_SOURCES.includes(input.source)) issues.push('invalid_source');
  if (!CONTENT_MODULES.includes(input.module)) issues.push('invalid_module');
  if (!CONTENT_TYPES.includes(input.contentType)) issues.push('invalid_content_type');
  if (!resolveLocalizedText(input.title, 'zh-Hant')) issues.push('missing_title');
  if (!Object.values(VISIBILITY_STATUS).includes(input.status)) issues.push('invalid_visibility');
  return { ok: issues.length === 0, issues };
}

export function createContentItem(input, { trustedPublic = false } = {}) {
  const explicitVisibility = input?.visibility ?? input?.publicStatus;
  const item = {
    id: cleanString(input?.id, 240),
    source: CONTENT_SOURCES.includes(input?.source) ? input.source : 'public_api',
    sourceId: cleanString(input?.sourceId, 240) || undefined,
    module: input?.module,
    contentType: input?.contentType,
    slug: cleanString(input?.slug, 240) || undefined,
    title: normalizeLocalizedText(input?.title),
    summary: normalizeLocalizedText(input?.summary),
    description: normalizeLocalizedText(input?.description),
    content: normalizeLocalizedText(input?.content),
    status: explicitVisibility === undefined && trustedPublic
      ? VISIBILITY_STATUS.PUBLISHED
      : normalizeVisibilityStatus(explicitVisibility),
    workflowStatus: cleanString(input?.workflowStatus, 160) || undefined,
    tags: normalizeStringArray(input?.tags),
    categories: normalizeStringArray(input?.categories),
    publishedAt: normalizeIsoDate(input?.publishedAt),
    updatedAt: normalizeIsoDate(input?.updatedAt),
    createdAt: normalizeIsoDate(input?.createdAt),
    url: normalizePublicUrl(input?.url),
    sourceUrl: normalizePublicUrl(input?.sourceUrl),
    demoUrl: normalizePublicUrl(input?.demoUrl),
    githubUrl: normalizePublicUrl(input?.githubUrl),
    metadata: sanitizeContentMetadata(input?.metadata),
  };
  const validation = validateContentItem(item);
  return validation.ok ? { ok: true, item, issues: [] } : { ok: false, item: null, issues: validation.issues };
}

