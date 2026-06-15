import {
  expandQueryWithSynonyms,
  getSourceIntentRank,
  normalizeText,
  tokenizeForSearch,
} from './queryNormalization.js';

export const MAX_QUERY_LENGTH = 300;
const DEFAULT_LIMIT = 8;
const FIELD_WEIGHTS = {
  title: 14,
  tags: 8,
  summary: 6,
  searchAliases: 3,
  itemType: 2,
  content: 2,
  status: 1,
  sourceLabel: 1,
  moduleLabel: 1,
};

export function normalizeQuery(value) {
  return normalizeText(value, MAX_QUERY_LENGTH);
}

function tokenize(query) {
  return tokenizeForSearch(query);
}

function getFieldText(document, field) {
  if (field === 'tags') return (document.tags || []).join(' ');
  if (field === 'searchAliases') return (document.searchAliases || []).join(' ');
  return String(document[field] || '');
}

function scoreField(fieldText, query, expandedQuery, tokens, weight) {
  const text = normalizeText(fieldText, 6000);
  if (!text || !query) return 0;

  let score = 0;
  if (text.includes(query)) score += weight * 4;
  if (expandedQuery !== query && text.includes(expandedQuery)) score += weight * 2;

  for (const token of tokens) {
    if (!token || !text.includes(token)) continue;
    score += weight;
  }

  return score;
}

function normalizeDedupeText(value) {
  return normalizeText(value, 240)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createDedupeKeys(document) {
  const id = normalizeDedupeText(document.id);
  const sourceUrl = normalizeDedupeText(document.sourceUrl);
  const canonical = normalizeDedupeText(document.canonicalId || document.slug || document.recordId);
  const title = normalizeDedupeText(document.title);
  const summary = normalizeDedupeText(document.summary).slice(0, 120);
  return [
    id ? `id:${id}` : '',
    sourceUrl ? `url:${sourceUrl}` : '',
    canonical ? `canonical:${canonical}` : '',
    title && summary ? `title-summary:${title}:${summary}` : '',
    title && !summary ? `title:${document.sourceId}:${title}` : '',
  ].filter(Boolean);
}

function getUpdatedTime(document) {
  const time = new Date(document.updatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function createExcerpt(document, query, tokens) {
  const candidates = [document.summary, document.content, document.title].filter(Boolean);
  const lowerQuery = query.toLowerCase();

  for (const candidate of candidates) {
    const text = String(candidate);
    const lower = text.toLowerCase();
    const index = lower.indexOf(lowerQuery);
    if (index >= 0) {
      const start = Math.max(0, index - 80);
      return text.slice(start, start + 220).trim();
    }
  }

  for (const token of tokens) {
    for (const candidate of candidates) {
      const text = String(candidate);
      const index = text.toLowerCase().indexOf(token);
      if (index >= 0) {
        const start = Math.max(0, index - 80);
        return text.slice(start, start + 220).trim();
      }
    }
  }

  return String(document.summary || document.content || document.title || '').slice(0, 220).trim();
}

export function retrieveKnowledge(documents = [], queryValue = '', options = {}) {
  const query = normalizeQuery(queryValue);
  if (!query) return [];

  const expandedQuery = expandQueryWithSynonyms(query);
  const tokens = tokenize(expandedQuery);
  if (!tokens.length) return [];

  const moduleFilter = options.moduleKey || options.sourceId || '';
  const queryIntent = options.queryIntent || {};
  const sourceIntents = Array.isArray(queryIntent.sourceIntents)
    ? queryIntent.sourceIntents
    : queryIntent.sourceIntent
      ? [queryIntent.sourceIntent]
      : [];
  const limit = Math.max(1, Math.min(Number(options.limit) || DEFAULT_LIMIT, 20));
  const seen = new Set();

  return documents
    .filter((document) => {
      if (!document?.id) return false;
      if (moduleFilter && document.moduleKey !== moduleFilter && document.sourceId !== moduleFilter) return false;
      const keys = createDedupeKeys(document);
      if (keys.some((key) => seen.has(key))) return false;
      keys.forEach((key) => seen.add(key));
      return true;
    })
    .map((document) => {
      const matchedFields = [];
      let score = 0;

      for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
        const fieldScore = scoreField(getFieldText(document, field), query, expandedQuery, tokens, weight);
        if (fieldScore > 0) {
          matchedFields.push(field);
          score += fieldScore;
        }
      }

      const sourceRank = getSourceIntentRank(sourceIntents, document.sourceId);
      if (Number.isFinite(sourceRank)) {
        score += 30 - Math.min(sourceRank, 6);
        matchedFields.push('moduleIntent');
      }
      if (String(document.status || '').toLowerCase().includes('published')) score += 2;
      if (document.title && normalizeText(document.title).includes(query)) score += 12;

      if (score <= 0) return null;

      return {
        document,
        score,
        matchedFields,
        excerpt: createExcerpt(document, query, tokens),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const sourceRankDiff = getSourceIntentRank(sourceIntents, a.document.sourceId) - getSourceIntentRank(sourceIntents, b.document.sourceId);
      if (Number.isFinite(sourceRankDiff) && sourceRankDiff !== 0) return sourceRankDiff;
      const updatedDifference = getUpdatedTime(b.document) - getUpdatedTime(a.document);
      if (updatedDifference) return updatedDifference > 0 ? 1 : -1;
      if ((a.document.sortOrder || 0) !== (b.document.sortOrder || 0)) return (a.document.sortOrder || 0) - (b.document.sortOrder || 0);
      if (a.document.sourceId !== b.document.sourceId) return String(a.document.sourceId).localeCompare(String(b.document.sourceId));
      return String(a.document.id).localeCompare(String(b.document.id));
    })
    .slice(0, limit);
}
