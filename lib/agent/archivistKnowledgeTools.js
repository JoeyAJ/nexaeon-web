import { getKnowledgeResources } from '../knowledgeResources.js';
import { isPublishedVisibility } from '../content/visibility.js';

export const ARCHIVIST_TOOL_NAMES = Object.freeze([
  'searchKnowledgeItems',
  'getKnowledgeItem',
  'filterKnowledgeItems',
  'listKnowledgeTopics',
  'findRelatedKnowledge',
  'groupKnowledgeByTheme',
]);

export const ARCHIVIST_TOOL_DEFINITIONS = Object.freeze([
  {
    type: 'function',
    name: 'searchKnowledgeItems',
    description: 'Search currently public Knowledge Lab items by keyword across title, summary, type, topic, source, tags, and year.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 12 },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'getKnowledgeItem',
    description: 'Retrieve one currently public Knowledge Lab item by its public identifier.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'filterKnowledgeItems',
    description: 'Filter currently public Knowledge Lab items by topic, content type, source database, source platform, tag, or year.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        contentType: { type: 'string' },
        source: { type: 'string' },
        tag: { type: 'string' },
        year: { type: 'integer', minimum: 1900, maximum: 2200 },
        limit: { type: 'integer', minimum: 1, maximum: 12 },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'listKnowledgeTopics',
    description: 'List topics and tags represented by currently public Knowledge Lab items.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 30 } },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'findRelatedKnowledge',
    description: 'Find explicit database relations and clearly labeled possible relations based on shared public tags, topics, or keywords.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 12 },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'groupKnowledgeByTheme',
    description: 'Group currently public Knowledge Lab items into deterministic themes using existing categories, topics, and tags.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 12 },
      },
      additionalProperties: false,
    },
  },
]);

const TOOL_NAME_SET = new Set(ARCHIVIST_TOOL_NAMES);
const MAX_TOOL_ITEMS = 12;

function cleanText(value, limit = 2000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function cleanStringArray(value, limit = 50) {
  const input = Array.isArray(value) ? value.flat(Infinity) : value ? [value] : [];
  const seen = new Set();
  const output = [];
  for (const raw of input) {
    const text = cleanText(raw, 200);
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    output.push(text);
    if (output.length >= limit) break;
  }
  return output;
}

function cleanLimit(value, fallback = 8, max = MAX_TOOL_ITEMS) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function localizedText(item, field) {
  const direct = item?.[field];
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    return {
      zh: cleanText(direct.zh || direct['zh-Hant'] || direct.en || direct.ko),
      ko: cleanText(direct.ko || direct.en || direct.zh || direct['zh-Hant']),
      en: cleanText(direct.en || direct.zh || direct['zh-Hant'] || direct.ko),
    };
  }
  return {
    zh: cleanText(item?.[`${field}Zh`] || direct || item?.[`${field}En`] || item?.[`${field}Ko`]),
    ko: cleanText(item?.[`${field}Ko`] || direct || item?.[`${field}En`] || item?.[`${field}Zh`]),
    en: cleanText(item?.[`${field}En`] || direct || item?.[`${field}Zh`] || item?.[`${field}Ko`]),
  };
}

function getExplicitVisibility(item) {
  for (const key of ['visibility', 'publicStatus', '公開狀態', 'Public Status']) {
    if (Object.prototype.hasOwnProperty.call(item || {}, key)) return item[key];
  }
  return undefined;
}

function yearFromItem(item) {
  const direct = cleanText(item?.year, 20);
  const match = [direct, item?.publishedAt, item?.updatedAt, item?.createdAt]
    .map((value) => String(value || '').match(/\b(19|20|21)\d{2}\b/)?.[0])
    .find(Boolean);
  return match ? Number(match) : null;
}

export function normalizeKnowledgeToolItem(item, sourcePlatform = 'fallback') {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const visibility = getExplicitVisibility(item);
  if (visibility !== undefined && !isPublishedVisibility(visibility)) return null;

  const id = cleanText(item.id, 240);
  const title = localizedText(item, 'title');
  const displayTitle = title.en || title.zh || title.ko;
  if (!id || !displayTitle) return null;

  const summary = localizedText(item, 'summary');
  const contentType = cleanText(item.contentType || item.type || item.sourceType, 180) || 'knowledge-note';
  const sourceDatabase = cleanText(item.sourceDatabase, 120) || 'knowledge';
  const category = cleanText(item.category, 240);
  const relatedModule = cleanText(item.relatedModule, 240);
  const tags = cleanStringArray(item.tags);
  const topics = cleanStringArray([category, relatedModule, ...tags]);

  return {
    id,
    title,
    displayTitle,
    summary,
    contentType,
    category,
    topics,
    tags,
    sourceDatabase,
    sourcePlatform: cleanText(sourcePlatform, 40) || 'fallback',
    sourceLabel: cleanText(item.sourceType || sourceDatabase, 180),
    relatedModule,
    year: yearFromItem(item),
    explicitRelationIds: cleanStringArray(
      item.explicitRelationIds || item.relatedKnowledgeIds || item.relatedIds || item.relations,
    ),
    sourceUrl: cleanText(item.url || item.sourceUrl || item.fileUrl, 1000),
    sourceRoute: '/knowledge-lab/knowledge-resources',
    createdAt: cleanText(item.createdAt, 80),
    updatedAt: cleanText(item.updatedAt, 80),
  };
}

export async function loadPublicKnowledgeItems({
  getKnowledgeResourcesImpl = getKnowledgeResources,
} = {}) {
  const payload = await getKnowledgeResourcesImpl();
  if (!payload || !Array.isArray(payload.items || payload.data)) throw new Error('knowledge_source_invalid');
  const sourcePlatform = cleanText(payload.source, 40) || 'fallback';
  return {
    sourcePlatform,
    reason: cleanText(payload.reason, 80) || null,
    items: (payload.items || payload.data)
      .map((item) => normalizeKnowledgeToolItem(item, sourcePlatform))
      .filter(Boolean),
  };
}

function searchableText(item) {
  return [
    item.id, item.displayTitle, item.title.zh, item.title.ko, item.title.en,
    item.summary.zh, item.summary.ko, item.summary.en, item.contentType,
    item.category, item.sourceDatabase, item.sourcePlatform, item.sourceLabel,
    item.relatedModule, item.year, ...item.topics, ...item.tags,
  ].join(' ').toLocaleLowerCase();
}

function queryTokens(value) {
  return [...new Set(cleanText(value, 500).toLocaleLowerCase()
    .split(/[\s,，、;；:：()[\]{}]+/u).filter((token) => token.length > 1))];
}

function includesText(value, query) {
  const needle = cleanText(query, 240).toLocaleLowerCase();
  return !needle || String(value || '').toLocaleLowerCase().includes(needle);
}

export function searchKnowledgeItems(data, { query = '', limit } = {}) {
  const tokens = queryTokens(query);
  const items = data.items.map((item) => ({
    item,
    score: tokens.reduce((total, token) => total + (searchableText(item).includes(token) ? 1 : 0), 0),
  }))
    .filter(({ score }) => !tokens.length || score > 0)
    .sort((a, b) => b.score - a.score || a.item.displayTitle.localeCompare(b.item.displayTitle))
    .slice(0, cleanLimit(limit))
    .map(({ item }) => item);
  return { ok: true, tool: 'searchKnowledgeItems', sourcePlatform: data.sourcePlatform, count: items.length, items };
}

export function getKnowledgeItem(data, { id = '' } = {}) {
  const safeId = cleanText(id, 240);
  const item = data.items.find((candidate) => candidate.id === safeId);
  return { ok: true, tool: 'getKnowledgeItem', sourcePlatform: data.sourcePlatform, count: item ? 1 : 0, items: item ? [item] : [] };
}

export function filterKnowledgeItems(data, filters = {}) {
  const year = Number(filters.year);
  const items = data.items.filter((item) => (
    includesText([item.category, item.relatedModule, ...item.topics].join(' '), filters.topic)
    && includesText(item.contentType, filters.contentType)
    && includesText([item.sourceDatabase, item.sourcePlatform, item.sourceLabel].join(' '), filters.source)
    && includesText(item.tags.join(' '), filters.tag)
    && (!Number.isInteger(year) || item.year === year)
  )).slice(0, cleanLimit(filters.limit));
  return { ok: true, tool: 'filterKnowledgeItems', sourcePlatform: data.sourcePlatform, count: items.length, items };
}

export function listKnowledgeTopics(data, { limit } = {}) {
  const counts = new Map();
  for (const item of data.items) {
    for (const topic of item.topics) counts.set(topic, (counts.get(topic) || 0) + 1);
  }
  const topics = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, cleanLimit(limit, 20, 30))
    .map(([name, count]) => ({ name, count }));
  return { ok: true, tool: 'listKnowledgeTopics', sourcePlatform: data.sourcePlatform, count: topics.length, topics, items: data.items.slice(0, MAX_TOOL_ITEMS) };
}

function relationIdMatches(candidate, relationId) {
  const normalized = cleanText(relationId, 240).toLocaleLowerCase();
  return normalized && (candidate.id.toLocaleLowerCase() === normalized || candidate.id.toLocaleLowerCase().endsWith(normalized));
}

function sharedValues(a, b) {
  const right = new Set([...b.tags, ...b.topics].map((value) => value.toLocaleLowerCase()));
  return [...new Set([...a.tags, ...a.topics].filter((value) => right.has(value.toLocaleLowerCase())))];
}

export function findRelatedKnowledge(data, { id = '', query = '', limit } = {}) {
  const base = id
    ? data.items.find((item) => item.id === cleanText(id, 240))
    : searchKnowledgeItems(data, { query, limit: 1 }).items[0];
  if (!base) return { ok: true, tool: 'findRelatedKnowledge', sourcePlatform: data.sourcePlatform, count: 0, items: [], relations: [] };

  const relations = data.items.filter((item) => item.id !== base.id).map((item) => {
    const explicit = base.explicitRelationIds.some((relationId) => relationIdMatches(item, relationId))
      || item.explicitRelationIds.some((relationId) => relationIdMatches(base, relationId));
    const evidence = sharedValues(base, item);
    if (!explicit && !evidence.length) return null;
    return {
      sourceId: base.id,
      targetId: item.id,
      relationType: explicit ? 'explicit_database_relation' : 'possible_shared_theme',
      confidence: explicit ? 1 : Math.min(0.85, 0.45 + evidence.length * 0.1),
      evidenceType: explicit ? 'database_explicit' : 'inferred_similarity',
      evidence,
      inferred: !explicit,
      item,
    };
  }).filter(Boolean)
    .sort((a, b) => Number(a.inferred) - Number(b.inferred) || b.confidence - a.confidence || a.targetId.localeCompare(b.targetId))
    .slice(0, cleanLimit(limit));

  return {
    ok: true,
    tool: 'findRelatedKnowledge',
    sourcePlatform: data.sourcePlatform,
    count: relations.length,
    items: [base, ...relations.map(({ item }) => item)],
    relations: relations.map((relation) => ({
      sourceId: relation.sourceId,
      targetId: relation.targetId,
      relationType: relation.relationType,
      confidence: relation.confidence,
      evidenceType: relation.evidenceType,
      evidence: relation.evidence,
      inferred: relation.inferred,
    })),
  };
}

export function groupKnowledgeByTheme(data, { query = '', limit } = {}) {
  const items = query ? searchKnowledgeItems(data, { query, limit }).items : data.items.slice(0, cleanLimit(limit));
  const groups = new Map();
  for (const item of items) {
    const theme = item.category || item.topics[0] || item.contentType || 'Uncategorized';
    if (!groups.has(theme)) groups.set(theme, []);
    groups.get(theme).push(item.id);
  }
  const grouped = [...groups.entries()]
    .map(([theme, itemIds]) => ({ theme, itemIds, count: itemIds.length }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
  return { ok: true, tool: 'groupKnowledgeByTheme', sourcePlatform: data.sourcePlatform, count: grouped.length, groups: grouped, items };
}

export function executeArchivistKnowledgeTool(name, args, data) {
  if (!TOOL_NAME_SET.has(name)) throw new Error('archivist_tool_not_allowed');
  if (!data || !Array.isArray(data.items)) throw new Error('knowledge_source_invalid');
  if (name === 'searchKnowledgeItems') return searchKnowledgeItems(data, args);
  if (name === 'getKnowledgeItem') return getKnowledgeItem(data, args);
  if (name === 'filterKnowledgeItems') return filterKnowledgeItems(data, args);
  if (name === 'listKnowledgeTopics') return listKnowledgeTopics(data, args);
  if (name === 'findRelatedKnowledge') return findRelatedKnowledge(data, args);
  return groupKnowledgeByTheme(data, args);
}

export function buildArchivistConceptMap(toolResults = []) {
  const nodeMap = new Map();
  const relationshipMap = new Map();
  for (const result of toolResults) {
    for (const item of result.items || []) {
      nodeMap.set(item.id, {
        id: item.id,
        label: item.displayTitle,
        contentType: item.contentType,
        sourcePlatform: item.sourcePlatform,
        sourceIds: [item.id],
      });
    }
    for (const relation of result.relations || []) {
      relationshipMap.set(`${relation.sourceId}:${relation.targetId}:${relation.relationType}`, relation);
    }
  }
  return {
    nodes: [...nodeMap.values()],
    relationships: [...relationshipMap.values()],
    sourceIds: [...nodeMap.keys()],
  };
}
