import { getModuleData, getModuleEndpoint } from '../src/data/moduleData.js';
import { createApiResponse, getUpstreamFailureReason } from '../api/_response.js';
import { getNotionTeachingConfig, queryAllNotionDatabasePages } from './notion.js';
import { isPublishedNotionPage } from './publicFilters.js';

function getPlainText(richText = []) {
  if (!Array.isArray(richText)) return '';
  return richText.map((part) => part?.plain_text || '').join('').trim();
}

function normalizePropertyName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replaceAll(/[\s_\-｜|/]+/g, '');
}

function findProperty(properties, names, preferredTypes = []) {
  const entries = Object.entries(properties || {});
  const normalizedNames = names.map(normalizePropertyName);

  for (const name of names) {
    const property = properties?.[name];
    if (property) return property;
  }

  for (const [propertyName, property] of entries) {
    if (normalizedNames.includes(normalizePropertyName(propertyName))) return property;
  }

  for (const preferredType of preferredTypes) {
    const match = entries.find(([, property]) => property?.type === preferredType);
    if (match) return match[1];
  }

  return null;
}

function getPropertyText(property) {
  if (!property) return '';
  if (property.type === 'title') return getPlainText(property.title);
  if (property.type === 'rich_text') return getPlainText(property.rich_text);
  if (property.type === 'select') return property.select?.name || '';
  if (property.type === 'status') return property.status?.name || '';
  if (property.type === 'number') return String(property.number ?? '');
  if (property.type === 'url') return property.url || '';
  if (property.type === 'created_time') return property.created_time || '';
  if (property.type === 'last_edited_time') return property.last_edited_time || '';
  if (property.type === 'checkbox') return property.checkbox ? 'true' : 'false';
  if (property.type === 'date') return property.date?.start || '';
  if (property.type === 'multi_select') return property.multi_select.map((item) => item.name).filter(Boolean).join(', ');
  if (property.type === 'people') return property.people.map((person) => person.name || person.id).filter(Boolean).join(', ');
  if (property.type === 'relation') return String(property.relation?.length ?? 0);
  if (property.type === 'files') {
    return (property.files || [])
      .map((file) => file?.file?.url || file?.external?.url || file?.name)
      .filter(Boolean)
      .join(', ');
  }
  if (property.type === 'formula') {
    if (property.formula?.type === 'string') return property.formula.string || '';
    if (property.formula?.type === 'number') return String(property.formula.number ?? '');
    if (property.formula?.type === 'date') return property.formula.date?.start || '';
    if (property.formula?.type === 'boolean') return property.formula.boolean ? 'true' : 'false';
  }

  return '';
}

function getText(properties, names, preferredTypes = []) {
  return getPropertyText(findProperty(properties, names, preferredTypes));
}

function splitListText(value) {
  return String(value)
    .split(/[,，、;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getMulti(properties, names) {
  const property = findProperty(properties, names, ['multi_select']);
  if (!property) return [];
  if (property.type === 'multi_select') return property.multi_select.map((item) => item.name).filter(Boolean);
  if (property.type === 'people') return property.people.map((person) => person.name || person.id).filter(Boolean);
  if (property.type === 'relation') return property.relation.map((item) => item.id).filter(Boolean);
  const text = getPropertyText(property);
  if (property.type === 'select' || property.type === 'status') return text ? [text] : [];
  if (property.type === 'rich_text' || property.type === 'title') return splitListText(text);
  if (property.type === 'number' || property.type === 'date' || property.type === 'formula' || property.type === 'checkbox') {
    return text ? [text] : [];
  }

  return [];
}

function getSelectName(properties, names) {
  const property = findProperty(properties, names, ['select', 'status']);
  if (!property) return '';
  if (property.type === 'select') return property.select?.name || '';
  if (property.type === 'status') return property.status?.name || '';
  return getPropertyText(property);
}

function getNumber(properties, names, fallback = null) {
  const property = findProperty(properties, names, ['number']);
  if (!property) return fallback;
  if (property.type === 'number') return property.number ?? fallback;

  const text = getPropertyText(property);
  if (!text) return fallback;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getRelationCount(properties, names) {
  const property = findProperty(properties, names, ['relation']);
  if (!property) return 0;
  if (property.type === 'relation') return property.relation?.length ?? 0;

  const text = getPropertyText(property);
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getUrl(properties, names) {
  const property = findProperty(properties, names, ['url', 'files']);
  if (!property) return '';
  if (property.type === 'url') return property.url || '';
  if (property.type === 'files') {
    const firstFile = property.files?.[0];
    return firstFile?.file?.url || firstFile?.external?.url || '';
  }

  return getPropertyText(property);
}

function getCreatedAt(page, properties) {
  return getText(properties, ['建立日期', 'Created Time', 'created_time', 'createdAt'], ['created_time', 'date'])
    || page.created_time
    || '';
}

function getUpdatedAt(page, properties) {
  return getText(properties, ['最後更新', '更新時間', 'Last Edited Time', 'last_edited_time', 'updatedAt'], ['last_edited_time', 'date'])
    || page.last_edited_time
    || '';
}

function getLocalizedFallbackField(item, field) {
  return item[`${field}Zh`] || item[`${field}En`] || item[`${field}Ko`] || '';
}

function normalizeFallbackTeachingMaterial(item) {
  const summary = getLocalizedFallbackField(item, 'description');
  const title = getLocalizedFallbackField(item, 'title') || 'Untitled Teaching Material';
  const teachingCategory = item.category || '';
  const format = item.type ? [item.type] : [];
  const targetAudience = item.audience ? [item.audience] : [];
  const tags = item.tags || [];

  return {
    id: item.id,
    title,
    teachingCategory,
    format,
    subTopic: item.relatedModule || item.moduleKey || '',
    targetAudience,
    durationMinutes: null,
    difficulty: '',
    status: item.status || '',
    language: [],
    tags,
    fileUrl: item.sourceUrl || '',
    usageCount: 0,
    referenceCount: 0,
    inspirationCount: 0,
    derivedContentCount: 0,
    createdAt: '',
    updatedAt: item.updatedAt || '',
    courseType: item.type || '',
    topic: item.category || '',
    module: item.relatedModule || item.moduleKey || '',
    learningGoals: '',
    summary,
    usage: item.relatedTheory || item.relatedProject || '',
    sourceType: item.sourceType || 'fallback-teaching',
    sourceUrl: '',
  };
}

export function createFallbackTeachingResponse(reason = 'upstream_failed') {
  const data = getModuleData('teaching').map(normalizeFallbackTeachingMaterial);

  return createApiResponse({
    source: 'fallback',
    reason,
    items: data,
    extra: {
      moduleKey: 'teaching',
      endpoint: getModuleEndpoint('teaching'),
      meta: { module: 'coaching' },
    },
  });
}

export function normalizeNotionTeachingMaterial(page) {
  const properties = page.properties || {};
  const title = getText(properties, ['標題', 'Title', 'Name'], ['title']) || 'Untitled Teaching Material';
  const teachingCategory = getSelectName(properties, ['教學分類', 'Teaching Category']);
  const format = getMulti(properties, ['形式', 'Format']);
  const subTopic = getText(properties, ['子主題', 'Subtopic', 'Sub Topic']);
  const targetAudience = getMulti(properties, ['對象', 'Audience', 'Target Audience']);
  const durationMinutes = getNumber(properties, ['可講時間(分)', '可講時間', 'Duration']);
  const difficulty = getSelectName(properties, ['難度', 'Difficulty']);
  const status = getSelectName(properties, ['狀態', 'Status']);
  const language = getMulti(properties, ['語言', 'Language']);
  const tags = getMulti(properties, ['標籤', 'Tags']);
  const fileUrl = getUrl(properties, ['檔案連結', '附件', 'File Link', 'File']);
  const usageCount = getNumber(properties, ['使用次數', 'Usage Count'], 0);
  const referenceCount = getRelationCount(properties, ['參考文獻', 'References']);
  const inspirationCount = getRelationCount(properties, ['源靈感', 'Source Inspirations', 'Source Inspiration']);
  const derivedContentCount = getRelationCount(properties, ['衍生內容', 'Derived Content']);
  const createdAt = getCreatedAt(page, properties);
  const updatedAt = getUpdatedAt(page, properties);

  // Teaching 模塊真實後台資料接入：以 Notion「NexAeon｜教學素材庫」schema 作為主要穩定格式。
  return {
    id: page.id,
    title,
    teachingCategory,
    format,
    subTopic,
    targetAudience,
    durationMinutes,
    difficulty,
    status,
    language,
    tags,
    fileUrl,
    usageCount,
    referenceCount,
    inspirationCount,
    derivedContentCount,
    createdAt,
    updatedAt,
    courseType: teachingCategory,
    topic: subTopic,
    module: '',
    learningGoals: '',
    summary: subTopic,
    usage: '',
    sourceType: 'notion-teaching',
    sourceUrl: '',
  };
}

export async function getTeachingCourses() {
  const config = getNotionTeachingConfig();

  if (!config.isConfigured) {
    return createFallbackTeachingResponse('missing_env');
  }

  try {
    const pages = await queryAllNotionDatabasePages(config.databaseId, config.apiKey);
    const data = pages
      .filter((page) => isPublishedNotionPage(page, ['公開狀態']))
      .map(normalizeNotionTeachingMaterial);

    return createApiResponse({
      source: 'notion',
      items: data,
      extra: {
        moduleKey: 'teaching',
        endpoint: getModuleEndpoint('teaching'),
        meta: { module: 'coaching' },
      },
    });
  } catch (error) {
    return createFallbackTeachingResponse(getUpstreamFailureReason(error));
  }
}
