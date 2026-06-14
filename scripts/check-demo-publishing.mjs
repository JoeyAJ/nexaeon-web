/* global process */

import { getAirtableRecords } from '../api/_airtable.js';
import {
  getDuplicatePublicDemoSlugs,
  getDemoFieldText,
  validateDemoPublishing,
} from '../lib/demoPublishing.js';

function hasRequiredAirtableEnv() {
  return Boolean(
    process.env.AIRTABLE_API_KEY?.trim()
    && process.env.AIRTABLE_BASE_ID?.trim()
    && process.env.AIRTABLE_MVP_TABLE_ID?.trim(),
  );
}

function formatList(values) {
  return values.length ? values.join(', ') : '-';
}

function createReportRow(record, duplicateSlugs) {
  const report = validateDemoPublishing(record, { duplicateSlugs });

  return {
    Name: report.name || getDemoFieldText(record, 'nameEn') || 'Untitled Demo',
    Slug: report.slug || '[missing-slug]',
    Visibility: report.visibility || '-',
    Status: report.status || '-',
    'Showcase Ready': report.showcaseReady ? 'yes' : 'no',
    'Launch Ready': report.launchReady ? 'yes' : 'no',
    Blockers: formatList(report.blockers),
    Warnings: formatList(report.warnings),
  };
}

async function main() {
  if (!hasRequiredAirtableEnv()) {
    console.error('Missing Airtable configuration. Set AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and AIRTABLE_MVP_TABLE_ID before running this read-only check.');
    process.exitCode = 1;
    return;
  }

  const records = await getAirtableRecords({
    baseId: process.env.AIRTABLE_BASE_ID,
    tableId: process.env.AIRTABLE_MVP_TABLE_ID,
  });
  const duplicateSlugs = getDuplicatePublicDemoSlugs(records);
  const rows = records.map((record) => createReportRow(record, duplicateSlugs));

  console.table(rows);

  const blockedPublicCount = rows.filter((row) => row.Visibility === 'Public' && row['Showcase Ready'] === 'no').length;
  const notLaunchReadyCount = rows.filter((row) => row['Launch Ready'] === 'no').length;

  console.log(JSON.stringify({
    demosChecked: rows.length,
    blockedPublicCount,
    notLaunchReadyCount,
  }, null, 2));
}

main().catch(() => {
  console.error('Demo publishing check failed. Review local Airtable configuration and network access.');
  process.exitCode = 1;
});
