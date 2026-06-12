/* global process */

import { getModuleData, getModuleEndpoint } from '../../src/data/moduleData.js';
import { getAirtableRecords } from '../_airtable.js';

const MODULE_KEY = 'modules';

const FIELD_MAP = {
  name: 'Demo Name',
  slug: 'Slug',
  demoType: 'Demo Type',
  status: 'Status',
  version: 'Version',
  visibility: 'Visibility',
  featured: 'Featured',
  displayOrder: 'Display Order',
  summary: 'Summary',
  problem: 'Problem',
  solution: 'Solution',
  targetUsers: 'Target Users',
  coreFeatures: 'Core Features',
  techStack: 'Tech Stack',
  launchMode: 'Launch Mode',
  demoUrl: 'Demo URL',
  githubUrl: 'GitHub URL',
  coverImage: 'Cover Image',
  relatedModules: 'Related Modules',
  researchLink: 'Research Link',
  nextStep: 'Next Step',
  notes: 'Notes',
  updatedAt: 'Updated At',
};

function toText(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object' && !Array.isArray(value)) return value.name || fallback;
  return String(value).trim() || fallback;
}

function toStringArray(value) {
  if (!Array.isArray(value)) return value ? [toText(value)].filter(Boolean) : [];
  return value.map((item) => toText(item)).filter(Boolean);
}

function toBoolean(value) {
  return value === true;
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toUrl(value) {
  return toText(value);
}

function toCoverImage(value) {
  if (!Array.isArray(value) || !value.length) return '';
  const firstAttachment = value[0] || {};
  if (!firstAttachment.url) return '';

  return {
    url: firstAttachment.url,
    filename: firstAttachment.filename || '',
  };
}

function slugify(value) {
  return String(value || 'untitled-demo')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-demo';
}

function getRecordField(fields, key) {
  return fields[FIELD_MAP[key]];
}

function normalizeAirtableDemo(record) {
  const fields = record.fields || {};
  const name = toText(getRecordField(fields, 'name'), 'Untitled Demo');
  const slug = toText(getRecordField(fields, 'slug')) || slugify(name);

  return {
    id: record.id,
    slug,
    name,
    demoType: toText(getRecordField(fields, 'demoType')),
    status: toText(getRecordField(fields, 'status')),
    version: toText(getRecordField(fields, 'version')),
    visibility: toText(getRecordField(fields, 'visibility')),
    featured: toBoolean(getRecordField(fields, 'featured')),
    displayOrder: toNumber(getRecordField(fields, 'displayOrder')),
    summary: toText(getRecordField(fields, 'summary')),
    problem: toText(getRecordField(fields, 'problem')),
    solution: toText(getRecordField(fields, 'solution')),
    targetUsers: toStringArray(getRecordField(fields, 'targetUsers')),
    coreFeatures: toText(getRecordField(fields, 'coreFeatures')),
    techStack: toStringArray(getRecordField(fields, 'techStack')),
    launchMode: toText(getRecordField(fields, 'launchMode')),
    demoUrl: toUrl(getRecordField(fields, 'demoUrl')),
    githubUrl: toUrl(getRecordField(fields, 'githubUrl')),
    coverImage: toCoverImage(getRecordField(fields, 'coverImage')),
    relatedModules: toStringArray(getRecordField(fields, 'relatedModules')),
    researchLink: toText(getRecordField(fields, 'researchLink')),
    nextStep: toText(getRecordField(fields, 'nextStep')),
    notes: toText(getRecordField(fields, 'notes')),
    updatedAt: toText(getRecordField(fields, 'updatedAt')),
  };
}

function getLocalizedFallbackTitle(item) {
  return item.titleEn || item.titleZh || item.titleKo || 'Untitled Demo';
}

function getLocalizedFallbackDescription(item) {
  return item.descriptionZh || item.descriptionEn || item.descriptionKo || '';
}

function normalizeFallbackDemo(item) {
  const name = getLocalizedFallbackTitle(item);
  const relatedModules = toStringArray(item.relatedModule || item.relatedProject || item.relatedTheory);
  const demoTypeMap = {
    ai_tutor: 'AI Tutor',
    education_mvp: 'Learning Companion',
    esg_greentech: 'ESG / Data System',
    automation: 'Automation',
    web_demo: 'Dashboard',
  };

  return {
    id: item.id,
    slug: item.slug || slugify(item.id || name),
    name,
    demoType: demoTypeMap[item.type] || toText(item.type || item.category),
    status: toText(item.status),
    version: '',
    visibility: 'Public',
    featured: toBoolean(item.featured),
    displayOrder: toNumber(item.order),
    summary: getLocalizedFallbackDescription(item),
    problem: '',
    solution: '',
    targetUsers: toStringArray(item.audience),
    coreFeatures: getLocalizedFallbackDescription(item),
    techStack: toStringArray(item.tags),
    launchMode: '',
    demoUrl: toUrl(item.actionUrl),
    githubUrl: '',
    coverImage: '',
    relatedModules,
    researchLink: '',
    nextStep: '',
    notes: '',
    updatedAt: toText(item.updatedAt),
  };
}

function getUpdatedTime(item) {
  const time = new Date(item.updatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortDemos(a, b) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
  const updatedDifference = getUpdatedTime(b) - getUpdatedTime(a);
  if (updatedDifference) return updatedDifference;
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
}

function getLatestUpdatedAt(items) {
  const latest = items
    .map((item) => item.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return latest || new Date().toISOString();
}

function isPubliclyVisible(item) {
  return String(item.visibility || '').trim().toLowerCase() !== 'private';
}

function createResponse(source, reason, items) {
  const visibleItems = items.filter(isPubliclyVisible).sort(sortDemos);

  return {
    source,
    ...(reason ? { reason } : {}),
    count: visibleItems.length,
    updatedAt: getLatestUpdatedAt(visibleItems),
    items: visibleItems,
    data: visibleItems,
  };
}

function createFallbackResponse(reason) {
  const fallbackItems = getModuleData(MODULE_KEY).map(normalizeFallbackDemo);
  return {
    ...createResponse('fallback', reason, fallbackItems),
    moduleKey: MODULE_KEY,
    endpoint: getModuleEndpoint(MODULE_KEY),
  };
}

export default async function handler(req, res) {
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  const tableId = process.env.AIRTABLE_MVP_TABLE_ID?.trim();

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!process.env.AIRTABLE_API_KEY || !baseId || !tableId) {
    res.status(200).json(createFallbackResponse('missing_env'));
    return;
  }

  try {
    const records = await getAirtableRecords({
      baseId,
      tableId,
    });

    const airtableItems = records.map(normalizeAirtableDemo);
    if (!airtableItems.length) {
      res.status(200).json(createFallbackResponse('empty_airtable_response'));
      return;
    }

    res.status(200).json(createResponse('airtable', undefined, airtableItems));
  } catch (error) {
    console.error('[api/modules/demos] Airtable fetch failed', error?.message || 'unknown_error');
    res.status(200).json(createFallbackResponse('airtable_fetch_failed'));
  }
}
