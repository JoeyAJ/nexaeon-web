import { createFallbackLiteratureResponse } from '../src/data/literatureData.js';
import { getNotionResearchConfig, queryNotionDatabase } from './notion.js';

function getPlainText(richText = []) {
  if (!Array.isArray(richText)) return '';
  return richText.map((part) => part?.plain_text || '').join('').trim();
}

function getTitle(properties, names) {
  for (const name of names) {
    const property = properties?.[name];
    if (property?.type === 'title') return getPlainText(property.title);
  }
  return '';
}

function getText(properties, names) {
  for (const name of names) {
    const property = properties?.[name];
    if (!property) continue;
    if (property.type === 'rich_text') return getPlainText(property.rich_text);
    if (property.type === 'title') return getPlainText(property.title);
    if (property.type === 'select') return property.select?.name || '';
    if (property.type === 'status') return property.status?.name || '';
    if (property.type === 'number') return String(property.number ?? '');
    if (property.type === 'url') return property.url || '';
    if (property.type === 'date') return property.date?.start || '';
    if (property.type === 'formula') {
      if (property.formula?.type === 'string') return property.formula.string || '';
      if (property.formula?.type === 'number') return String(property.formula.number ?? '');
      if (property.formula?.type === 'date') return property.formula.date?.start || '';
    }
  }
  return '';
}

function getMulti(properties, names) {
  for (const name of names) {
    const property = properties?.[name];
    if (!property) continue;
    if (property.type === 'multi_select') return property.multi_select.map((item) => item.name).filter(Boolean);
    if (property.type === 'people') return property.people.map((person) => person.name).filter(Boolean);
    if (property.type === 'rich_text') {
      return getPlainText(property.rich_text)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function mapNotionPageToLiterature(page) {
  const properties = page.properties || {};
  const title = getTitle(properties, ['Title', 'Name', '文獻標題', '논문 제목']);
  const sourceUrl = getText(properties, ['Source URL', 'URL', 'sourceUrl', '連結', '링크']) || page.url;
  const summaryZh = getText(properties, ['Summary Zh', 'Summary ZH', 'summaryZh', '中文摘要', '繁中摘要', '摘要']);
  const summaryKo = getText(properties, ['Summary Ko', 'Summary KO', 'summaryKo', '韓文摘要', '한국어 요약', '요약']);
  const summaryEn = getText(properties, ['Summary En', 'Summary EN', 'summaryEn', 'English Summary', '英文摘要', 'Summary']);

  // Research 模塊第一個真實後台資料接入：將 Notion「NexAeon｜研究文獻庫」頁面正規化成前端既有資料格式。
  return {
    id: page.id,
    title: title || 'Untitled Literature',
    authors: getMulti(properties, ['Authors', 'Author', 'authors', '作者', '저자']),
    year: getText(properties, ['Year', 'year', '年份', '연도']),
    theoryModels: getMulti(properties, ['Theory Models', 'Theory', 'theoryModels', '理論模型', '이론 모델']),
    researchMethod: getText(properties, ['Research Method', 'Method', 'researchMethod', '研究方法', '연구 방법']),
    variables: getMulti(properties, ['Variables', 'Key Variables', 'variables', '關鍵變數', '핵심 변수']),
    summary: {
      zh: summaryZh || summaryEn || summaryKo,
      ko: summaryKo || summaryZh || summaryEn,
      en: summaryEn || summaryZh || summaryKo,
    },
    summaryZh: summaryZh || summaryEn || summaryKo,
    summaryKo: summaryKo || summaryZh || summaryEn,
    summaryEn: summaryEn || summaryZh || summaryKo,
    usage: getText(properties, ['Usage', 'usage', '使用目的', '사용 목적']),
    status: getText(properties, ['Status', 'status', '狀態', '상태']) || 'notion',
    sourceType: getText(properties, ['Source Type', 'Publication Type', 'sourceType', '資料類型', '文獻類型', '출처 유형']) || 'notion-literature',
    sourceUrl,
    updatedAt: page.last_edited_time || new Date().toISOString(),
  };
}

export async function getResearchLiterature() {
  const config = getNotionResearchConfig();

  if (!config.isConfigured) {
    return createFallbackLiteratureResponse('missing_env');
  }

  try {
    const payload = await queryNotionDatabase(config.databaseId, config.apiKey);
    const data = (payload.results || []).map(mapNotionPageToLiterature);

    return {
      source: 'notion',
      count: data.length,
      data,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return createFallbackLiteratureResponse('notion_fetch_failed');
  }
}
