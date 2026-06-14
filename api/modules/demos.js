/* global process */

import { getModuleEndpoint } from '../../src/data/moduleData.js';
import { getAirtableRecords } from '../_airtable.js';
import { createApiResponse, getUpstreamFailureReason, logSafeApiError, rejectUnsupportedMethod, sendJsonResponse } from '../_response.js';
import { isPublicAirtableVisibility } from '../../lib/publicFilters.js';

const MODULE_KEY = 'modules';

const FIELD_MAP = {
  name: 'Demo Name',
  nameKo: 'Demo Name KO',
  nameEn: 'Demo Name EN',
  slug: 'Slug',
  demoType: 'Demo Type',
  status: 'Status',
  version: 'Version',
  visibility: 'Visibility',
  featured: 'Featured',
  displayOrder: 'Display Order',
  summary: 'Summary',
  summaryKo: 'Summary KO',
  summaryEn: 'Summary EN',
  problem: 'Problem',
  problemKo: 'Problem KO',
  problemEn: 'Problem EN',
  solution: 'Solution',
  solutionKo: 'Solution KO',
  solutionEn: 'Solution EN',
  targetUsers: 'Target Users',
  coreFeatures: 'Core Features',
  coreFeaturesKo: 'Core Features KO',
  coreFeaturesEn: 'Core Features EN',
  techStack: 'Tech Stack',
  launchMode: 'Launch Mode',
  demoUrl: 'Demo URL',
  githubUrl: 'GitHub URL',
  coverImage: 'Cover Image',
  relatedModules: 'Related Modules',
  researchLink: 'Research Link',
  nextStep: 'Next Step',
  nextStepKo: 'Next Step KO',
  nextStepEn: 'Next Step EN',
  notes: 'Notes',
  updatedAt: 'Updated At',
};

const TRANSLATION_FIELD_KEYS = {
  name: { zh: 'name', ko: 'nameKo', en: 'nameEn' },
  summary: { zh: 'summary', ko: 'summaryKo', en: 'summaryEn' },
  problem: { zh: 'problem', ko: 'problemKo', en: 'problemEn' },
  solution: { zh: 'solution', ko: 'solutionKo', en: 'solutionEn' },
  coreFeatures: { zh: 'coreFeatures', ko: 'coreFeaturesKo', en: 'coreFeaturesEn' },
  nextStep: { zh: 'nextStep', ko: 'nextStepKo', en: 'nextStepEn' },
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

function buildTranslation(fields, locale) {
  return Object.fromEntries(Object.entries(TRANSLATION_FIELD_KEYS).map(([publicKey, fieldKeys]) => (
    [publicKey, toText(getRecordField(fields, fieldKeys[locale]))]
  )));
}

function buildTranslations(fields) {
  return {
    zh: buildTranslation(fields, 'zh'),
    ko: buildTranslation(fields, 'ko'),
    en: buildTranslation(fields, 'en'),
  };
}

export function normalizeAirtableDemo(record) {
  const fields = record.fields || {};
  const translations = buildTranslations(fields);
  const name = translations.zh.name || 'Untitled Demo';
  const slug = toText(getRecordField(fields, 'slug')) || slugify(name);

  return {
    id: `demo-${slug}`,
    slug,
    name,
    demoType: toText(getRecordField(fields, 'demoType')),
    status: toText(getRecordField(fields, 'status')),
    version: toText(getRecordField(fields, 'version')),
    featured: toBoolean(getRecordField(fields, 'featured')),
    displayOrder: toNumber(getRecordField(fields, 'displayOrder')),
    summary: translations.zh.summary,
    problem: translations.zh.problem,
    solution: translations.zh.solution,
    targetUsers: toStringArray(getRecordField(fields, 'targetUsers')),
    coreFeatures: translations.zh.coreFeatures,
    techStack: toStringArray(getRecordField(fields, 'techStack')),
    launchMode: toText(getRecordField(fields, 'launchMode')),
    demoUrl: toUrl(getRecordField(fields, 'demoUrl')),
    githubUrl: toUrl(getRecordField(fields, 'githubUrl')),
    coverImage: toCoverImage(getRecordField(fields, 'coverImage')),
    relatedModules: toStringArray(getRecordField(fields, 'relatedModules')),
    researchLink: toUrl(getRecordField(fields, 'researchLink')),
    nextStep: translations.zh.nextStep,
    translations,
    updatedAt: toText(getRecordField(fields, 'updatedAt')),
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

export function createResponse(source, reason, items) {
  const visibleItems = items.slice().sort(sortDemos);

  return createApiResponse({
    source,
    reason,
    items: visibleItems,
  });
}

export function createFallbackResponse(reason) {
  return {
    ...createResponse('fallback', reason, []),
    moduleKey: MODULE_KEY,
    endpoint: getModuleEndpoint(MODULE_KEY),
  };
}

export function normalizePublicAirtableDemos(records) {
  return records
    .filter((record) => isPublicAirtableVisibility(getRecordField(record.fields || {}, 'visibility')))
    .map(normalizeAirtableDemo);
}

export default async function handler(req, res) {
  if (rejectUnsupportedMethod(req, res)) return;

  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  const tableId = process.env.AIRTABLE_MVP_TABLE_ID?.trim();

  if (!process.env.AIRTABLE_API_KEY || !baseId || !tableId) {
    sendJsonResponse(req, res, createFallbackResponse('missing_env'));
    return;
  }

  try {
    const records = await getAirtableRecords({
      baseId,
      tableId,
    });

    const airtableItems = normalizePublicAirtableDemos(records);

    sendJsonResponse(req, res, createResponse('airtable', null, airtableItems));
  } catch (error) {
    const reason = getUpstreamFailureReason(error);
    logSafeApiError('/api/modules/demos', reason, 'airtable');
    sendJsonResponse(req, res, createFallbackResponse(reason));
  }
}
