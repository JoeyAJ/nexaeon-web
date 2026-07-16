import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrincessEventBridge, mapPrincessEvent } from '../src/lib/princessEventBridge.ts';
import { createPrincessModuleActivityAdapter } from '../src/lib/princessModuleActivity.ts';

const nextTick = () => new Promise((resolve) => queueMicrotask(resolve));
const activity = (overrides = {}) => ({
  activityId: 'activity-1', contextId: 'research', actionType: 'search-submitted',
  source: 'user', timestamp: 1_000, ...overrides,
});

test('context policies map module activities to existing low-disruption states', () => {
  assert.equal(mapPrincessEvent({ type: 'module_activity', activity: activity() })?.state, 'curious');
  assert.equal(mapPrincessEvent({ type: 'module_activity', activity: activity({ contextId: 'knowledge', actionType: 'resource-opened' }) })?.state, 'sit');
  assert.equal(mapPrincessEvent({ type: 'module_activity', activity: activity({ contextId: 'coaching', actionType: 'course-opened' }) })?.state, 'curious');
  assert.equal(mapPrincessEvent({ type: 'module_activity', activity: activity({ contextId: 'prototype', actionType: 'demo-opened' }) })?.state, 'happy');
  assert.equal(mapPrincessEvent({ type: 'module_activity', activity: activity({ contextId: 'action', actionType: 'project-opened' }) })?.state, 'curious');
  assert.equal(mapPrincessEvent({ type: 'module_activity', activity: activity({ contextId: 'identity', actionType: 'item-opened' }) })?.state, 'sit');
  assert.equal(mapPrincessEvent({ type: 'module_activity', activity: activity({ actionType: 'meaningful-action-completed' }) })?.state, 'happy');
  assert.equal(mapPrincessEvent({ type: 'module_activity', activity: activity({ actionType: 'action-error' }) })?.state, 'quiet');
});

test('only explicitly meaningful module activities can wake sleeping Princess', () => {
  assert.equal(mapPrincessEvent({ type: 'module_activity', activity: activity({ actionType: 'filter-applied' }) })?.canWakeSleeping, false);
  assert.equal(mapPrincessEvent({ type: 'module_activity', activity: activity({ actionType: 'meaningful-action-completed' }) })?.canWakeSleeping, true);
  assert.equal(mapPrincessEvent({ type: 'module_activity', activity: activity({ contextId: 'navigator', actionType: 'navigation-arrived' }) })?.canWakeSleeping, true);
});

test('activityId prevents duplicate callbacks and per-action dedup cooldown expires', async () => {
  let now = 1_000;
  const requests = [];
  const bridge = createPrincessEventBridge({ now: () => now });
  bridge.subscribe((request) => { requests.push(request); return true; });
  assert.equal(bridge.emit({ type: 'module_activity', activity: activity() }), true);
  assert.equal(bridge.emit({ type: 'module_activity', activity: activity() }), false);
  await nextTick();
  now += 3_001;
  assert.equal(bridge.emit({ type: 'module_activity', activity: activity({ activityId: 'activity-2' }) }), true);
  await nextTick();
  assert.equal(requests.length, 2);
});

test('per-context cooldown suppresses a rapid different action', async () => {
  let now = 1_000;
  const bridge = createPrincessEventBridge({ now: () => now });
  bridge.subscribe(() => true);
  bridge.emit({ type: 'module_activity', activity: activity() });
  await nextTick();
  now += 500;
  assert.equal(bridge.emit({ type: 'module_activity', activity: activity({ activityId: 'other', actionType: 'item-opened' }) }), false);
});

test('burst protection limits rapid activity even when errors bypass context cooldown', async () => {
  let now = 1_000;
  const bridge = createPrincessEventBridge({ now: () => now });
  bridge.subscribe(() => true);
  for (let index = 0; index < 3; index += 1) {
    assert.equal(bridge.emit({ type: 'module_activity', activity: activity({ activityId: `error-${index}`, actionType: 'action-error', entityType: `${index}` }) }), true);
    await nextTick();
  }
  assert.equal(bridge.emit({ type: 'module_activity', activity: activity({ activityId: 'error-4', actionType: 'action-error', entityType: '4' }) }), false);
});

test('Navigator lifecycle priority wins over navigation-arrived in the same turn', async () => {
  const requests = [];
  const bridge = createPrincessEventBridge();
  bridge.subscribe((request) => { requests.push(request); return true; });
  bridge.emit({ type: 'navigator_question_submitted', requestId: 'nav-1' });
  await nextTick();
  bridge.emit({ type: 'navigator_response_completed', requestId: 'nav-1' });
  await nextTick();
  bridge.emit({ type: 'navigator_navigation_completed', requestId: 'nav-1' });
  bridge.emit({ type: 'module_activity', activity: activity({ activityId: 'arrived', contextId: 'navigator', actionType: 'navigation-arrived', source: 'navigator' }) });
  await nextTick();
  assert.equal(requests.at(-1).event.type, 'navigator_navigation_completed');
});

test('adapter emits a minimal payload without user content or raw errors', async () => {
  const requests = [];
  const bridge = createPrincessEventBridge();
  bridge.subscribe((request) => { requests.push(request); return true; });
  const adapter = createPrincessModuleActivityAdapter(bridge, 'research', () => 2_000);
  adapter.dispatch('action-error', { entityType: 'literature card / secret title', errorCategory: 'raw server message' });
  await nextTick();
  const payload = requests[0].event.activity;
  assert.deepEqual(Object.keys(payload).sort(), ['actionType', 'activityId', 'contextId', 'entityType', 'errorCategory', 'source', 'timestamp']);
  assert.equal(payload.errorCategory, 'unknown');
  assert.equal(JSON.stringify(payload).includes('server message'), false);
  assert.equal(JSON.stringify(payload).includes('secret title'), false);
});

test('search adapter distinguishes successful and empty results without treating empty as an error', async () => {
  const requests = [];
  const bridge = createPrincessEventBridge();
  bridge.subscribe((request) => { requests.push(request); return true; });
  const adapter = createPrincessModuleActivityAdapter(bridge, 'research', () => 2_000);
  adapter.search(0, { entityType: 'literature', key: 'research-empty' });
  await nextTick();
  assert.deepEqual(requests.map(({ event }) => event.type), ['search_start', 'search_empty']);
  assert.equal(requests.some(({ event }) => event.type === 'data_error'), false);
});

test('development debug is opt-in and production mode emits no console output', async () => {
  let calls = 0;
  const original = console.debug;
  console.debug = () => { calls += 1; };
  try {
    const bridge = createPrincessEventBridge({ debug: false });
    bridge.subscribe(() => true);
    bridge.emit({ type: 'module_activity', activity: activity() });
    await nextTick();
    assert.equal(calls, 0);
  } finally {
    console.debug = original;
  }
});
