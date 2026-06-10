import { createFallbackKnowledgeResponse } from '../src/data/knowledgeResourceData.js';
import { getNotionKnowledgeSourceConfigs, queryNotionDatabase } from './notion.js';
import { normalizeNotionTeachingMaterial } from './teachingCourses.js';
import {
  compactList,
  getCheckbox,
  getDate,
  getMultiSelect,
  getSelect,
  getStatus,
  getText,
  getTitle,
  getUrl,
} from './notionProperties.js';

const SOURCE_DEFINITIONS = {
  research: {
    sourceType: 'Literature',
    relatedModule: 'Research',
  },
  teaching: {
    sourceType: 'Teaching Material',
    relatedModule: 'Learning Coaching',
  },
  inspiration: {
    sourceType: 'Inspiration',
    relatedModule: 'Knowledge Lab',
  },
  brand: {
    sourceType: 'Brand Content',
    relatedModule: 'Brand / Publishing',
  },
};

function firstValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return value || '';
}

function truncateText(value, maxLength = 120) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function formatAuthorsYear(authors, year) {
  return compactList([authors, year]).join(' · ');
}

function getYear(properties, names) {
  const value = getText(properties, names, ['number', 'date']);
  const match = String(value).match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : value;
}

function getPageUpdatedAt(page, properties, names = ['最後更新', '更新時間', 'Last Edited Time', 'last_edited_time', 'updatedAt']) {
  return getDate(properties, names) || page.last_edited_time || '';
}

function getPageCreatedAt(page, properties) {
  return getDate(properties, ['建立日期', 'Created Time', 'created_time', 'createdAt']) || page.created_time || '';
}

function normalizeResearchResource(page) {
  const properties = page.properties || {};
  const title = getTitle(properties, ['文獻標題', '標題', 'title', 'Title', 'Name', 'Literature Title', '논문 제목']) || 'Untitled Literature';
  const sourceType = getText(properties, ['文獻類型', '來源類型', 'Source Type', 'Type', 'sourceType', '資料類型', '출처 유형']) || 'Literature';
  const theoryModels = getMultiSelect(properties, ['理論模型', '對應理論模型', 'Theory Models', 'Theory Model', 'Model', 'Theory', 'theoryModels', '이론 모델']);
  const variables = getMultiSelect(properties, ['變數', '關鍵變數', 'Variables', 'Key Variables', 'variables', '핵심 변수']);
  const summary = getText(properties, ['中文摘要', '摘要', '三語摘要', 'Summary Zh', 'Summary ZH', 'summaryZh', '繁中摘要', 'Abstract'])
    || getText(properties, ['Summary', 'Abstract', '英文摘要', 'English Summary', 'Summary En', 'Summary EN', 'summaryEn'])
    || getText(properties, ['韓文摘要', '한국어 요약', '요약', 'Summary Ko', 'Summary KO', 'summaryKo']);
  const authors = getMultiSelect(properties, ['作者', '作者與年份', 'Authors', 'Author', 'authors', '저자']);
  const year = getYear(properties, ['年份', 'Year', 'year', '연도']);

  return {
    id: `research-${page.id}`,
    sourceDatabase: 'research',
    sourceType: SOURCE_DEFINITIONS.research.sourceType,
    title,
    category: firstValue(theoryModels) || sourceType,
    type: sourceType || 'Literature',
    status: getStatus(properties, ['狀態', '閱讀狀態', 'Status', 'status', '상태']) || getSelect(properties, ['狀態', '閱讀狀態', 'Status', 'status', '상태']),
    language: getText(properties, ['語言', 'Language']),
    tags: compactList([theoryModels, variables]),
    summary,
    relatedModule: SOURCE_DEFINITIONS.research.relatedModule,
    primaryMeta: formatAuthorsYear(authors, year),
    secondaryMeta: getText(properties, ['研究方法', '方法', 'Research Method', 'Method', 'researchMethod', '연구 방법']),
    url: getUrl(properties, ['Source URL', 'URL', 'sourceUrl', '連結', '링크']) || page.url || '',
    fileUrl: '',
    createdAt: getPageCreatedAt(page, properties),
    updatedAt: getPageUpdatedAt(page, properties),
  };
}

function normalizeTeachingResource(page) {
  const material = normalizeNotionTeachingMaterial(page);

  return {
    id: `teaching-${page.id}`,
    sourceDatabase: 'teaching',
    sourceType: SOURCE_DEFINITIONS.teaching.sourceType,
    title: material.title,
    category: material.teachingCategory,
    type: firstValue(material.format) || SOURCE_DEFINITIONS.teaching.sourceType,
    status: material.status,
    language: firstValue(material.language),
    tags: compactList([material.tags, material.targetAudience, material.difficulty]),
    summary: material.note || material.subTopic,
    relatedModule: SOURCE_DEFINITIONS.teaching.relatedModule,
    primaryMeta: firstValue(material.targetAudience),
    secondaryMeta: material.durationMinutes === null || material.durationMinutes === undefined ? '' : String(material.durationMinutes),
    url: material.sourceUrl || '',
    fileUrl: material.fileUrl || '',
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}

function normalizeInspirationResource(page) {
  const properties = page.properties || {};
  const domain = getMultiSelect(properties, ['領域', 'Domain', 'Field']);
  const priority = getSelect(properties, ['優先度', 'Priority']) || getText(properties, ['優先度', 'Priority']);
  const inspirationLevel = getSelect(properties, ['靈感等級', 'Inspiration Level']) || getText(properties, ['靈感等級', 'Inspiration Level']);
  const researchable = getCheckbox(properties, ['可研究化', 'Researchable']);
  const commercializable = getCheckbox(properties, ['可商業化', 'Commercializable']);
  const researchableText = getText(properties, ['可研究化', 'Researchable']);
  const commercializableText = getText(properties, ['可商業化', 'Commercializable']);
  const videoReady = getCheckbox(properties, ['可做影片', 'Video Ready']);
  const paperReady = getCheckbox(properties, ['可做論文', 'Paper Ready']);

  return {
    id: `inspiration-${page.id}`,
    sourceDatabase: 'inspiration',
    sourceType: SOURCE_DEFINITIONS.inspiration.sourceType,
    title: getTitle(properties, ['想法名稱', 'Idea Name', 'Name', 'Title']) || 'Untitled Inspiration',
    category: firstValue(domain),
    type: getSelect(properties, ['類型', 'Type']) || getText(properties, ['類型', 'Type']) || SOURCE_DEFINITIONS.inspiration.sourceType,
    status: getStatus(properties, ['狀態', 'Status']) || getSelect(properties, ['狀態', 'Status']),
    language: '',
    tags: compactList([
      domain,
      priority,
      inspirationLevel,
      researchable ? '可研究化' : researchableText,
      commercializable ? '可商業化' : commercializableText,
      videoReady ? '可做影片' : '',
      paperReady ? '可做論文' : '',
    ]),
    summary: getText(properties, ['一句話描述', 'One-line Description', 'Description']),
    relatedModule: SOURCE_DEFINITIONS.inspiration.relatedModule,
    primaryMeta: getText(properties, ['下一步行動', 'Next Action']),
    secondaryMeta: getText(properties, ['來源', 'Source']),
    url: '',
    fileUrl: '',
    createdAt: getPageCreatedAt(page, properties),
    updatedAt: getPageUpdatedAt(page, properties),
  };
}

function normalizeBrandResource(page) {
  const properties = page.properties || {};
  const topic = getMultiSelect(properties, ['主題', 'Topic']);
  const platform = getMultiSelect(properties, ['平台', 'Platform']);
  const audience = getMultiSelect(properties, ['目標受眾', 'Target Audience', 'Audience']);
  const cta = getText(properties, ['CTA目標', 'CTA 目標', 'CTA Goal']);
  const note = getText(properties, ['備註', 'Notes', 'Note']);
  const script = getText(properties, ['腳本', 'Script']);

  return {
    id: `brand-${page.id}`,
    sourceDatabase: 'brand',
    sourceType: SOURCE_DEFINITIONS.brand.sourceType,
    title: getTitle(properties, ['內容標題', 'Content Title', 'Title', 'Name']) || 'Untitled Brand Content',
    category: firstValue(topic),
    type: getSelect(properties, ['類型', 'Type']) || getText(properties, ['類型', 'Type']) || SOURCE_DEFINITIONS.brand.sourceType,
    status: getStatus(properties, ['狀態', 'Status']) || getSelect(properties, ['狀態', 'Status']),
    language: firstValue(getMultiSelect(properties, ['語言', 'Language'])),
    tags: compactList([topic, platform, audience, cta]),
    summary: note || truncateText(script),
    relatedModule: SOURCE_DEFINITIONS.brand.relatedModule,
    primaryMeta: firstValue(platform),
    secondaryMeta: getDate(properties, ['發布日期', 'Publish Date', 'Published At']),
    url: getUrl(properties, ['發布連結', 'Publish URL', 'Published URL']) || getUrl(properties, ['成效連結', 'Performance URL']),
    fileUrl: getUrl(properties, ['封面圖', 'Cover Image', 'Cover']),
    createdAt: getPageCreatedAt(page, properties),
    updatedAt: getPageUpdatedAt(page, properties),
  };
}

const NORMALIZERS = {
  research: normalizeResearchResource,
  teaching: normalizeTeachingResource,
  inspiration: normalizeInspirationResource,
  brand: normalizeBrandResource,
};

function hasUsableKnowledgeResource(item) {
  return Boolean(item?.title && item.title !== 'Untitled Knowledge Resource');
}

function makeInitialMeta() {
  return {
    sources: Object.fromEntries(Object.keys(SOURCE_DEFINITIONS).map((key) => [
      key,
      { status: 'missing_env', count: 0 },
    ])),
    warnings: [],
  };
}

async function loadKnowledgeSource(sourceDatabase, config) {
  if (!config?.isConfigured) {
    return {
      sourceDatabase,
      status: 'missing_env',
      items: [],
      warning: `${sourceDatabase}: missing_env`,
    };
  }

  const payload = await queryNotionDatabase(config.databaseId, config.apiKey);
  const items = (payload.results || [])
    .map((page) => NORMALIZERS[sourceDatabase](page))
    .filter(hasUsableKnowledgeResource);

  return {
    sourceDatabase,
    status: 'connected',
    items,
  };
}

export async function getKnowledgeResources() {
  const configs = getNotionKnowledgeSourceConfigs();
  const meta = makeInitialMeta();
  const entries = Object.entries(configs);

  const settled = await Promise.allSettled(
    entries.map(([sourceDatabase, config]) => loadKnowledgeSource(sourceDatabase, config))
  );

  const items = [];

  settled.forEach((result, index) => {
    const sourceDatabase = entries[index][0];

    if (result.status === 'rejected') {
      meta.sources[sourceDatabase] = { status: 'failed', count: 0 };
      meta.warnings.push({
        source: sourceDatabase,
        reason: result.reason instanceof Error ? result.reason.message : 'Unknown Notion error',
      });
      return;
    }

    const sourceResult = result.value;
    meta.sources[sourceDatabase] = {
      status: sourceResult.status,
      count: sourceResult.items.length,
    };

    if (sourceResult.warning) {
      meta.warnings.push({
        source: sourceDatabase,
        reason: sourceResult.warning,
      });
    }

    items.push(...sourceResult.items);
  });

  if (!items.length) {
    return createFallbackKnowledgeResponse(
      meta.warnings.length ? 'notion_sources_unavailable' : 'empty_notion_knowledge_sources',
      meta
    );
  }

  const sortedItems = items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

  return {
    source: 'notion',
    count: sortedItems.length,
    updatedAt: new Date().toISOString(),
    meta,
    items: sortedItems,
    data: sortedItems,
  };
}
