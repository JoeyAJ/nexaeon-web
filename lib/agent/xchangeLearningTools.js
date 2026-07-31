import { getTeachingCourses } from '../teachingCourses.js';
import { isPublishedVisibility } from '../content/visibility.js';

export const XCHANGE_TOOL_NAMES = Object.freeze([
  'searchLearningMaterials',
  'getLearningMaterial',
  'filterLearningMaterials',
  'listLearningTopics',
  'listCourseStructures',
]);

export const XCHANGE_TOOL_DEFINITIONS = Object.freeze([
  {
    type: 'function',
    name: 'searchLearningMaterials',
    description: 'Search currently public Learning Coaching materials by keyword.',
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
    name: 'getLearningMaterial',
    description: 'Retrieve one public learning material by its public identifier.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'filterLearningMaterials',
    description: 'Filter public learning materials using fields available in the Learning Coaching schema.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        courseType: { type: 'string' },
        audience: { type: 'string' },
        difficulty: { type: 'string' },
        language: { type: 'string' },
        teachingMethod: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 12 },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'listLearningTopics',
    description: 'List topics represented by currently public Learning Coaching materials.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 30 } },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'listCourseStructures',
    description: 'List public course, workshop, lesson, activity, and teaching-material structures.',
    parameters: {
      type: 'object',
      properties: {
        courseType: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 12 },
      },
      additionalProperties: false,
    },
  },
]);

const TOOL_NAME_SET = new Set(XCHANGE_TOOL_NAMES);
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

function getExplicitVisibility(item) {
  for (const key of ['visibility', 'publicStatus', '公開狀態', 'Public Status']) {
    if (Object.prototype.hasOwnProperty.call(item || {}, key)) return item[key];
  }
  return undefined;
}

function localizedText(item, field) {
  const direct = item?.[field];
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    return {
      zh: cleanText(direct.zh || direct.en || direct.ko),
      ko: cleanText(direct.ko || direct.en || direct.zh),
      en: cleanText(direct.en || direct.zh || direct.ko),
    };
  }
  return {
    zh: cleanText(item?.[`${field}Zh`] || direct || item?.[`${field}En`] || item?.[`${field}Ko`]),
    ko: cleanText(item?.[`${field}Ko`] || direct || item?.[`${field}En`] || item?.[`${field}Zh`]),
    en: cleanText(item?.[`${field}En`] || direct || item?.[`${field}Zh`] || item?.[`${field}Ko`]),
  };
}

export function normalizeLearningToolItem(item, sourcePlatform = 'fallback') {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const visibility = getExplicitVisibility(item);
  if (visibility !== undefined && !isPublishedVisibility(visibility)) return null;

  const id = cleanText(item.id, 240);
  const title = localizedText(item, 'title');
  const displayTitle = title.en || title.zh || title.ko || cleanText(item.title, 320);
  if (!id || !displayTitle) return null;

  const courseType = cleanText(item.courseType || item.teachingCategory || item.type, 180);
  const teachingMethods = cleanStringArray(item.teachingMethods || item.format || item.type);
  const targetAudience = cleanStringArray(item.targetAudience || item.audience);
  const language = cleanStringArray(item.language);
  const tags = cleanStringArray(item.tags);
  const topic = cleanText(item.topic || item.subTopic || item.category, 240);
  const summary = localizedText(item, 'summary');
  if (!summary.en && !summary.zh && !summary.ko) {
    Object.assign(summary, localizedText(item, 'description'));
  }

  return {
    id,
    title,
    displayTitle,
    summary,
    contentType: cleanText(item.contentType || item.sourceType || courseType, 180) || 'learning-material',
    sourcePlatform: cleanText(sourcePlatform, 40) || 'fallback',
    courseType,
    topic,
    targetAudience,
    difficulty: cleanText(item.difficulty, 120),
    language,
    teachingMethods,
    learningGoals: cleanText(item.learningGoals, 1200),
    usage: cleanText(item.usage, 1000),
    tags,
    durationMinutes: Number.isFinite(Number(item.durationMinutes)) ? Number(item.durationMinutes) : null,
    sourceUrl: cleanText(item.sourceUrl || item.fileUrl, 1000),
    sourceRoute: '/teaching/teaching-courses',
    updatedAt: cleanText(item.updatedAt, 80),
  };
}

export async function loadPublicLearningMaterials({
  getTeachingCoursesImpl = getTeachingCourses,
} = {}) {
  const payload = await getTeachingCoursesImpl();
  if (!payload || !Array.isArray(payload.items || payload.data)) {
    throw new Error('learning_source_invalid');
  }
  const sourcePlatform = cleanText(payload.source, 40) || 'fallback';
  return {
    sourcePlatform,
    reason: cleanText(payload.reason, 80) || null,
    items: (payload.items || payload.data)
      .map((item) => normalizeLearningToolItem(item, sourcePlatform))
      .filter(Boolean),
  };
}

function searchableText(item) {
  return [
    item.id,
    item.displayTitle,
    item.title.zh,
    item.title.ko,
    item.title.en,
    item.summary.zh,
    item.summary.ko,
    item.summary.en,
    item.contentType,
    item.courseType,
    item.topic,
    ...item.targetAudience,
    item.difficulty,
    ...item.language,
    ...item.teachingMethods,
    item.learningGoals,
    item.usage,
    ...item.tags,
  ].join(' ').toLocaleLowerCase();
}

function queryTokens(value) {
  const normalized = cleanText(value, 500).toLocaleLowerCase();
  return [...new Set(normalized.split(/[\s,，、;；:：()[\]{}]+/u).filter((token) => token.length > 1))];
}

function includesText(value, query) {
  const needle = cleanText(query, 240).toLocaleLowerCase();
  return !needle || String(value || '').toLocaleLowerCase().includes(needle);
}

export function searchLearningMaterials(data, { query = '', limit } = {}) {
  const tokens = queryTokens(query);
  const items = data.items
    .map((item) => ({
      item,
      score: tokens.reduce((total, token) => total + (searchableText(item).includes(token) ? 1 : 0), 0),
    }))
    .filter(({ score }) => !tokens.length || score > 0)
    .sort((a, b) => b.score - a.score || a.item.displayTitle.localeCompare(b.item.displayTitle))
    .slice(0, cleanLimit(limit))
    .map(({ item }) => item);
  return { ok: true, tool: 'searchLearningMaterials', sourcePlatform: data.sourcePlatform, count: items.length, items };
}

export function getLearningMaterial(data, { id = '' } = {}) {
  const item = data.items.find((candidate) => candidate.id === cleanText(id, 240));
  return { ok: true, tool: 'getLearningMaterial', sourcePlatform: data.sourcePlatform, count: item ? 1 : 0, items: item ? [item] : [] };
}

export function filterLearningMaterials(data, filters = {}) {
  const items = data.items.filter((item) => (
    includesText([item.topic, item.displayTitle, ...item.tags].join(' '), filters.topic)
    && includesText([item.courseType, item.contentType].join(' '), filters.courseType)
    && includesText(item.targetAudience.join(' '), filters.audience)
    && includesText(item.difficulty, filters.difficulty)
    && includesText(item.language.join(' '), filters.language)
    && includesText(item.teachingMethods.join(' '), filters.teachingMethod)
  )).slice(0, cleanLimit(filters.limit));
  return { ok: true, tool: 'filterLearningMaterials', sourcePlatform: data.sourcePlatform, count: items.length, items };
}

export function listLearningTopics(data, { limit } = {}) {
  const counts = new Map();
  for (const item of data.items) {
    for (const topic of [item.topic, ...item.tags].filter(Boolean)) {
      counts.set(topic, (counts.get(topic) || 0) + 1);
    }
  }
  const topics = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, cleanLimit(limit, 20, 30))
    .map(([name, count]) => ({ name, count }));
  return { ok: true, tool: 'listLearningTopics', sourcePlatform: data.sourcePlatform, count: topics.length, topics, items: data.items.slice(0, MAX_TOOL_ITEMS) };
}

export function listCourseStructures(data, { courseType = '', limit } = {}) {
  const items = data.items
    .filter((item) => includesText([item.courseType, item.contentType, ...item.teachingMethods].join(' '), courseType))
    .slice(0, cleanLimit(limit));
  return { ok: true, tool: 'listCourseStructures', sourcePlatform: data.sourcePlatform, count: items.length, items };
}

export function executeXchangeLearningTool(name, args, data) {
  if (!TOOL_NAME_SET.has(name)) throw new Error('xchange_tool_not_allowed');
  if (!data || !Array.isArray(data.items)) throw new Error('learning_source_invalid');
  if (name === 'searchLearningMaterials') return searchLearningMaterials(data, args);
  if (name === 'getLearningMaterial') return getLearningMaterial(data, args);
  if (name === 'filterLearningMaterials') return filterLearningMaterials(data, args);
  if (name === 'listLearningTopics') return listLearningTopics(data, args);
  return listCourseStructures(data, args);
}
