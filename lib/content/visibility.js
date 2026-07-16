export const VISIBILITY_STATUS = Object.freeze({
  PUBLISHED: 'published',
  DRAFT: 'draft',
  HIDDEN: 'hidden',
});

const PUBLISHED_VALUES = new Set(['published', 'publish', 'live', 'public']);
const DRAFT_VALUES = new Set(['draft', 'unpublished', 'wip', 'in progress']);
const HIDDEN_VALUES = new Set(['hidden', 'private', 'internal', 'archived', 'archive']);

function statusText(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value.name || value.value || '';
  return value;
}

export function normalizeVisibilityStatus(value, fallback = VISIBILITY_STATUS.HIDDEN) {
  const normalized = String(statusText(value) || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (PUBLISHED_VALUES.has(normalized)) return VISIBILITY_STATUS.PUBLISHED;
  if (DRAFT_VALUES.has(normalized)) return VISIBILITY_STATUS.DRAFT;
  if (HIDDEN_VALUES.has(normalized)) return VISIBILITY_STATUS.HIDDEN;
  return fallback;
}

export function isPublishedVisibility(value) {
  return normalizeVisibilityStatus(value) === VISIBILITY_STATUS.PUBLISHED;
}

export function filterPublishedContent(items = []) {
  return items.filter((item) => item?.status === VISIBILITY_STATUS.PUBLISHED);
}

