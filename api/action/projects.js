/* global process */

import { getAirtableRecords } from '../_airtable.js';
import { getModuleData, getModuleEndpoint } from '../../src/data/moduleData.js';
import { createApiResponse, getUpstreamFailureReason, logSafeApiError, rejectUnsupportedMethod, sendJsonResponse } from '../_response.js';
import { isPublicAirtableVisibility } from '../../lib/publicFilters.js';

const MODULE_KEY = 'action';

const FIELD_MAP = {
  name: 'Project Name',
  projectType: 'Project Type',
  status: 'Status',
  priority: 'Priority',
  startDate: 'Start Date',
  dueDate: 'Due Date',
  progress: 'Progress',
  currentPhase: 'Current Phase',
  nextAction: 'Next Action',
  publicSummary: 'Public Summary',
  githubUrl: 'GitHub URL',
  deploymentUrl: 'Deployment URL',
  automationStatus: 'Automation Status',
  evidenceUrl: 'Evidence URL',
  updatedAt: 'Updated At',
  visibility: 'Visibility',
};

function toText(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object' && !Array.isArray(value)) return value.name || fallback;
  return String(value).trim() || fallback;
}

function toUrl(value) {
  return toText(value);
}

function toProgress(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  const displayValue = numericValue > 0 && numericValue <= 1 ? numericValue * 100 : numericValue;
  return Math.max(0, Math.min(100, Math.round(displayValue)));
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
  return isPublicAirtableVisibility(getRecordField(record.fields || {}, 'visibility'));
}

function slugify(value) {
  return String(value || 'untitled-project')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-project';
}

export function normalizeAirtableProject(record) {
  const fields = record.fields || {};
  const currentPhase = toText(getRecordField(fields, 'currentPhase'));
  const publicSummary = toText(getRecordField(fields, 'publicSummary')) || currentPhase;
  const name = toText(getRecordField(fields, 'name'), 'Untitled Project');

  return {
    id: `project-${slugify(name)}`,
    name,
    projectType: toText(getRecordField(fields, 'projectType')),
    status: toText(getRecordField(fields, 'status')),
    priority: toText(getRecordField(fields, 'priority')),
    startDate: toIsoDate(getRecordField(fields, 'startDate')),
    dueDate: toIsoDate(getRecordField(fields, 'dueDate')),
    progress: toProgress(getRecordField(fields, 'progress')),
    currentPhase,
    nextAction: toText(getRecordField(fields, 'nextAction')),
    publicSummary,
    githubUrl: toUrl(getRecordField(fields, 'githubUrl')),
    deploymentUrl: toUrl(getRecordField(fields, 'deploymentUrl')),
    automationStatus: toText(getRecordField(fields, 'automationStatus')),
    evidenceUrl: toUrl(getRecordField(fields, 'evidenceUrl')),
    updatedAt: toIsoDate(getRecordField(fields, 'updatedAt')),
  };
}

function getLocalizedFallbackTitle(item) {
  return item.titleEn || item.titleZh || item.titleKo || 'Untitled Project';
}

function getLocalizedFallbackDescription(item) {
  return item.descriptionEn || item.descriptionZh || item.descriptionKo || '';
}

function normalizeFallbackProject(item) {
  const projectTypeMap = {
    website: 'Website',
    research_system: 'Research',
    mvp: 'Product',
    automation: 'Automation',
    backend: 'Operations',
  };
  const publicSummary = getLocalizedFallbackDescription(item);

  return {
    id: item.id,
    name: getLocalizedFallbackTitle(item),
    projectType: projectTypeMap[item.type] || projectTypeMap[item.category] || 'Other',
    status: toText(item.status || 'Planned'),
    priority: 'Medium',
    startDate: '',
    dueDate: '',
    progress: 0,
    currentPhase: toText(item.category || item.status),
    nextAction: '',
    publicSummary,
    githubUrl: '',
    deploymentUrl: toUrl(item.actionUrl),
    automationStatus: 'Planned',
    evidenceUrl: '',
    updatedAt: toIsoDate(item.updatedAt),
  };
}

function getUpdatedTime(item) {
  const time = new Date(item.updatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortProjects(a, b) {
  const updatedDifference = getUpdatedTime(b) - getUpdatedTime(a);
  if (updatedDifference) return updatedDifference;
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
}

export function createResponse(source, reason, items) {
  const publicItems = items.slice().sort(sortProjects);

  return createApiResponse({
    source,
    reason,
    items: publicItems,
    extra: { meta: { module: 'action' } },
  });
}

function createFallbackResponse(reason) {
  const fallbackItems = getModuleData(MODULE_KEY).map(normalizeFallbackProject);

  return {
    ...createResponse('fallback', reason, fallbackItems),
    moduleKey: MODULE_KEY,
    endpoint: getModuleEndpoint(MODULE_KEY),
  };
}

export default async function handler(req, res) {
  if (rejectUnsupportedMethod(req, res)) return;

  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  const tableId = process.env.AIRTABLE_PROJECTS_TABLE_ID?.trim();

  if (!process.env.AIRTABLE_API_KEY || !baseId || !tableId) {
    sendJsonResponse(req, res, createFallbackResponse('missing_env'));
    return;
  }

  try {
    const records = await getAirtableRecords({
      baseId,
      tableId,
    });

    const airtableItems = records
      .filter(isPublicRecord)
      .map(normalizeAirtableProject);

    sendJsonResponse(req, res, createResponse('airtable', null, airtableItems));
  } catch (error) {
    const reason = getUpstreamFailureReason(error);
    logSafeApiError('/api/action/projects', reason, 'airtable');
    sendJsonResponse(req, res, createFallbackResponse(reason));
  }
}
