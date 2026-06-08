import { getModuleData, getModuleEndpoint } from '../src/data/moduleData.js';
import { getNotionTeachingConfig, queryNotionDatabase } from './notion.js';

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
  if (property.type === 'checkbox') return property.checkbox ? 'true' : 'false';
  if (property.type === 'date') return property.date?.start || '';
  if (property.type === 'multi_select') return property.multi_select.map((item) => item.name).filter(Boolean).join(', ');
  if (property.type === 'people') return property.people.map((person) => person.name || person.id).filter(Boolean).join(', ');
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

function getUpdatedAt(page, properties) {
  return getText(properties, ['更新時間', 'Last Edited Time', 'last_edited_time', 'updatedAt'], ['date'])
    || page.last_edited_time
    || '';
}

function getLocalizedFallbackField(item, field) {
  return item[`${field}Zh`] || item[`${field}En`] || item[`${field}Ko`] || '';
}

function normalizeFallbackTeachingMaterial(item) {
  const summary = getLocalizedFallbackField(item, 'description');

  return {
    id: item.id,
    title: getLocalizedFallbackField(item, 'title') || 'Untitled Teaching Material',
    courseType: item.type || '',
    topic: item.category || '',
    targetAudience: item.audience || '',
    module: item.relatedModule || item.moduleKey || '',
    learningGoals: '',
    materials: summary,
    promptExamples: '',
    assessment: '',
    language: '',
    status: item.status || '',
    tags: item.tags || [],
    summary,
    usage: item.relatedTheory || item.relatedProject || '',
    sourceType: item.sourceType || 'fallback-teaching',
    sourceUrl: item.sourceUrl || getModuleEndpoint('teaching'),
    updatedAt: item.updatedAt || '',
  };
}

export function createFallbackTeachingResponse(reason = 'notion_not_connected') {
  const data = getModuleData('teaching').map(normalizeFallbackTeachingMaterial);

  return {
    source: 'fallback',
    reason,
    moduleKey: 'teaching',
    endpoint: getModuleEndpoint('teaching'),
    count: data.length,
    items: data,
    data,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeNotionTeachingMaterial(page) {
  const properties = page.properties || {};
  const title = getText(properties, ['教材標題', '課程標題', '標題', 'Title', 'Name', 'Material Title', 'Course Title'], ['title']);
  const summary = getText(properties, ['摘要', '說明', 'Summary', 'Description']);

  // Teaching 模塊第一個真實後台資料接入：將 Notion「NexAeon｜教學素材庫」正規化成課程資料庫可搜尋格式。
  return {
    id: page.id,
    title: title || 'Untitled Teaching Material',
    courseType: getText(properties, ['教材類型', '課程類型', '類型', 'Type', 'Course Type', 'Material Type']),
    topic: getText(properties, ['主題', '課程主題', 'Topic', 'Course Topic']),
    targetAudience: getText(properties, ['目標對象', '學習者', '對象', 'Target Audience', 'Audience']),
    module: getText(properties, ['模塊', '課程模塊', 'Module', 'Course Module']),
    learningGoals: getText(properties, ['學習目標', '教學目標', 'Learning Goals', 'Objectives']),
    materials: getText(properties, ['教學素材', '教材內容', '材料', 'Materials', 'Teaching Materials']),
    promptExamples: getText(properties, ['Prompt 範例', '提示詞範例', 'Prompt Examples', 'Examples']),
    assessment: getText(properties, ['評量設計', '作業設計', 'Assessment', 'Assignment']),
    language: getText(properties, ['語言', 'Language']),
    status: getText(properties, ['狀態', 'Status', '使用狀態']),
    tags: getMulti(properties, ['標籤', 'Tags', '關鍵字', 'Keywords']),
    summary,
    usage: getText(properties, ['使用目的', '使用場景', 'Usage', 'Use Case']),
    sourceType: 'notion-teaching',
    sourceUrl: page.url || '',
    updatedAt: getUpdatedAt(page, properties),
  };
}

export async function getTeachingCourses() {
  const config = getNotionTeachingConfig();

  if (!config.isConfigured) {
    return createFallbackTeachingResponse('missing_env');
  }

  try {
    const payload = await queryNotionDatabase(config.databaseId, config.apiKey);
    const data = (payload.results || []).map(normalizeNotionTeachingMaterial);

    return {
      source: 'notion',
      moduleKey: 'teaching',
      endpoint: getModuleEndpoint('teaching'),
      count: data.length,
      items: data,
      data,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return createFallbackTeachingResponse('notion_fetch_failed');
  }
}
