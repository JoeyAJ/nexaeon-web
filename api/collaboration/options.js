/* global process */

import { getAirtableRecords } from '../_airtable.js';
import { getModuleData, getModuleEndpoint } from '../../src/data/moduleData.js';

const MODULE_KEY = 'collaboration';

const FIELD_MAP = {
  visibility: 'Visibility',
  title: 'Public Title',
  summary: 'Public Summary',
  publicStage: 'Public Stage',
  featured: 'Featured',
  displayOrder: 'Display Order',
  organizationType: 'Organization Type',
  collaborationTypes: 'Collaboration Type',
  websiteUrl: 'Website URL',
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

function toIsoDate(value) {
  const text = toText(value);
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return date.toISOString();
}

function getRecordField(fields, key) {
  return fields[FIELD_MAP[key]];
}

function isPublicRecord(record) {
  const visibility = toText(getRecordField(record.fields || {}, 'visibility')).toLowerCase();
  return visibility === 'public';
}

function normalizeAirtableContext(record) {
  const fields = record.fields || {};

  return {
    id: record.id,
    title: toText(getRecordField(fields, 'title'), 'Untitled Collaboration Context'),
    summary: toText(getRecordField(fields, 'summary')),
    organizationType: toText(getRecordField(fields, 'organizationType')),
    collaborationTypes: toStringArray(getRecordField(fields, 'collaborationTypes')),
    publicStage: toText(getRecordField(fields, 'publicStage')),
    featured: toBoolean(getRecordField(fields, 'featured')),
    displayOrder: toNumber(getRecordField(fields, 'displayOrder')),
    websiteUrl: toUrl(getRecordField(fields, 'websiteUrl')),
    updatedAt: toIsoDate(getRecordField(fields, 'updatedAt')),
  };
}

function getLocalizedFallbackTitle(item) {
  return item.titleEn || item.titleZh || item.titleKo || 'Untitled Collaboration Context';
}

function getLocalizedFallbackDescription(item) {
  return item.descriptionEn || item.descriptionZh || item.descriptionKo || '';
}

function normalizeFallbackContext(item) {
  const organizationTypeMap = {
    academic: 'University',
    workshop: 'University',
    consulting: 'Company',
    enterprise: 'Company',
    education_partnership: 'Other',
  };
  const typeMap = {
    academic: ['Research'],
    workshop: ['Workshop', 'Lecture'],
    consulting: ['AI Education Consulting'],
    enterprise: ['Data / Automation'],
    education_partnership: ['Product Pilot'],
  };

  return {
    id: item.id,
    title: getLocalizedFallbackTitle(item),
    summary: getLocalizedFallbackDescription(item),
    organizationType: organizationTypeMap[item.type] || organizationTypeMap[item.category] || 'Other',
    collaborationTypes: typeMap[item.type] || typeMap[item.category] || ['Other'],
    publicStage: item.featured ? 'Exploring' : 'Open',
    featured: toBoolean(item.featured),
    displayOrder: toNumber(item.order),
    websiteUrl: '',
    updatedAt: toIsoDate(item.updatedAt),
  };
}

function getUpdatedTime(item) {
  const time = new Date(item.updatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortContexts(a, b) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
  const updatedDifference = getUpdatedTime(b) - getUpdatedTime(a);
  if (updatedDifference) return updatedDifference;
  return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });
}

function getLatestUpdatedAt(items) {
  const latest = items
    .map((item) => item.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return latest || new Date().toISOString();
}

function createSummary(items) {
  return {
    total: items.length,
    open: items.filter((item) => item.publicStage === 'Open').length,
    exploring: items.filter((item) => item.publicStage === 'Exploring').length,
    inDevelopment: items.filter((item) => item.publicStage === 'In Development').length,
    active: items.filter((item) => item.publicStage === 'Active').length,
    completed: items.filter((item) => item.publicStage === 'Completed').length,
  };
}

function createResponse(source, reason, items) {
  const publicItems = items.slice().sort(sortContexts);

  return {
    source,
    ...(reason ? { reason } : {}),
    count: publicItems.length,
    updatedAt: getLatestUpdatedAt(publicItems),
    summary: createSummary(publicItems),
    items: publicItems,
    data: publicItems,
  };
}

function createFallbackResponse(reason) {
  const fallbackItems = getModuleData(MODULE_KEY).map(normalizeFallbackContext);

  return {
    ...createResponse('fallback', reason, fallbackItems),
    moduleKey: MODULE_KEY,
    endpoint: getModuleEndpoint(MODULE_KEY),
  };
}

export default async function handler(req, res) {
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  const tableId = process.env.AIRTABLE_COLLABORATION_TABLE_ID?.trim();

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

    const airtableItems = records
      .filter(isPublicRecord)
      .map(normalizeAirtableContext);

    res.status(200).json(createResponse('airtable', undefined, airtableItems));
  } catch (error) {
    console.error('[api/collaboration/options] Airtable fetch failed', error?.message || 'unknown_error');
    res.status(200).json(createFallbackResponse('airtable_fetch_failed'));
  }
}
