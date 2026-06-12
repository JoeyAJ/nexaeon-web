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
import { normalizeAirtableProject } from '../api/action/projects.js';
import { normalizeAirtableContext } from '../api/collaboration/options.js';
import { normalizeAirtableDemo } from '../api/modules/demos.js';
import { collectPaginatedNotionResults } from '../lib/notion.js';
import { isPublicAirtableVisibility, isPublishedNotionPage } from '../lib/publicFilters.js';

const FIXED_UPDATED_AT = '2026-06-12T05:40:00.000Z';

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

  for (const key of ['source', 'reason', 'count', 'updatedAt', 'items', 'data']) {
    assert.ok(Object.hasOwn(payload, key));
  }

  assert.equal(payload.reason, null);
  assert.equal(payload.count, items.length);
  assert.deepEqual(payload.items, payload.data);
  assert.equal(payload.updatedAt, FIXED_UPDATED_AT);
});

test('reason is restricted to safe enum values', () => {
  const payload = createApiResponse({ source: 'fallback', reason: 'raw sdk failure', items: [] });
  assert.equal(payload.reason, 'upstream_failed');
});

test('Notion public status is exact and fail-closed', () => {
  assert.equal(isPublishedNotionPage(makeStatusPage('Published'), ['公開狀態']), true);

  for (const value of ['Draft', 'Hidden', '', 'published', 'PUBLISHED', 'Other']) {
    assert.equal(isPublishedNotionPage(makeStatusPage(value), ['公開狀態']), false);
  }

  assert.equal(isPublishedNotionPage({ properties: {} }, ['公開狀態']), false);
  assert.equal(isPublishedNotionPage(makeStatusPage('Published', 'Status'), ['公開狀態']), false);
});

test('Airtable visibility is exact Public only', () => {
  assert.equal(isPublicAirtableVisibility('Public'), true);
  assert.equal(isPublicAirtableVisibility({ name: 'Public' }), true);

  for (const value of ['Private', 'Internal', 'Draft', 'Hidden', '', 'public', 'PUBLIC', undefined]) {
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
