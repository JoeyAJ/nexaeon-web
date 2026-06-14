import {
  getInternalDemoStatus,
  getValidatedDemoUrl,
  LAUNCH_MODES,
  normalizeLaunchMode,
} from '../src/lib/demoRuntime.js';
import { internalDemoRegistry } from '../src/lib/internalDemoRegistry.js';
import { isPublicAirtableVisibility } from './publicFilters.js';

export const DEMO_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const DEMO_FIELD_NAMES = Object.freeze({
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
});

const OPTIONAL_WARNING_FIELDS = [
  ['version', 'missing_version'],
  ['coverImage', 'missing_cover'],
  ['githubUrl', 'missing_github_url'],
  ['researchLink', 'missing_research_link'],
];

export function toDemoText(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object' && !Array.isArray(value)) return String(value.name || fallback).trim();
  return String(value).trim() || fallback;
}

export function getDemoRecordFields(record) {
  return record?.fields || {};
}

export function getDemoField(fieldsOrRecord, key) {
  const fields = fieldsOrRecord?.fields ? fieldsOrRecord.fields : fieldsOrRecord;
  return fields?.[DEMO_FIELD_NAMES[key]];
}

export function getDemoFieldText(fieldsOrRecord, key) {
  return toDemoText(getDemoField(fieldsOrRecord, key));
}

export function isArchivedDemoStatus(value) {
  return toDemoText(value).toLowerCase() === 'archived';
}

export function isValidDemoSlug(value) {
  return DEMO_SLUG_PATTERN.test(toDemoText(value));
}

export function getPublicDemoSlugCounts(records = []) {
  const counts = new Map();

  for (const record of records) {
    const fields = getDemoRecordFields(record);
    const visibility = getDemoField(fields, 'visibility');
    const status = getDemoField(fields, 'status');
    const slug = getDemoFieldText(fields, 'slug');

    if (!isPublicAirtableVisibility(visibility) || isArchivedDemoStatus(status) || !isValidDemoSlug(slug)) continue;
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }

  return counts;
}

export function getDuplicatePublicDemoSlugs(records = []) {
  return new Set([...getPublicDemoSlugCounts(records).entries()]
    .filter(([, count]) => count > 1)
    .map(([slug]) => slug));
}

function hasOptionalValue(fields, key) {
  const value = getDemoField(fields, key);
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(toDemoText(value));
}

function createLaunchReport(fields, slug, options = {}) {
  const mode = normalizeLaunchMode(getDemoField(fields, 'launchMode'));
  const safeDemoUrl = getValidatedDemoUrl(getDemoField(fields, 'demoUrl'), options.urlOptions);
  const registry = options.internalRegistry || internalDemoRegistry;

  if (mode === LAUNCH_MODES.INTERNAL) {
    const isRegistered = getInternalDemoStatus(slug, registry) === 'registered';
    return {
      launchReady: isRegistered,
      launchMode: mode,
      launchActionMode: isRegistered ? LAUNCH_MODES.INTERNAL : (safeDemoUrl ? LAUNCH_MODES.EXTERNAL : null),
      safeDemoUrl,
    };
  }

  if (mode === LAUNCH_MODES.EMBEDDED) {
    return {
      launchReady: Boolean(safeDemoUrl),
      launchMode: mode,
      launchActionMode: safeDemoUrl ? LAUNCH_MODES.EMBEDDED : null,
      safeDemoUrl,
    };
  }

  if (mode === LAUNCH_MODES.EXTERNAL || (!mode && safeDemoUrl)) {
    return {
      launchReady: Boolean(safeDemoUrl),
      launchMode: mode || LAUNCH_MODES.EXTERNAL,
      launchActionMode: safeDemoUrl ? LAUNCH_MODES.EXTERNAL : null,
      safeDemoUrl,
    };
  }

  return {
    launchReady: false,
    launchMode: mode,
    launchActionMode: null,
    safeDemoUrl: null,
  };
}

export function validateDemoPublishing(record, options = {}) {
  const fields = getDemoRecordFields(record);
  const slug = getDemoFieldText(fields, 'slug');
  const visibility = getDemoFieldText(fields, 'visibility');
  const status = getDemoFieldText(fields, 'status');
  const blockers = [];
  const warnings = [];

  if (!isPublicAirtableVisibility(getDemoField(fields, 'visibility'))) blockers.push('not_public');
  if (isArchivedDemoStatus(status)) blockers.push('archived');
  if (!slug) blockers.push('missing_slug');
  else if (!isValidDemoSlug(slug)) blockers.push('invalid_slug');

  const duplicateSlugs = options.duplicateSlugs || new Set();
  if (slug && duplicateSlugs.has(slug)) blockers.push('duplicate_slug');

  if (!getDemoFieldText(fields, 'demoType')) blockers.push('missing_demo_type');
  if (!status) blockers.push('missing_status');
  if (!getDemoFieldText(fields, 'name')) blockers.push('missing_name_zh');
  if (!getDemoFieldText(fields, 'nameKo')) blockers.push('missing_name_ko');
  if (!getDemoFieldText(fields, 'nameEn')) blockers.push('missing_name_en');
  if (!getDemoFieldText(fields, 'summary')) blockers.push('missing_summary_zh');
  if (!getDemoFieldText(fields, 'summaryKo')) blockers.push('missing_summary_ko');
  if (!getDemoFieldText(fields, 'summaryEn')) blockers.push('missing_summary_en');

  for (const [key, warning] of OPTIONAL_WARNING_FIELDS) {
    if (!hasOptionalValue(fields, key)) warnings.push(warning);
  }

  const launch = createLaunchReport(fields, slug, options);
  if (!launch.launchReady && !launch.launchActionMode) warnings.push('not_launch_ready');

  return {
    name: getDemoFieldText(fields, 'name') || getDemoFieldText(fields, 'nameEn') || 'Untitled Demo',
    slug,
    visibility,
    status,
    showcaseReady: blockers.length === 0,
    launchReady: launch.launchReady,
    launchMode: launch.launchMode,
    launchActionMode: launch.launchActionMode,
    safeDemoUrl: launch.safeDemoUrl,
    blockers,
    warnings,
  };
}

export function getPublishableDemoRecords(records = [], options = {}) {
  const duplicateSlugs = options.duplicateSlugs || getDuplicatePublicDemoSlugs(records);
  const excluded = [];
  const publishable = [];

  for (const record of records) {
    const report = validateDemoPublishing(record, {
      ...options,
      duplicateSlugs,
    });

    if (report.showcaseReady) publishable.push({ record, report });
    else if (isPublicAirtableVisibility(getDemoField(record, 'visibility'))) excluded.push({ record, report });
  }

  return {
    duplicateSlugs,
    excluded,
    publishable,
  };
}

export function createSafePublishingLogEntry(report, endpoint = '/api/modules/demos') {
  return {
    endpoint,
    category: 'demo_not_publishable',
    slug: report.slug || '[missing-slug]',
    issueCodes: report.blockers,
  };
}

export function logDemoPublishingExclusion(report, endpoint = '/api/modules/demos') {
  console.warn(JSON.stringify(createSafePublishingLogEntry(report, endpoint)));
}
