import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrincessEventBridge, mapPrincessEvent } from '../src/lib/princessEventBridge.ts';

const nextTick = () => new Promise((resolve) => queueMicrotask(resolve));

test('module events map to the intended Princess states', () => {
  assert.equal(mapPrincessEvent({ type: 'module_enter', moduleId: 'research' })?.state, 'curious');
  assert.equal(mapPrincessEvent({ type: 'module_enter', moduleId: 'teaching' })?.state, 'happy');
  assert.equal(mapPrincessEvent({ type: 'module_enter', moduleId: 'projects' })?.state, 'wave');
});

test('same keyed event is suppressed during cooldown and allowed afterward', async () => {
  let now = 10_000;
  const requests = [];
  const bridge = createPrincessEventBridge({ now: () => now });
  bridge.subscribe((request) => { requests.push(request); return true; });
  bridge.emit({ type: 'language_change', key: 'en' });
  await nextTick();
  assert.equal(bridge.emit({ type: 'language_change', key: 'en' }), false);
  now += 6_001;
  assert.equal(bridge.emit({ type: 'language_change', key: 'en' }), true);
  await nextTick();
  assert.equal(requests.length, 2);
});

test('cooldown blocks repeated unkeyed theme events', async () => {
  let now = 10_000;
  const requests = [];
  const bridge = createPrincessEventBridge({ now: () => now });
  bridge.subscribe((request) => { requests.push(request); return true; });
  bridge.emit({ type: 'theme_change' });
  await nextTick();
  now += 1_000;
  assert.equal(bridge.emit({ type: 'theme_change' }), false);
  assert.equal(requests.length, 1);
});

test('the highest-priority event wins within the same turn', async () => {
  const requests = [];
  const bridge = createPrincessEventBridge();
  bridge.subscribe((request) => { requests.push(request); return true; });
  bridge.emit({ type: 'scroll_milestone', milestone: 'half' });
  bridge.emit({ type: 'action_error' });
  await nextTick();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].event.type, 'action_error');
});

test('unsubscribing removes the bridge listener', async () => {
  let calls = 0;
  const bridge = createPrincessEventBridge();
  const unsubscribe = bridge.subscribe(() => { calls += 1; return true; });
  unsubscribe();
  bridge.emit({ type: 'module_enter', moduleId: 'identity' });
  await nextTick();
  assert.equal(calls, 0);
});

test('Navigator lifecycle maps submitted, thinking, completed, error, and abort states', () => {
  assert.equal(mapPrincessEvent({ type: 'navigator_question_submitted', requestId: 'one' })?.state, 'curious');
  assert.equal(mapPrincessEvent({ type: 'navigator_response_started', requestId: 'one' })?.state, 'sit');
  assert.equal(mapPrincessEvent({ type: 'navigator_response_completed', requestId: 'one' })?.state, 'happy');
  assert.equal(mapPrincessEvent({ type: 'navigator_response_error', requestId: 'one', errorType: 'network' })?.state, 'quiet');
  assert.equal(mapPrincessEvent({ type: 'navigator_response_aborted', requestId: 'one' })?.state, 'idle');
});

test('Navigator submission and completion are accepted only once per request', async () => {
  const requests = [];
  const bridge = createPrincessEventBridge();
  bridge.subscribe((request) => { requests.push(request); return true; });

  assert.equal(bridge.emit({ type: 'navigator_question_submitted', requestId: 'one' }), true);
  assert.equal(bridge.emit({ type: 'navigator_question_submitted', requestId: 'one' }), false);
  await nextTick();
  assert.equal(bridge.emit({ type: 'navigator_response_completed', requestId: 'one' }), true);
  assert.equal(bridge.emit({ type: 'navigator_response_completed', requestId: 'one' }), false);
  await nextTick();

  assert.deepEqual(requests.map(({ event }) => event.type), [
    'navigator_question_submitted',
    'navigator_response_completed',
  ]);
});

test('stale Navigator callbacks cannot replace a newer active request', async () => {
  const requests = [];
  const bridge = createPrincessEventBridge();
  bridge.subscribe((request) => { requests.push(request); return true; });

  bridge.emit({ type: 'navigator_question_submitted', requestId: 'old' });
  await nextTick();
  bridge.emit({ type: 'navigator_question_submitted', requestId: 'new' });
  await nextTick();
  assert.equal(bridge.emit({ type: 'navigator_response_completed', requestId: 'old' }), false);
  assert.equal(bridge.emit({ type: 'navigator_response_error', requestId: 'old', errorType: 'network' }), false);
  assert.equal(bridge.emit({ type: 'navigator_response_started', requestId: 'new' }), true);
  await nextTick();

  assert.equal(requests.at(-1).event.requestId, 'new');
  assert.equal(requests.at(-1).event.type, 'navigator_response_started');
});

test('aborted Navigator requests cannot later complete or error', async () => {
  const requests = [];
  const bridge = createPrincessEventBridge();
  bridge.subscribe((request) => { requests.push(request); return true; });
  bridge.emit({ type: 'navigator_question_submitted', requestId: 'one' });
  await nextTick();
  assert.equal(bridge.emit({ type: 'navigator_response_aborted', requestId: 'one' }), true);
  await nextTick();
  assert.equal(bridge.emit({ type: 'navigator_response_completed', requestId: 'one' }), false);
  assert.equal(bridge.emit({ type: 'navigator_response_error', requestId: 'one', errorType: 'api' }), false);
  assert.equal(requests.at(-1).event.type, 'navigator_response_aborted');
});

test('Navigator navigation suppresses the duplicate route reaction during the deduplication window', async () => {
  let now = 1_000;
  const requests = [];
  const bridge = createPrincessEventBridge({ now: () => now });
  bridge.subscribe((request) => { requests.push(request); return true; });
  bridge.emit({ type: 'navigator_question_submitted', requestId: 'one' });
  await nextTick();
  bridge.emit({ type: 'navigator_response_completed', requestId: 'one' });
  await nextTick();
  assert.equal(bridge.emit({ type: 'navigator_navigation_completed', requestId: 'one', targetRoute: '/research/example' }), true);
  assert.equal(bridge.emit({ type: 'module_enter', moduleId: 'research', key: 'research:example' }), false);
  await nextTick();
  now += 1_501;
  assert.equal(bridge.emit({ type: 'module_enter', moduleId: 'research', key: 'research:example' }), true);
});
