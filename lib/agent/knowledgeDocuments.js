import { getValidatedDemoUrl } from '../../src/lib/demoRuntime.js';
import { getAgentSource } from './sourceRegistry.js';

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
}) {
  if (!title && !summary && !content && !tags?.length) return null;
  const source = getAgentSource(sourceId);
  if (!source) return null;

  const safeTitle = title || summary || uniqueCompactArray(tags)[0] || 'Untitled';
  const safeSummary = summary || '';
  const safeContent = content || '';
  const safeTags = uniqueCompactArray(tags);
  const searchableText = truncateText([
    safeTitle,
    safeSummary,
    safeContent,
    safeTags.join(' '),
    status,
  ].filter(Boolean).join(' '), MAX_SEARCHABLE_LENGTH);

  return {
    id: `${sourceId}:${truncateText(item?.id || safeTitle, 160)}`,
    sourceId,
    moduleKey: source.moduleKey,
    itemType: itemType || source.sourceType,
    title: safeTitle,
    summary: safeSummary,
    content: safeContent,
    tags: safeTags,
    status: truncateText(status, 120),
    sourceUrl: safeExternalUrl(sourceUrl),
    sourceRoute: sourceRoute || source.moduleRoute,
    updatedAt: truncateText(updatedAt, 80),
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
  });
}

export function demoAdapter(item, lang) {
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
    .map((item) => adapter(item, lang))
    .filter(Boolean)
    .filter((document) => {
      const serialized = JSON.stringify(document).toLowerCase();
      return ![...INTERNAL_KEYS].some((key) => serialized.includes(`"${key.toLowerCase()}"`));
    });
}

export function createKnowledgeDocumentsFromPayloads(payloads = {}, lang = 'en') {
  return Object.entries(payloads).flatMap(([sourceId, payload]) => (
    createKnowledgeDocuments(sourceId, payload?.items || [], lang)
  ));
}
