import { createContentItem, normalizeStringArray } from '../contentSchema.js';
import { localizedTextFromLegacy } from '../localization.js';

const SOURCE_CONFIG = Object.freeze({
  identity: { module: 'identity', contentType: 'identity_profile' },
  research: { module: 'research', contentType: 'research_literature' },
  teaching: { module: 'coaching', contentType: 'coaching_material' },
  knowledge: { module: 'knowledge', contentType: 'knowledge_note' },
  demos: { module: 'prototype', contentType: 'demo' },
  action: { module: 'action', contentType: 'task' },
  collaboration: { module: 'identity', contentType: 'collaboration_option' },
});

function sourceName(payload) {
  return ['notion', 'airtable', 'fallback'].includes(payload?.source) ? payload.source : 'public_api';
}

function knowledgeContentType(item) {
  if (item.sourceDatabase === 'research') return 'research_literature';
  if (item.sourceDatabase === 'teaching') return 'coaching_material';
  if (item.sourceDatabase === 'inspiration') return 'inspiration';
  if (item.sourceDatabase === 'brand') return 'brand_content';
  return 'knowledge_note';
}

function adaptFields(sourceId, item) {
  if (sourceId === 'identity') return {
    title: localizedTextFromLegacy(item, 'name'), summary: localizedTextFromLegacy(item, 'shortPositioning'),
    description: localizedTextFromLegacy(item, 'fullIntroduction'), content: localizedTextFromLegacy(item, 'corePhilosophy'),
    tags: [item.roleTags, item.relatedModules], categories: [item.identityType], workflowStatus: item.identityType,
    sourceUrl: item.externalUrl, createdAt: item.createdAt, updatedAt: item.updatedAt,
  };
  if (sourceId === 'research') return {
    title: localizedTextFromLegacy(item, 'title'), summary: localizedTextFromLegacy(item, 'summary', { neutral: false }),
    content: localizedTextFromLegacy({ content: [item.authors, item.year, item.researchMethod, item.variables, item.usage].flat().filter(Boolean).join(' ') }, 'content'),
    tags: [item.theoryModels, item.variables], categories: [item.sourceType], workflowStatus: item.status,
    sourceUrl: item.sourceUrl, updatedAt: item.updatedAt,
  };
  if (sourceId === 'teaching') return {
    title: localizedTextFromLegacy(item, 'title'), summary: localizedTextFromLegacy(item, 'summary'),
    content: localizedTextFromLegacy({ content: [item.subTopic, item.learningGoals, item.usage].filter(Boolean).join(' ') }, 'content'),
    tags: [item.tags, item.format, item.language, item.targetAudience], categories: [item.teachingCategory, item.courseType],
    workflowStatus: item.status, sourceUrl: item.sourceUrl || item.fileUrl, createdAt: item.createdAt, updatedAt: item.updatedAt,
  };
  if (sourceId === 'knowledge') return {
    title: localizedTextFromLegacy(item, 'title'), summary: localizedTextFromLegacy(item, 'summary', { neutral: false }),
    tags: item.tags, categories: [item.category, item.relatedModule], workflowStatus: item.status,
    sourceUrl: item.url || item.sourceUrl, createdAt: item.createdAt, updatedAt: item.updatedAt,
  };
  if (sourceId === 'demos') return {
    title: localizedTextFromLegacy(item, 'name'), summary: localizedTextFromLegacy(item, 'summary'),
    description: localizedTextFromLegacy(item, 'problem'), content: localizedTextFromLegacy(item, 'solution'),
    tags: [item.techStack, item.relatedModules, item.targetUsers], categories: [item.demoType], workflowStatus: item.status,
    slug: item.slug, demoUrl: item.demoUrl, githubUrl: item.githubUrl, sourceUrl: item.researchLink, updatedAt: item.updatedAt,
    metadata: { launchMode: item.launchMode, featured: item.featured, displayOrder: item.displayOrder, agentSourceId: sourceId },
  };
  if (sourceId === 'action') return {
    title: localizedTextFromLegacy(item, 'name'), summary: localizedTextFromLegacy(item, 'publicSummary'),
    content: localizedTextFromLegacy({ content: [item.currentPhase, item.nextAction, item.automationStatus].filter(Boolean).join(' ') }, 'content'),
    tags: [item.projectType, item.priority, item.automationStatus], categories: [item.projectType], workflowStatus: item.status,
    githubUrl: item.githubUrl, url: item.deploymentUrl || item.evidenceUrl, publishedAt: item.startDate, updatedAt: item.updatedAt || item.dueDate,
    metadata: { priority: item.priority, progress: item.progress, dueDate: item.dueDate, agentSourceId: sourceId },
  };
  return {
    title: localizedTextFromLegacy(item, 'title'), summary: localizedTextFromLegacy(item, 'summary'),
    tags: item.collaborationTypes, categories: [item.organizationType], workflowStatus: item.publicStage,
    url: item.websiteUrl, updatedAt: item.updatedAt,
  };
}

export function adaptPublicApiItem(sourceId, item, payload = {}) {
  const config = SOURCE_CONFIG[sourceId];
  if (!config || !item || typeof item !== 'object') return { ok: false, item: null, issues: ['unsupported_source'] };
  const sourceIdValue = String(item.id || item.slug || '').trim();
  const fields = adaptFields(sourceId, item);
  const visibility = item.visibility ?? item.publicStatus;
  return createContentItem({
    id: `${config.module}:${sourceIdValue}`,
    source: sourceName(payload), sourceId: sourceIdValue, module: config.module,
    contentType: sourceId === 'knowledge' ? knowledgeContentType(item) : config.contentType,
    visibility, ...fields,
    tags: normalizeStringArray(fields.tags), categories: normalizeStringArray(fields.categories),
    metadata: { ...fields.metadata, agentSourceId: sourceId, originalLocale: item.language || '' },
  }, { trustedPublic: visibility === undefined });
}

export function adaptPublicApiPayload(sourceId, payload = {}) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const contentItems = [];
  const warnings = [];
  items.forEach((item, index) => {
    const result = adaptPublicApiItem(sourceId, item, payload);
    if (result.ok) contentItems.push(result.item);
    else warnings.push({ sourceId, index, issueCodes: result.issues });
  });
  return { items: contentItems, warnings, source: sourceName(payload), partial: payload?.reason === 'partial_source_failure' };
}

