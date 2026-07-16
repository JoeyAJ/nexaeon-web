import { createFallbackLiteratureResponse } from '../src/data/literatureData.js';
import { createApiResponse, getUpstreamFailureReason } from '../api/_response.js';
import { getNotionResearchConfig, queryAllNotionDatabasePages } from './notion.js';
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

function getTitle(properties, names) {
  const property = findProperty(properties, names, ['title']);
  if (!property) return '';
  if (property.type === 'title') return getPlainText(property.title);
  return getPropertyText(property);
}

function getPropertyText(property) {
  if (!property) return '';
  if (property.type === 'rich_text') return getPlainText(property.rich_text);
  if (property.type === 'title') return getPlainText(property.title);
  if (property.type === 'select') return property.select?.name || '';
  if (property.type === 'status') return property.status?.name || '';
  if (property.type === 'number') return String(property.number ?? '');
  if (property.type === 'url') return property.url || '';
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

function getYear(properties, names) {
  const value = getText(properties, names, ['number', 'date']);
  const match = String(value).match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : value;
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
  if (property.type === 'rich_text' || property.type === 'title') return splitListText(text);
  if (property.type === 'select' || property.type === 'status') return text ? [text] : [];
  if (property.type === 'number' || property.type === 'date' || property.type === 'formula') return text ? [text] : [];
  return [];
}

function getUpdatedAt(page, properties) {
  return getText(properties, ['更新時間', 'Last Edited Time', 'last_edited_time', 'updatedAt'], ['date'])
    || page.last_edited_time
    || '';
}

function mapNotionPageToLiterature(page) {
  const properties = page.properties || {};
  const title = getTitle(properties, ['文獻標題', '標題', 'title', 'Title', 'Name', 'Literature Title', '논문 제목']);
  const sourceUrl = getText(properties, ['Source URL', 'URL', 'sourceUrl', '連結', '링크']);
  const summaryZh = getText(properties, ['中文摘要', '摘要', '三語摘要', 'Summary Zh', 'Summary ZH', 'summaryZh', '繁中摘要', 'Abstract']);
  const summaryKo = getText(properties, ['韓文摘要', '한국어 요약', '요약', 'Summary Ko', 'Summary KO', 'summaryKo']);
  const summaryEn = getText(properties, ['Summary', 'Abstract', '英文摘要', 'English Summary', 'Summary En', 'Summary EN', 'summaryEn']);

  // Research 模塊第一個真實後台資料接入：將 Notion「NexAeon｜研究文獻庫」頁面正規化成前端既有資料格式。
  return {
    id: page.id,
    title: title || 'Untitled Literature',
    authors: getMulti(properties, ['作者', '作者與年份', 'Authors', 'Author', 'authors', '저자']),
    year: getYear(properties, ['年份', 'Year', 'year', '연도']),
    sourceType: getText(properties, ['文獻類型', '來源類型', 'Source Type', 'Type', 'sourceType', '資料類型', '출처 유형']) || 'notion-literature',
    theoryModels: getMulti(properties, ['理論模型', '對應理論模型', 'Theory Models', 'Theory Model', 'Model', 'Theory', 'theoryModels', '이론 모델']),
    researchMethod: getText(properties, ['研究方法', '方法', 'Research Method', 'Method', 'researchMethod', '연구 방법']),
    variables: getMulti(properties, ['變數', '關鍵變數', 'Variables', 'Key Variables', 'variables', '핵심 변수']),
    summary: {
      zh: summaryZh || summaryEn || summaryKo,
      ko: summaryKo || summaryZh || summaryEn,
      en: summaryEn || summaryZh || summaryKo,
    },
    summaryZh: summaryZh || summaryEn || summaryKo,
    summaryKo: summaryKo || summaryZh || summaryEn,
    summaryEn: summaryEn || summaryZh || summaryKo,
    usage: getText(properties, ['使用目的', '使用場景', '研究用途', 'Usage', 'Research Usage', 'usage', '사용 목적']),
    status: getText(properties, ['狀態', '閱讀狀態', 'Status', 'status', '상태']),
    sourceUrl,
    updatedAt: getUpdatedAt(page, properties),
  };
}

export async function getResearchLiterature() {
  const config = getNotionResearchConfig();

  if (!config.isConfigured) {
    return createFallbackLiteratureResponse('missing_env');
  }

  try {
    const pages = await queryAllNotionDatabasePages(config.databaseId, config.apiKey);
    const data = pages
      .filter((page) => isPublishedNotionPage(page, ['公開狀態']))
      .map(mapNotionPageToLiterature);

    return createApiResponse({
      source: 'notion',
      items: data,
      extra: { meta: { module: 'research' } },
    });
  } catch (error) {
    return createFallbackLiteratureResponse(getUpstreamFailureReason(error));
  }
}
