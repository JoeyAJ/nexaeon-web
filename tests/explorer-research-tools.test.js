import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPLORER_TOOL_DEFINITIONS,
  EXPLORER_TOOL_NAMES,
  executeExplorerResearchTool,
  filterResearchItems,
  getResearchItem,
  listResearchTopics,
  loadPublicResearchItems,
  searchResearchItems,
} from '../lib/agent/explorerResearchTools.js';

const sourceItems = [
  {
    id: 'published-utm',
    title: 'UTAUT and AI learning adoption',
    authors: ['Joey'],
    year: '2024',
    sourceType: 'Journal Article',
    theoryModels: ['UTAUT'],
    researchMethod: 'SEM',
    variables: ['Behavioral intention'],
    summaryEn: 'A public study of AI learning adoption.',
    sourceUrl: 'https://doi.org/10.1000/public',
    visibility: 'Published',
  },
  {
    id: 'published-interview',
    title: 'AI literacy interviews',
    authors: ['Research Team'],
    year: '2022',
    sourceType: 'Research Note',
    theoryModels: ['AI literacy'],
    researchMethod: 'Interview',
    variables: ['Critical evaluation'],
    summaryEn: 'A qualitative public research note.',
    publicStatus: 'Public',
  },
  {
    id: 'draft-secret',
    title: 'Unreleased AI study',
    year: '2025',
    summaryEn: 'Draft finding.',
    visibility: 'Draft',
  },
  {
    id: 'hidden-secret',
    title: 'Hidden methods',
    year: '2026',
    summaryEn: 'Hidden finding.',
    publicStatus: 'Hidden',
  },
];

async function loadFixture() {
  return loadPublicResearchItems({
    getResearchLiteratureImpl: async () => ({ source: 'notion', items: sourceItems }),
  });
}

test('Explorer exposes exactly four read-only Research tools', () => {
  assert.deepEqual(EXPLORER_TOOL_NAMES, [
    'searchResearchItems',
    'getResearchItem',
    'filterResearchItems',
    'listResearchTopics',
  ]);
  assert.deepEqual(EXPLORER_TOOL_DEFINITIONS.map(({ name }) => name), EXPLORER_TOOL_NAMES);
  for (const definition of EXPLORER_TOOL_DEFINITIONS) {
    assert.equal(definition.type, 'function');
    assert.equal(definition.parameters.additionalProperties, false);
  }
});

test('public Research loader normalizes Notion/Airtable-shaped records and excludes Draft or Hidden records', async () => {
  const data = await loadFixture();
  assert.equal(data.sourcePlatform, 'notion');
  assert.deepEqual(data.items.map(({ id }) => id), ['published-utm', 'published-interview']);
  assert.equal(data.items[0].sourcePlatform, 'notion');
  assert.equal(data.items[0].sourceUrl, 'https://doi.org/10.1000/public');
  assert.equal(data.items[0].summary.en, 'A public study of AI learning adoption.');
});

test('Research tools search keywords, retrieve by id, filter topic/method/year, and list topics', async () => {
  const data = await loadFixture();
  assert.deepEqual(searchResearchItems(data, { query: 'UTAUT adoption' }).items.map(({ id }) => id), ['published-utm']);
  assert.equal(getResearchItem(data, { id: 'published-interview' }).items[0].title, 'AI literacy interviews');
  assert.deepEqual(filterResearchItems(data, {
    topic: 'UTAUT',
    method: 'SEM',
    yearFrom: 2023,
    yearTo: 2025,
  }).items.map(({ id }) => id), ['published-utm']);
  assert.ok(listResearchTopics(data).topics.some(({ name }) => name === 'UTAUT'));
});

test('Research tools return explicit empty collections and reject non-allowlisted tools', async () => {
  const data = await loadFixture();
  assert.deepEqual(searchResearchItems(data, { query: 'no-such-keyword' }).items, []);
  assert.deepEqual(getResearchItem(data, { id: 'draft-secret' }).items, []);
  assert.throws(
    () => executeExplorerResearchTool('updateResearchItem', {}, data),
    /explorer_tool_not_allowed/,
  );
});

test('Research source failures are surfaced instead of exposing partial invalid data', async () => {
  await assert.rejects(
    () => loadPublicResearchItems({
      getResearchLiteratureImpl: async () => {
        throw new Error('notion unavailable');
      },
    }),
    /notion unavailable/,
  );
  await assert.rejects(
    () => loadPublicResearchItems({ getResearchLiteratureImpl: async () => ({ items: null }) }),
    /research_source_invalid/,
  );
});
