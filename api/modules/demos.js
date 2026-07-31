/* global process */

import { getModuleEndpoint } from '../../src/data/moduleData.js';
import { getAirtableRecords } from '../_airtable.js';
import {
  createApiResponse,
  getUpstreamFailureReason,
  logSafeApiError,
  NO_STORE_CACHE_CONTROL,
  rejectUnsupportedMethod,
  sendMethodNotAllowed,
  setCacheHeaders,
} from '../_response.js';
import {
  DEMO_FIELD_NAMES,
  getDemoField,
  getPublishableDemoRecords,
  logDemoPublishingExclusion,
  toDemoText,
  validateDemoPublishing,
} from '../../lib/demoPublishing.js';
import { normalizeLaunchMode } from '../../src/lib/demoRuntime.js';

const MODULE_KEY = 'modules';
export const DEMO_SUCCESS_CACHE_CONTROL = 'public, max-age=0, s-maxage=30, stale-while-revalidate=30';

const TRANSLATION_FIELD_KEYS = {
  name: { zh: 'name', ko: 'nameKo', en: 'nameEn' },
  summary: { zh: 'summary', ko: 'summaryKo', en: 'summaryEn' },
  problem: { zh: 'problem', ko: 'problemKo', en: 'problemEn' },
  solution: { zh: 'solution', ko: 'solutionKo', en: 'solutionEn' },
  coreFeatures: { zh: 'coreFeatures', ko: 'coreFeaturesKo', en: 'coreFeaturesEn' },
  nextStep: { zh: 'nextStep', ko: 'nextStepKo', en: 'nextStepEn' },
};

function toText(value, fallback = '') {
  return toDemoText(value, fallback);
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
  return getDemoField(fields, key);
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

export function normalizeAirtableDemo(record, publishingReport) {
  const fields = record.fields || {};
  const translations = buildTranslations(fields);
  const name = translations.zh.name || 'Untitled Demo';
  const slug = toText(getRecordField(fields, 'slug')) || slugify(name);
  const report = publishingReport || validateDemoPublishing(record);
  const launchMode = normalizeLaunchMode(getRecordField(fields, 'launchMode')) || '';

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
    launchMode,
    launchReady: report.launchReady,
    launchActionMode: report.launchActionMode,
    demoUrl: report.safeDemoUrl || '',
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
    extra: { meta: { module: 'prototype' } },
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
  const { publishable } = getPublishableDemoRecords(records);
  return publishable.map(({ record, report }) => normalizeAirtableDemo(record, report));
}

function getDemoCacheControl(payload) {
  if (payload?.source === 'airtable' && payload?.reason === null) return DEMO_SUCCESS_CACHE_CONTROL;
  return NO_STORE_CACHE_CONTROL;
}

export function sendDemoJsonResponse(req, res, payload, status = 200) {
  if (req?.method !== 'GET') {
    sendMethodNotAllowed(res);
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  setCacheHeaders(res, getDemoCacheControl(payload));
  res.status(status).json(payload);
}

export async function getModuleDemos({
  env = process.env,
  getAirtableRecordsImpl = getAirtableRecords,
} = {}) {
  const baseId = env.AIRTABLE_BASE_ID?.trim();
  const tableId = env.AIRTABLE_MVP_TABLE_ID?.trim();

  if (!env.AIRTABLE_API_KEY || !baseId || !tableId) {
    return createFallbackResponse('missing_env');
  }

  try {
    const records = await getAirtableRecordsImpl({ baseId, tableId });
    const { excluded, publishable } = getPublishableDemoRecords(records);
    excluded.forEach(({ report }) => logDemoPublishingExclusion(report));
    const airtableItems = publishable.map(({ record, report }) => normalizeAirtableDemo(record, report));
    return createResponse('airtable', null, airtableItems);
  } catch (error) {
    const reason = getUpstreamFailureReason(error);
    logSafeApiError('/api/modules/demos', reason, 'airtable');
    return createFallbackResponse(reason);
  }
}

export default async function handler(req, res) {
  if (rejectUnsupportedMethod(req, res)) return;
  sendDemoJsonResponse(req, res, await getModuleDemos());
}

export { DEMO_FIELD_NAMES };
