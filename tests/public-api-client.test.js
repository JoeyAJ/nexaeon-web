import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyPublicApiError,
  createTimeoutError,
  derivePublicResourceStatus,
  isValidPublicApiReason,
  isValidPublicApiSource,
  normalizePublicApiPayload,
  PUBLIC_RESOURCE_STATUS,
} from '../src/lib/publicApiClient.js';
import {
  resolvePublicApiNextState,
  shouldApplyPublicApiResponse,
  shouldIgnorePublicApiError,
} from '../src/hooks/usePublicApiResource.js';

function successPayload(overrides = {}) {
  return {
    source: 'notion',
    reason: null,
    count: 1,
    updatedAt: null,
    items: [{ id: 'one' }],
    data: [{ id: 'one' }],
    ...overrides,
  };
}

test('legal success payload with data becomes success', () => {
  const normalized = normalizePublicApiPayload(successPayload());
  assert.equal(normalized.ok, true);
  assert.equal(normalized.status, PUBLIC_RESOURCE_STATUS.SUCCESS);
  assert.equal(derivePublicResourceStatus(normalized.payload), PUBLIC_RESOURCE_STATUS.SUCCESS);
});

test('legal healthy success with zero items becomes empty', () => {
  const normalized = normalizePublicApiPayload(successPayload({ count: 0, items: [], data: [] }));
  assert.equal(normalized.ok, true);
  assert.equal(normalized.status, PUBLIC_RESOURCE_STATUS.EMPTY);
});

test('fallback payload becomes fallback', () => {
  const normalized = normalizePublicApiPayload(successPayload({
    source: 'fallback',
    reason: 'upstream_failed',
  }));
  assert.equal(normalized.ok, true);
  assert.equal(normalized.status, PUBLIC_RESOURCE_STATUS.FALLBACK);
});

test('partial source failure becomes partial', () => {
  const normalized = normalizePublicApiPayload(successPayload({
    source: 'notion',
    reason: 'partial_source_failure',
  }));
  assert.equal(normalized.ok, true);
  assert.equal(normalized.status, PUBLIC_RESOURCE_STATUS.PARTIAL);
});

test('invalid source is rejected', () => {
  assert.equal(isValidPublicApiSource('private'), false);
  assert.equal(normalizePublicApiPayload(successPayload({ source: 'private' })).ok, false);
});

test('invalid reason is rejected', () => {
  assert.equal(isValidPublicApiReason('client_fetch_failed'), false);
  assert.equal(normalizePublicApiPayload(successPayload({ reason: 'client_fetch_failed' })).ok, false);
});

test('items are preferred over data', () => {
  const normalized = normalizePublicApiPayload(successPayload({
    count: 2,
    items: [{ id: 'items-wins' }],
    data: [{ id: 'data-loses' }],
  }));
  assert.equal(normalized.ok, true);
  assert.deepEqual(normalized.items, [{ id: 'items-wins' }]);
  assert.equal(normalized.payload.count, 1);
});

test('data is accepted when items are absent', () => {
  const payload = successPayload({ data: [{ id: 'data-only' }] });
  delete payload.items;
  const normalized = normalizePublicApiPayload(payload);
  assert.equal(normalized.ok, true);
  assert.deepEqual(normalized.items, [{ id: 'data-only' }]);
});

test('count mismatch does not crash or control display count', () => {
  const normalized = normalizePublicApiPayload(successPayload({ count: 99, items: [{ id: 'one' }] }));
  assert.equal(normalized.ok, true);
  assert.equal(normalized.payload.count, 1);
});

test('updatedAt null is legal', () => {
  const normalized = normalizePublicApiPayload(successPayload({ updatedAt: null }));
  assert.equal(normalized.ok, true);
});

test('abort by unmount is ignored instead of becoming error UI', () => {
  const abortError = new DOMException('Component unmounted', 'AbortError');
  assert.equal(classifyPublicApiError(abortError), 'aborted');
  assert.equal(shouldIgnorePublicApiError('aborted'), true);
});

test('timeout classification is safe and distinct', () => {
  assert.equal(classifyPublicApiError(createTimeoutError()), 'client_timeout');
});

test('stale request cannot overwrite the active request', () => {
  assert.equal(shouldApplyPublicApiResponse(2, 1, false), false);
  assert.equal(shouldApplyPublicApiResponse(2, 2, true), false);
  assert.equal(shouldApplyPublicApiResponse(2, 2, false), true);
});

test('retry with previous data enters refreshing instead of clearing cards', () => {
  const current = {
    payload: successPayload(),
    items: [{ id: 'one' }],
    status: PUBLIC_RESOURCE_STATUS.SUCCESS,
    errorType: null,
    isLoading: false,
    isRefreshing: false,
    retryCount: 0,
  };
  const retrying = resolvePublicApiNextState(current, { type: 'retry' });
  const refreshing = resolvePublicApiNextState(retrying, { type: 'start' });
  assert.equal(retrying.retryCount, 1);
  assert.equal(refreshing.isRefreshing, true);
  assert.equal(refreshing.isLoading, false);
  assert.deepEqual(refreshing.items, [{ id: 'one' }]);
});

test('client error does not introduce client reason into server contract fields', () => {
  const next = resolvePublicApiNextState({
    payload: null,
    items: [],
    status: PUBLIC_RESOURCE_STATUS.LOADING,
    errorType: null,
    isLoading: true,
    isRefreshing: false,
    retryCount: 0,
  }, {
    type: 'error',
    errorType: 'invalid_contract',
  });

  assert.equal(next.status, PUBLIC_RESOURCE_STATUS.ERROR);
  assert.equal(next.errorType, 'invalid_contract');
  assert.equal(next.payload, null);
});

test('healthy empty data does not trigger fallback', () => {
  const normalized = normalizePublicApiPayload(successPayload({
    source: 'airtable',
    reason: null,
    count: 0,
    items: [],
    data: [],
  }));
  assert.equal(normalized.ok, true);
  assert.equal(normalized.status, PUBLIC_RESOURCE_STATUS.EMPTY);
  assert.notEqual(normalized.status, PUBLIC_RESOURCE_STATUS.FALLBACK);
});
