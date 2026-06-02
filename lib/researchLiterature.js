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

  return {
    id: page.id,
    title: title || 'Untitled Literature',
    authors: getMulti(properties, ['Authors', 'Author', 'authors', '作者', '저자']),
    year: getText(properties, ['Year', 'year', '年份', '연도']),
    theoryModels: getMulti(properties, ['Theory Models', 'Theory', 'theoryModels', '理論模型', '이론 모델']),
    researchMethod: getText(properties, ['Research Method', 'Method', 'researchMethod', '研究方法', '연구 방법']),
    variables: getMulti(properties, ['Variables', 'Key Variables', 'variables', '關鍵變數', '핵심 변수']),
    summaryZh: getText(properties, ['Summary Zh', 'Summary ZH', 'summaryZh', '中文摘要', '繁中摘要']),
    summaryKo: getText(properties, ['Summary Ko', 'Summary KO', 'summaryKo', '韓文摘要', '한국어 요약']),
    summaryEn: getText(properties, ['Summary En', 'Summary EN', 'summaryEn', 'English Summary', '英文摘要']),
    usage: getText(properties, ['Usage', 'usage', '使用目的', '사용 목적']),
    status: getText(properties, ['Status', 'status', '狀態', '상태']) || 'notion',
    sourceType: 'notion',
    sourceUrl,
    updatedAt: page.last_edited_time || new Date().toISOString(),
  };
}

function hasUsableLiterature(item) {
  return Boolean(item.title && (item.summaryZh || item.summaryKo || item.summaryEn));
}

export async function getResearchLiterature() {
  const config = getNotionResearchConfig();

  if (!config.isConfigured) {
    return createFallbackLiteratureResponse('missing_notion_env');
  }

  try {
    const payload = await queryNotionDatabase(config.databaseId, config.apiKey);
    const data = (payload.results || []).map(mapNotionPageToLiterature).filter(hasUsableLiterature);

    if (!data.length) {
      return createFallbackLiteratureResponse('empty_notion_database');
    }

    return {
      source: 'notion',
      count: data.length,
      data,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...createFallbackLiteratureResponse('notion_request_failed'),
      error: error instanceof Error ? error.message : 'Unknown Notion error',
    };
  }
}
