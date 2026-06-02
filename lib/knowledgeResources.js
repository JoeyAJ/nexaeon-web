import { createFallbackKnowledgeResponse } from '../src/data/knowledgeResourceData.js';
import {
  getNotionKnowledgeConfig,
  queryNotionDatabase,
  queryNotionDataSource,
} from './notion.js';

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
    if (property.type === 'relation') return property.relation.map((item) => item.id).filter(Boolean);
    if (property.type === 'rich_text') {
      return getPlainText(property.rich_text)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeType(type) {
  const value = type.trim().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_');
  const allowed = new Set([
    'literature_note',
    'concept',
    'prompt_template',
    'course_material',
    'mvp_note',
    'research_keyword',
  ]);

  return allowed.has(value) ? value : 'concept';
}

function mapNotionPageToKnowledgeResource(page) {
  const properties = page.properties || {};
  const fallbackTitle = getTitle(properties, ['Title', 'Name', 'Resource', '資源標題', '지식 자원']);
  const titleZh = getText(properties, ['Title Zh', 'Title ZH', 'titleZh', '中文標題', '繁中標題']) || fallbackTitle;
  const titleKo = getText(properties, ['Title Ko', 'Title KO', 'titleKo', '韓文標題', '한국어 제목']) || fallbackTitle;
  const titleEn = getText(properties, ['Title En', 'Title EN', 'titleEn', 'English Title', '英文標題']) || fallbackTitle;
  const sourceUrl = getText(properties, ['Source URL', 'URL', 'sourceUrl', '連結', '링크']) || page.url;

  return {
    id: page.id,
    titleZh: titleZh || '未命名知識資源',
    titleKo: titleKo || '이름 없는 지식 리소스',
    titleEn: titleEn || 'Untitled Knowledge Resource',
    type: normalizeType(getText(properties, ['Type', 'type', '類型', '유형']) || 'concept'),
    category: getText(properties, ['Category', 'category', '分類', '분류']),
    tags: getMulti(properties, ['Tags', 'tags', '標籤', '태그']),
    relatedModule: getText(properties, ['Related Module', 'relatedModule', '關聯模組', '연관 모듈']),
    summaryZh: getText(properties, ['Summary Zh', 'Summary ZH', 'summaryZh', '中文摘要', '繁中摘要']),
    summaryKo: getText(properties, ['Summary Ko', 'Summary KO', 'summaryKo', '韓文摘要', '한국어 요약']),
    summaryEn: getText(properties, ['Summary En', 'Summary EN', 'summaryEn', 'English Summary', '英文摘要']),
    sourceType: 'notion',
    sourceUrl,
    status: getText(properties, ['Status', 'status', '狀態', '상태']) || 'notion',
    updatedAt: page.last_edited_time || new Date().toISOString(),
  };
}

function hasUsableKnowledgeResource(item) {
  return Boolean(
    (item.titleZh || item.titleKo || item.titleEn) &&
      (item.summaryZh || item.summaryKo || item.summaryEn)
  );
}

export async function getKnowledgeResources() {
  const config = getNotionKnowledgeConfig();

  if (!config.isConfigured) {
    return createFallbackKnowledgeResponse('missing_notion_env');
  }

  try {
    const payload = config.queryType === 'data_source'
      ? await queryNotionDataSource(config.queryId, config.apiKey)
      : await queryNotionDatabase(config.queryId, config.apiKey);
    const items = (payload.results || [])
      .map(mapNotionPageToKnowledgeResource)
      .filter(hasUsableKnowledgeResource);

    if (!items.length) {
      return createFallbackKnowledgeResponse('empty_notion_knowledge_source');
    }

    return {
      source: 'notion',
      count: items.length,
      items,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...createFallbackKnowledgeResponse('notion_request_failed'),
      error: error instanceof Error ? error.message : 'Unknown Notion error',
    };
  }
}
