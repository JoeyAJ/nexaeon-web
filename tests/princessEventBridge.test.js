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
