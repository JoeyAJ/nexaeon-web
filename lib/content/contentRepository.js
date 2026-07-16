import { resolveLocalizedText } from './localization.js';
import { adaptPublicApiPayload } from './sourceAdapters/publicApiAdapter.js';
import { filterPublishedContent } from './visibility.js';

function updatedTime(item) {
  const time = new Date(item.updatedAt || item.publishedAt || item.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function deduplicate(items) {
  const byId = new Map();
  for (const item of items) {
    const current = byId.get(item.id);
    if (!current || updatedTime(item) > updatedTime(current)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

function stableSort(items) {
  return items.sort((a, b) => updatedTime(b) - updatedTime(a) || a.id.localeCompare(b.id));
}

function localizedView(item, locale, includeMetadata) {
  return {
    ...item,
    localized: {
      title: resolveLocalizedText(item.title, locale), summary: resolveLocalizedText(item.summary, locale),
      description: resolveLocalizedText(item.description, locale), content: resolveLocalizedText(item.content, locale),
    },
    ...(includeMetadata ? {} : { metadata: undefined }),
  };
}

export function createContentRepository({ items = [], warnings = [], sources = [] } = {}) {
  const publishedItems = stableSort(deduplicate(filterPublishedContent(items)));

  function list(options = {}) {
    const { module, contentType, source, tags = [], categories = [], locale, limit = 100, offset = 0, includeMetadata = false } = options;
    const requiredTags = new Set(tags.map((value) => String(value).toLowerCase()));
    const requiredCategories = new Set(categories.map((value) => String(value).toLowerCase()));
    const filtered = publishedItems.filter((item) => {
      if (module && item.module !== module) return false;
      if (contentType && item.contentType !== contentType) return false;
      if (source && item.source !== source) return false;
      if (requiredTags.size && !item.tags.some((tag) => requiredTags.has(tag.toLowerCase()))) return false;
      if (requiredCategories.size && !item.categories.some((category) => requiredCategories.has(category.toLowerCase()))) return false;
      return true;
    });
    const start = Math.max(0, Number(offset) || 0);
    const size = Math.min(500, Math.max(0, Number(limit) || 0));
    const page = filtered.slice(start, start + size);
    return locale ? page.map((item) => localizedView(item, locale, includeMetadata)) : page;
  }

  return Object.freeze({
    list,
    getContentByModule: (module, options = {}) => list({ ...options, module }),
    getContentByType: (contentType, options = {}) => list({ ...options, contentType }),
    getContentBySlug: (slug, options = {}) => list({ ...options, limit: 500 }).find((item) => item.slug === slug) || null,
    searchContent(query, options = {}) {
      const needle = String(query || '').trim().toLowerCase();
      if (!needle) return [];
      return list({ ...options, limit: 500, includeMetadata: true }).filter((item) => [
        resolveLocalizedText(item.title, options.locale), resolveLocalizedText(item.summary, options.locale),
        resolveLocalizedText(item.description, options.locale), resolveLocalizedText(item.content, options.locale),
        item.tags.join(' '), item.categories.join(' '),
      ].join(' ').toLowerCase().includes(needle)).slice(0, Math.min(options.limit || 20, 100));
    },
    getAgentContext(sourceScopes = [], options = {}) {
      const scopes = new Set(sourceScopes);
      return list({ ...options, limit: options.limit || 50, includeMetadata: true })
        .filter((item) => scopes.has(item.metadata?.agentSourceId));
    },
    diagnostics: Object.freeze({ warnings, sources, publishedCount: publishedItems.length }),
  });
}

export function createContentRepositoryFromPublicPayloads(payloads = {}) {
  const items = [];
  const warnings = [];
  const sources = [];
  for (const [sourceId, payload] of Object.entries(payloads)) {
    const adapted = adaptPublicApiPayload(sourceId, payload);
    items.push(...adapted.items);
    warnings.push(...adapted.warnings);
    sources.push({ sourceId, source: adapted.source, partial: adapted.partial, count: adapted.items.length });
  }
  return createContentRepository({ items, warnings, sources });
}

