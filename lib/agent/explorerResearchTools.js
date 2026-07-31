import { getResearchLiterature } from '../researchLiterature.js';
import { isPublishedVisibility } from '../content/visibility.js';

export const EXPLORER_TOOL_NAMES = Object.freeze([
  'searchResearchItems',
  'getResearchItem',
  'filterResearchItems',
  'listResearchTopics',
]);

export const EXPLORER_TOOL_DEFINITIONS = Object.freeze([
  {
    type: 'function',
    name: 'searchResearchItems',
    description: 'Search public Research literature by keyword across titles, summaries, authors, theories, methods, variables, and usage.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Research keyword or question to search for.' },
        limit: { type: 'integer', minimum: 1, maximum: 12 },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'getResearchItem',
    description: 'Retrieve one public Research item by its public identifier.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The public Research item identifier.' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'filterResearchItems',
    description: 'Filter public Research items by topic, research method, or year range.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        method: { type: 'string' },
        yearFrom: { type: 'integer', minimum: 1900, maximum: 2200 },
        yearTo: { type: 'integer', minimum: 1900, maximum: 2200 },
        limit: { type: 'integer', minimum: 1, maximum: 12 },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'listResearchTopics',
    description: 'List topics represented by the currently public Research literature.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 30 },
      },
      additionalProperties: false,
    },
  },
]);

const TOOL_NAME_SET = new Set(EXPLORER_TOOL_NAMES);
const MAX_TOOL_ITEMS = 12;

function cleanText(value, limit = 2000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function cleanStringArray(value, limit = 40) {
  const input = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(input.map((item) => cleanText(item, 180)).filter(Boolean))].slice(0, limit);
}

function cleanLimit(value, fallback = 8, max = MAX_TOOL_ITEMS) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, max) : fallback;
}

function getLocalizedSummary(item) {
  if (item?.summary && typeof item.summary === 'object') {
    return {
      zh: cleanText(item.summary.zh || item.summaryZh || item.summary.en || item.summary.ko),
      ko: cleanText(item.summary.ko || item.summaryKo || item.summary.zh || item.summary.en),
      en: cleanText(item.summary.en || item.summaryEn || item.summary.zh || item.summary.ko),
    };
  }

  return {
    zh: cleanText(item?.summaryZh || item?.summary || item?.summaryEn || item?.summaryKo),
    ko: cleanText(item?.summaryKo || item?.summary || item?.summaryZh || item?.summaryEn),
    en: cleanText(item?.summaryEn || item?.summary || item?.summaryZh || item?.summaryKo),
  };
}

function getExplicitVisibility(item) {
  if (Object.prototype.hasOwnProperty.call(item || {}, 'visibility')) return item.visibility;
  if (Object.prototype.hasOwnProperty.call(item || {}, 'publicStatus')) return item.publicStatus;
  if (Object.prototype.hasOwnProperty.call(item || {}, '公開狀態')) return item['公開狀態'];
  return undefined;
}

export function normalizeResearchToolItem(item, sourcePlatform = 'fallback') {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const explicitVisibility = getExplicitVisibility(item);
  if (explicitVisibility !== undefined && !isPublishedVisibility(explicitVisibility)) return null;

  const id = cleanText(item.id, 240);
  const title = cleanText(item.title, 320);
  if (!id || !title) return null;

  const theoryModels = cleanStringArray(item.theoryModels);
  const variables = cleanStringArray(item.variables);
  const researchMethod = cleanText(item.researchMethod, 320);
  const topics = cleanStringArray([
    ...theoryModels,
    ...variables,
    researchMethod,
    item.sourceType,
  ]);

  return {
    id,
    title,
    authors: cleanStringArray(item.authors, 20),
    year: cleanText(item.year, 40),
    sourceType: cleanText(item.sourceType, 160) || 'research-literature',
    sourcePlatform: cleanText(sourcePlatform, 40) || 'fallback',
    theoryModels,
    researchMethod,
    variables,
    topics,
    summary: getLocalizedSummary(item),
    usage: cleanText(item.usage, 600),
    sourceUrl: cleanText(item.sourceUrl, 1000),
    sourceRoute: '/research/research-literature-database',
    updatedAt: cleanText(item.updatedAt, 80),
  };
}

export async function loadPublicResearchItems({
  getResearchLiteratureImpl = getResearchLiterature,
} = {}) {
  const payload = await getResearchLiteratureImpl();
  if (!payload || !Array.isArray(payload.items || payload.data)) {
    throw new Error('research_source_invalid');
  }

  const sourcePlatform = cleanText(payload.source, 40) || 'fallback';
  const items = (payload.items || payload.data)
    .map((item) => normalizeResearchToolItem(item, sourcePlatform))
    .filter(Boolean);

  return {
    sourcePlatform,
    reason: cleanText(payload.reason, 80) || null,
    items,
  };
}

function searchableText(item) {
  return [
    item.id,
    item.title,
    ...item.authors,
    item.year,
    item.sourceType,
    ...item.theoryModels,
    item.researchMethod,
    ...item.variables,
    ...item.topics,
    item.summary.zh,
    item.summary.ko,
    item.summary.en,
    item.usage,
  ].join(' ').toLocaleLowerCase();
}

function queryTokens(value) {
  const normalized = cleanText(value, 500).toLocaleLowerCase();
  const tokens = normalized.split(/[\s,，、;；:：()[\]{}]+/u).filter((token) => token.length > 1);
  return [...new Set(tokens)];
}

function extractYears(value) {
  return [...String(value || '').matchAll(/\b(19|20|21)\d{2}\b/g)].map((match) => Number(match[0]));
}

function includesText(value, query) {
  const needle = cleanText(query, 240).toLocaleLowerCase();
  return !needle || String(value || '').toLocaleLowerCase().includes(needle);
}

export function searchResearchItems(researchData, { query = '', limit } = {}) {
  const tokens = queryTokens(query);
  const ranked = researchData.items
    .map((item) => {
      const haystack = searchableText(item);
      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { item, score };
    })
    .filter(({ score }) => !tokens.length || score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, cleanLimit(limit))
    .map(({ item }) => item);

  return {
    ok: true,
    tool: 'searchResearchItems',
    sourcePlatform: researchData.sourcePlatform,
    count: ranked.length,
    items: ranked,
  };
}

export function getResearchItem(researchData, { id = '' } = {}) {
  const safeId = cleanText(id, 240);
  const item = researchData.items.find((candidate) => candidate.id === safeId);
  return {
    ok: true,
    tool: 'getResearchItem',
    sourcePlatform: researchData.sourcePlatform,
    count: item ? 1 : 0,
    items: item ? [item] : [],
  };
}

export function filterResearchItems(researchData, {
  topic = '',
  method = '',
  yearFrom,
  yearTo,
  limit,
} = {}) {
  const lowerYear = Number.isInteger(Number(yearFrom)) ? Number(yearFrom) : null;
  const upperYear = Number.isInteger(Number(yearTo)) ? Number(yearTo) : null;
  const items = researchData.items.filter((item) => {
    const topicMatches = !topic || includesText([...item.topics, item.title].join(' '), topic);
    const methodMatches = !method || includesText(item.researchMethod, method);
    const years = extractYears(item.year);
    const yearMatches = (!lowerYear && !upperYear) || years.some((year) => (
      (!lowerYear || year >= lowerYear) && (!upperYear || year <= upperYear)
    ));
    return topicMatches && methodMatches && yearMatches;
  }).slice(0, cleanLimit(limit));

  return {
    ok: true,
    tool: 'filterResearchItems',
    sourcePlatform: researchData.sourcePlatform,
    count: items.length,
    items,
  };
}

export function listResearchTopics(researchData, { limit } = {}) {
  const counts = new Map();
  for (const item of researchData.items) {
    for (const topic of item.topics) counts.set(topic, (counts.get(topic) || 0) + 1);
  }
  const topics = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, cleanLimit(limit, 20, 30))
    .map(([name, count]) => ({ name, count }));

  return {
    ok: true,
    tool: 'listResearchTopics',
    sourcePlatform: researchData.sourcePlatform,
    count: topics.length,
    topics,
    items: researchData.items.slice(0, MAX_TOOL_ITEMS),
  };
}

export function executeExplorerResearchTool(name, args, researchData) {
  if (!TOOL_NAME_SET.has(name)) throw new Error('explorer_tool_not_allowed');
  if (!researchData || !Array.isArray(researchData.items)) throw new Error('research_source_invalid');
  if (name === 'searchResearchItems') return searchResearchItems(researchData, args);
  if (name === 'getResearchItem') return getResearchItem(researchData, args);
  if (name === 'filterResearchItems') return filterResearchItems(researchData, args);
  return listResearchTopics(researchData, args);
}
