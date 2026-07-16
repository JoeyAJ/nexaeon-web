import { getValidatedDemoUrl } from '../../src/lib/demoRuntime.js';
import { createContentRepositoryFromPublicPayloads } from '../content/contentRepository.js';
import { normalizeContentLocale, resolveLocalizedText } from '../content/localization.js';
import { getAgentSource, getAgentSourceLabel } from './sourceRegistry.js';

const MAX_TEXT_LENGTH = 1800;
const MAX_SEARCHABLE_LENGTH = 6000;
const LANG_SUFFIX = { zh: 'Zh', ko: 'Ko', en: 'En' };
const INTERNAL_KEYS = new Set([
  'notes',
  'visibility',
  'owner',
  'blockers',
  'email',
  'recordId',
  'baseId',
  'tableId',
  'apiKey',
]);

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function truncateText(value, limit = MAX_TEXT_LENGTH) {
  const text = normalizeWhitespace(value);
  if (text.length <= limit) return text;
  return text.slice(0, limit).trim();
}

export function uniqueCompactArray(value) {
  const input = Array.isArray(value) ? value : [value];
  const seen = new Set();
  const output = [];

  for (const item of input.flat(Infinity)) {
    const text = truncateText(item, 120);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }

  return output;
}

function getLocalizedValue(item, field, lang, { allowNeutral = true } = {}) {
  const translationValue = item?.translations?.[lang]?.[field];
  if (translationValue) return truncateText(translationValue);

  const suffix = LANG_SUFFIX[lang] || 'En';
  const localized = item?.[`${field}${suffix}`];
  if (localized) return truncateText(localized);

  if (!allowNeutral) return '';
  return truncateText(item?.[field]);
}

function joinPublicContent(values) {
  return truncateText(uniqueCompactArray(values).join(' '), MAX_TEXT_LENGTH);
}

const DEMO_SEARCH_ALIASES = Object.freeze({
  zh: ['Demo', '公開 Demo', 'Demo Showcase', '原型', 'MVP'],
  ko: ['Demo', '공개 데모', 'Demo Showcase', '프로토타입', 'MVP'],
  en: ['Demo', 'public demo', 'Demo Showcase', 'prototype', 'MVP'],
});

const SOURCE_SEARCH_ALIASES = Object.freeze({
  identity: {
    zh: ['身份', '身分', 'Identity', 'Joey', '조이', 'NexAeon'],
    ko: ['정체성', 'Identity', 'Joey', '조이', 'NexAeon'],
    en: ['Identity', 'Joey', 'NexAeon', 'public identity'],
  },
  research: {
    zh: ['研究', '研究方向', 'Research', 'AI education'],
    ko: ['연구', '연구 방향', 'Research', 'AI education'],
    en: ['Research', 'research areas', 'research direction', 'AI education'],
  },
  teaching: {
    zh: ['學習教練', 'Learning Coaching', 'AI Tutor', 'AI Tutoring'],
    ko: ['학습 코칭', '러닝 코칭', 'Learning Coaching', 'AI 튜터', 'AI 튜터링'],
    en: ['Learning Coaching', 'AI Tutor', 'AI Tutoring', 'teaching'],
  },
  knowledge: {
    zh: ['知識實驗室', 'Knowledge Lab', '知識', '資源'],
    ko: ['지식 실험실', 'Knowledge Lab', '지식', '자료'],
    en: ['Knowledge Lab', 'knowledge resources', 'public resources'],
  },
  action: {
    zh: ['行動中心', 'Action Center', '實踐專案', '公開項目'],
    ko: ['액션 센터', 'Action Center', '실천 프로젝트', '공개 프로젝트'],
    en: ['Action Center', 'action projects', 'public projects'],
  },
  collaboration: {
    zh: ['合作', 'Collaboration', '協作', '合作方式'],
    ko: ['협력', '협업', 'Collaboration', '협력 방식'],
    en: ['Collaboration', 'collaboration options', 'partnership'],
  },
});

function getSearchAliases(sourceId, lang) {
  if (sourceId === 'demos') return DEMO_SEARCH_ALIASES[lang] || DEMO_SEARCH_ALIASES.en;
  return SOURCE_SEARCH_ALIASES[sourceId]?.[lang] || SOURCE_SEARCH_ALIASES[sourceId]?.en || [];
}

function safeExternalUrl(value) {
  return getValidatedDemoUrl(value) || '';
}

function createDocument({
  sourceId,
  item,
  itemType,
  title,
  summary,
  content,
  tags,
  status,
  sourceUrl,
  sourceRoute,
  updatedAt,
  lang = 'en',
  sortOrder = 0,
}) {
  if (!title && !summary && !content && !tags?.length) return null;
  const source = getAgentSource(sourceId);
  if (!source) return null;

  const safeTitle = title || summary || uniqueCompactArray(tags)[0] || 'Untitled';
  const safeSummary = summary || '';
  const safeContent = content || '';
  const safeTags = uniqueCompactArray(tags);
  const safeItemType = truncateText(itemType || source.sourceType, 120);
  const safeStatus = truncateText(status, 120);
  const sourceLabel = getAgentSourceLabel(sourceId, lang);
  const searchAliases = uniqueCompactArray(getSearchAliases(sourceId, lang));
  const searchableText = truncateText([
    safeTitle,
    safeSummary,
    safeContent,
    safeTags.join(' '),
    searchAliases.join(' '),
    sourceLabel,
    safeItemType,
    safeStatus,
  ].filter(Boolean).join(' '), MAX_SEARCHABLE_LENGTH);

  return {
    id: `${sourceId}:${truncateText(item?.id || safeTitle, 160)}`,
    sourceId,
    moduleKey: source.moduleKey,
    itemType: safeItemType,
    title: safeTitle,
    summary: safeSummary,
    content: safeContent,
    tags: safeTags,
    searchAliases,
    moduleLabel: sourceLabel,
    sourceLabel,
    status: safeStatus,
    sourceUrl: safeExternalUrl(sourceUrl),
    sourceRoute: sourceRoute || source.moduleRoute,
    updatedAt: truncateText(updatedAt, 80),
    sortOrder,
    canonicalId: truncateText(item?.slug || item?.recordId || item?.id || safeTitle, 160),
    searchableText,
  };
}

export function identityAdapter(item, lang) {
  return createDocument({
    sourceId: 'identity',
    item,
    itemType: item.identityType || 'identity',
    title: getLocalizedValue(item, 'name', lang),
    summary: getLocalizedValue(item, 'shortPositioning', lang),
    content: joinPublicContent([
      getLocalizedValue(item, 'fullIntroduction', lang),
      getLocalizedValue(item, 'corePhilosophy', lang),
    ]),
    tags: [item.roleTags, item.relatedModules, item.identityType],
    status: item.identityType,
    sourceUrl: item.externalUrl,
    updatedAt: item.updatedAt || item.createdAt,
    lang,
  });
}

export function researchAdapter(item, lang) {
  return createDocument({
    sourceId: 'research',
    item,
    itemType: item.sourceType || 'literature',
    title: getLocalizedValue(item, 'title', lang),
    summary: getLocalizedValue(item, 'summary', lang, { allowNeutral: false }),
    content: joinPublicContent([item.authors, item.year, item.theoryModels, item.researchMethod, item.variables, item.usage]),
    tags: [item.theoryModels, item.variables],
    status: item.status,
    sourceUrl: item.sourceUrl,
    updatedAt: item.updatedAt,
    lang,
  });
}

export function teachingAdapter(item, lang) {
  return createDocument({
    sourceId: 'teaching',
    item,
    itemType: item.teachingCategory || item.courseType || 'teaching',
    title: getLocalizedValue(item, 'title', lang),
    summary: getLocalizedValue(item, 'summary', lang),
    content: joinPublicContent([item.subTopic, item.topic, item.learningGoals, item.usage, item.targetAudience, item.difficulty]),
    tags: [item.tags, item.format, item.language, item.targetAudience],
    status: item.status,
    sourceUrl: item.fileUrl || item.sourceUrl,
    updatedAt: item.updatedAt || item.createdAt,
    lang,
  });
}

export function knowledgeAdapter(item, lang) {
  return createDocument({
    sourceId: 'knowledge',
    item,
    itemType: item.type || item.category || 'knowledge',
    title: getLocalizedValue(item, 'title', lang),
    summary: getLocalizedValue(item, 'summary', lang, { allowNeutral: false }),
    content: joinPublicContent([item.category, item.relatedModule]),
    tags: [item.tags, item.category, item.relatedModule],
    status: item.status,
    sourceUrl: item.sourceUrl,
    updatedAt: item.updatedAt,
    lang,
  });
}

export function demoAdapter(item, lang, index = 0) {
  return createDocument({
    sourceId: 'demos',
    item,
    itemType: item.demoType || 'demo',
    title: getLocalizedValue(item, 'name', lang),
    summary: getLocalizedValue(item, 'summary', lang),
    content: joinPublicContent([
      getLocalizedValue(item, 'problem', lang),
      getLocalizedValue(item, 'solution', lang),
      getLocalizedValue(item, 'coreFeatures', lang),
      getLocalizedValue(item, 'nextStep', lang),
      item.targetUsers,
      item.relatedModules,
    ]),
    tags: [item.techStack, item.relatedModules, item.targetUsers, item.demoType],
    status: item.status,
    sourceUrl: item.researchLink || item.githubUrl || item.demoUrl,
    updatedAt: item.updatedAt,
    lang,
    sortOrder: index,
  });
}

export function actionAdapter(item, lang) {
  return createDocument({
    sourceId: 'action',
    item,
    itemType: item.projectType || 'project',
    title: getLocalizedValue(item, 'name', lang),
    summary: getLocalizedValue(item, 'publicSummary', lang),
    content: joinPublicContent([item.currentPhase, item.nextAction, item.automationStatus, item.priority]),
    tags: [item.projectType, item.automationStatus, item.priority],
    status: item.status,
    sourceUrl: item.deploymentUrl || item.githubUrl || item.evidenceUrl,
    updatedAt: item.updatedAt || item.dueDate || item.startDate,
    lang,
  });
}

export function collaborationAdapter(item, lang) {
  return createDocument({
    sourceId: 'collaboration',
    item,
    itemType: item.organizationType || 'collaboration',
    title: getLocalizedValue(item, 'title', lang),
    summary: getLocalizedValue(item, 'summary', lang),
    content: joinPublicContent([item.organizationType, item.collaborationTypes, item.publicStage]),
    tags: [item.collaborationTypes, item.organizationType, item.publicStage],
    status: item.publicStage,
    sourceUrl: item.websiteUrl,
    updatedAt: item.updatedAt,
    lang,
  });
}

const ADAPTERS = {
  identity: identityAdapter,
  research: researchAdapter,
  teaching: teachingAdapter,
  knowledge: knowledgeAdapter,
  demos: demoAdapter,
  action: actionAdapter,
  collaboration: collaborationAdapter,
};

export function createKnowledgeDocuments(sourceId, items = [], lang = 'en') {
  const adapter = ADAPTERS[sourceId];
  if (!adapter || !Array.isArray(items)) return [];

  return items
    .map((item, index) => adapter(item, lang, index))
    .filter(Boolean)
    .filter((document) => {
      const serialized = JSON.stringify(document).toLowerCase();
      return ![...INTERNAL_KEYS].some((key) => serialized.includes(`"${key.toLowerCase()}"`));
    });
}

export function createKnowledgeDocumentsFromPayloads(payloads = {}, lang = 'en') {
  const repository = createContentRepositoryFromPublicPayloads(payloads);
  const locale = normalizeContentLocale(lang);
  return repository.list({ limit: 500, includeMetadata: true }).map((item, index) => {
    const sourceId = item.metadata?.agentSourceId;
    return createDocument({
      sourceId,
      item: { id: item.sourceId || item.id, slug: item.slug },
      itemType: item.contentType,
      title: resolveLocalizedText(item.title, locale),
      summary: resolveLocalizedText(item.summary, locale),
      content: joinPublicContent([
        resolveLocalizedText(item.description, locale),
        resolveLocalizedText(item.content, locale),
      ]),
      tags: [item.tags, item.categories],
      status: item.workflowStatus,
      sourceUrl: item.sourceUrl || item.url || item.githubUrl || item.demoUrl,
      updatedAt: item.updatedAt || item.publishedAt || item.createdAt,
      lang,
      sortOrder: index,
    });
  }).filter(Boolean);
}
