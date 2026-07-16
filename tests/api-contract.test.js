import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createApiResponse,
  getCacheControlForPayload,
  getUpstreamFailureReason,
  NO_STORE_CACHE_CONTROL,
  rejectUnsupportedMethod,
  SUCCESS_CACHE_CONTROL,
} from '../api/_response.js';
import { createResponse as createActionResponse, normalizeAirtableProject } from '../api/action/projects.js';
import { createResponse as createCollaborationResponse, normalizeAirtableContext } from '../api/collaboration/options.js';
import {
  createFallbackResponse as createDemoFallbackResponse,
  createResponse as createDemoResponse,
  normalizeAirtableDemo,
  normalizePublicAirtableDemos,
} from '../api/modules/demos.js';
import { collectPaginatedNotionResults } from '../lib/notion.js';
import { isPublicAirtableVisibility, isPublishedNotionPage } from '../lib/publicFilters.js';
import { hasUnsafeInternalKey } from '../scripts/verify-production.mjs';

const FIXED_UPDATED_AT = '2026-06-12T05:40:00.000Z';

function makeDemoRecord(fields = {}) {
  return {
    id: 'recDemoSecret',
    fields: {
      'Demo Name': '繁中名稱',
      'Demo Name KO': '한국어 이름',
      'Demo Name EN': 'English Name',
      Summary: '繁中摘要',
      'Summary KO': '한국어 요약',
      'Summary EN': 'English summary',
      Problem: '繁中問題',
      'Problem KO': '한국어 문제',
      'Problem EN': 'English problem',
      Solution: '繁中解法',
      'Solution KO': '한국어 해결',
      'Solution EN': 'English solution',
      'Core Features': '繁中功能',
      'Core Features KO': '한국어 기능',
      'Core Features EN': 'English features',
      'Next Step': '繁中下一步',
      'Next Step KO': '한국어 다음 단계',
      'Next Step EN': 'English next step',
      Slug: 'demo-one',
      'Demo Type': 'AI Tutor',
      Status: 'Testing',
      Version: 'v1',
      Featured: false,
      'Display Order': 2,
      'Target Users': ['Students'],
      'Tech Stack': ['React'],
      'Launch Mode': 'External URL',
      'Demo URL': 'https://example.com/demo',
      'GitHub URL': 'https://github.com/JoeyAJ/nexaeon-web',
      'Related Modules': ['Research'],
      'Research Link': 'https://example.com/research',
      Visibility: 'Public',
      Notes: 'internal notes',
      'Updated At': FIXED_UPDATED_AT,
      ...fields,
    },
  };
}

function makeStatusPage(value, fieldName = '公開狀態') {
  return {
    properties: {
      [fieldName]: {
        type: 'select',
        select: value ? { name: value } : null,
      },
    },
  };
}

function makeFakeResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('createApiResponse returns the stable public contract', () => {
  const items = [{ id: 'safe-id', updatedAt: FIXED_UPDATED_AT }];
  const payload = createApiResponse({ source: 'notion', reason: null, items });

  for (const key of ['source', 'reason', 'count', 'updatedAt', 'items', 'data', 'meta']) {
    assert.ok(Object.hasOwn(payload, key));
  }

  assert.equal(payload.reason, null);
  assert.equal(payload.count, items.length);
  assert.deepEqual(payload.items, payload.data);
  assert.equal(payload.updatedAt, FIXED_UPDATED_AT);
  assert.equal(payload.meta.count, 1);
  assert.deepEqual(payload.meta.sources, ['notion']);
  assert.ok(payload.meta.generatedAt);
});

test('public endpoint metadata uses unified module names without changing legacy DTOs', () => {
  assert.equal(createDemoResponse('airtable', null, []).meta.module, 'prototype');
  assert.equal(createActionResponse('airtable', null, []).meta.module, 'action');
  assert.equal(createCollaborationResponse('airtable', null, []).meta.module, 'identity');
});

test('reason is restricted to safe enum values', () => {
  const payload = createApiResponse({ source: 'fallback', reason: 'raw sdk failure', items: [] });
  assert.equal(payload.reason, 'upstream_failed');
});

test('Notion public status accepts normalized published aliases and remains fail-closed', () => {
  assert.equal(isPublishedNotionPage(makeStatusPage('Published'), ['公開狀態']), true);
  for (const value of ['published', 'PUBLISHED', 'publish', 'live']) {
    assert.equal(isPublishedNotionPage(makeStatusPage(value), ['公開狀態']), true);
  }

  for (const value of ['Draft', 'Hidden', 'archived', '', 'Other']) {
    assert.equal(isPublishedNotionPage(makeStatusPage(value), ['公開狀態']), false);
  }

  assert.equal(isPublishedNotionPage({ properties: {} }, ['公開狀態']), false);
  assert.equal(isPublishedNotionPage(makeStatusPage('Published', 'Status'), ['公開狀態']), false);
});

test('Airtable visibility accepts normalized public aliases and rejects non-public states', () => {
  assert.equal(isPublicAirtableVisibility('Public'), true);
  assert.equal(isPublicAirtableVisibility({ name: 'Public' }), true);

  assert.equal(isPublicAirtableVisibility('public'), true);
  assert.equal(isPublicAirtableVisibility('PUBLIC'), true);
  for (const value of ['Private', 'Internal', 'Draft', 'Hidden', 'archived', '', undefined]) {
    assert.equal(isPublicAirtableVisibility(value), false);
  }
});

test('healthy empty upstream response does not become fallback', () => {
  const payload = createApiResponse({ source: 'airtable', reason: null, items: [] });
  assert.equal(payload.source, 'airtable');
  assert.equal(payload.reason, null);
  assert.equal(payload.count, 0);
  assert.deepEqual(payload.items, []);
});

test('cache headers follow source and reason', () => {
  assert.equal(
    getCacheControlForPayload(createApiResponse({ source: 'notion', reason: null, items: [] })),
    SUCCESS_CACHE_CONTROL,
  );
  assert.equal(
    getCacheControlForPayload(createApiResponse({ source: 'fallback', reason: 'missing_env', items: [] })),
    NO_STORE_CACHE_CONTROL,
  );
  assert.equal(
    getCacheControlForPayload(createApiResponse({ source: 'notion', reason: 'partial_source_failure', items: [] })),
    NO_STORE_CACHE_CONTROL,
  );
});

test('405 response uses safe contract and no-store cache', () => {
  const response = makeFakeResponse();
  assert.equal(rejectUnsupportedMethod({ method: 'POST' }, response), true);
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, 'GET');
  assert.equal(response.headers['cache-control'], NO_STORE_CACHE_CONTROL);
  assert.equal(response.headers['cdn-cache-control'], NO_STORE_CACHE_CONTROL);
  assert.equal(response.headers['vercel-cdn-cache-control'], NO_STORE_CACHE_CONTROL);
  assert.equal(response.body.source, 'fallback');
  assert.equal(response.body.reason, 'upstream_failed');
});

test('pagination helper collects multiple pages and stops on duplicate cursor', async () => {
  const calls = [];
  const results = await collectPaginatedNotionResults(async (cursor) => {
    calls.push(cursor || null);
    if (!cursor) return { results: [{ id: 'a' }], has_more: true, next_cursor: 'cursor-1' };
    if (cursor === 'cursor-1') return { results: [{ id: 'b' }], has_more: true, next_cursor: 'cursor-1' };
    return { results: [{ id: 'c' }], has_more: false, next_cursor: null };
  });

  assert.deepEqual(results, [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(calls, [null, 'cursor-1']);
});

test('pagination helper honors max page guard', async () => {
  const results = await collectPaginatedNotionResults(async () => ({
    results: [{ id: 'page' }],
    has_more: true,
    next_cursor: String(Math.random()),
  }), { maxPages: 3 });

  assert.equal(results.length, 3);
});

test('timeout is classified safely', () => {
  const error = new Error('not exposed');
  error.name = 'TimeoutError';
  assert.equal(getUpstreamFailureReason(error), 'upstream_timeout');
});

test('public Airtable DTOs omit internal fields and raw record IDs', () => {
  const demo = normalizeAirtableDemo({
    id: 'recDemoSecret',
    fields: {
      'Demo Name': 'Demo One',
      Slug: 'demo-one',
      Visibility: 'Public',
      Notes: 'internal note',
      'Updated At': FIXED_UPDATED_AT,
    },
  });
  const project = normalizeAirtableProject({
    id: 'recProjectSecret',
    fields: {
      'Project Name': 'Project One',
      Visibility: 'Public',
      Owner: 'private owner',
      Blockers: 'private blockers',
      Notes: 'private notes',
      'Updated At': FIXED_UPDATED_AT,
    },
  });
  const collaboration = normalizeAirtableContext({
    id: 'recCollabSecret',
    fields: {
      'Public Title': 'Collaboration One',
      Visibility: 'Public',
      Email: 'private@example.com',
      Notes: 'private notes',
      'Updated At': FIXED_UPDATED_AT,
    },
  });

  for (const item of [demo, project, collaboration]) {
    const keys = Object.keys(item).map((key) => key.toLowerCase());
    assert.equal(item.id.startsWith('rec'), false);
    for (const forbidden of ['notes', 'owner', 'email', 'blockers', 'visibility']) {
      assert.equal(keys.includes(forbidden), false);
    }
  }
});

test('Airtable demo multilingual fields map to zh, ko, and en translations', () => {
  const demo = normalizeAirtableDemo(makeDemoRecord());

  assert.equal(demo.name, '繁中名稱');
  assert.equal(demo.summary, '繁中摘要');
  assert.equal(demo.problem, '繁中問題');
  assert.equal(demo.solution, '繁中解法');
  assert.equal(demo.coreFeatures, '繁中功能');
  assert.equal(demo.nextStep, '繁中下一步');

  assert.deepEqual(demo.translations.zh, {
    name: '繁中名稱',
    summary: '繁中摘要',
    problem: '繁中問題',
    solution: '繁中解法',
    coreFeatures: '繁中功能',
    nextStep: '繁中下一步',
  });
  assert.deepEqual(demo.translations.ko, {
    name: '한국어 이름',
    summary: '한국어 요약',
    problem: '한국어 문제',
    solution: '한국어 해결',
    coreFeatures: '한국어 기능',
    nextStep: '한국어 다음 단계',
  });
  assert.deepEqual(demo.translations.en, {
    name: 'English Name',
    summary: 'English summary',
    problem: 'English problem',
    solution: 'English solution',
    coreFeatures: 'English features',
    nextStep: 'English next step',
  });
});

test('Airtable demo publication is fail-closed and DTO excludes Visibility and Notes', () => {
  const records = [
    makeDemoRecord({ 'Demo Name': 'Public Demo', Visibility: 'Public' }),
    makeDemoRecord({ 'Demo Name': 'Internal Demo', Visibility: 'Internal' }),
    makeDemoRecord({ 'Demo Name': 'Private Demo', Visibility: 'Private' }),
    makeDemoRecord({ 'Demo Name': 'Blank Demo', Visibility: '' }),
  ];

  const demos = normalizePublicAirtableDemos(records);
  assert.equal(demos.length, 1);
  assert.equal(demos[0].name, 'Public Demo');

  const serialized = JSON.stringify(demos[0]).toLowerCase();
  assert.equal(serialized.includes('visibility'), false);
  assert.equal(serialized.includes('internal notes'), false);
});

test('Airtable demo sorting keeps featured first then display order then recency then name', () => {
  const payload = createDemoResponse('airtable', null, [
    normalizeAirtableDemo(makeDemoRecord({
      'Demo Name': 'Zeta Demo',
      Featured: false,
      'Display Order': 1,
      'Updated At': '2026-06-10T00:00:00.000Z',
    })),
    normalizeAirtableDemo(makeDemoRecord({
      'Demo Name': 'Featured Demo',
      Featured: true,
      'Display Order': 99,
      'Updated At': '2026-06-01T00:00:00.000Z',
    })),
    normalizeAirtableDemo(makeDemoRecord({
      'Demo Name': 'Alpha Demo',
      Featured: false,
      'Display Order': 1,
      'Updated At': '2026-06-12T00:00:00.000Z',
    })),
    normalizeAirtableDemo(makeDemoRecord({
      'Demo Name': 'Beta Demo',
      Featured: false,
      'Display Order': 2,
      'Updated At': '2026-06-13T00:00:00.000Z',
    })),
  ]);

  assert.deepEqual(payload.items.map((item) => item.name), [
    'Featured Demo',
    'Alpha Demo',
    'Zeta Demo',
    'Beta Demo',
  ]);
});

test('missing demo translations stay empty instead of falling back to another language', () => {
  const demo = normalizeAirtableDemo(makeDemoRecord({
    'Demo Name KO': '',
    'Summary EN': '',
    'Problem KO': '',
    'Solution EN': '',
  }));

  assert.equal(demo.translations.ko.name, '');
  assert.equal(demo.translations.en.summary, '');
  assert.equal(demo.translations.ko.problem, '');
  assert.equal(demo.translations.en.solution, '');
});

test('Airtable demo fallback is empty and never impersonates module data', () => {
  const payload = createDemoFallbackResponse('upstream_failed');

  assert.equal(payload.source, 'fallback');
  assert.equal(payload.reason, 'upstream_failed');
  assert.equal(payload.count, 0);
  assert.deepEqual(payload.items, []);
  assert.deepEqual(payload.data, []);
});

test('production verifier allows techStack but blocks exact unsafe internal keys', () => {
  assert.equal(hasUnsafeInternalKey(['techStack']), false);

  for (const key of ['stack', 'rawError', 'token', 'baseId', 'tableId', 'databaseId']) {
    assert.equal(hasUnsafeInternalKey([key]), true);
  }
});
