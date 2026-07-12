import assert from 'node:assert/strict';
import test from 'node:test';
import { companionRouteConfig, createCompanionBubbleController, getCompanionRouteMessage, resolveCompanionRoute } from '../src/lib/companionRouteConfig.js';

test('all real primary routes resolve to their centralized module configuration', () => {
  const cases = [['/', '', 'home'], ['/identity/profile', '', 'identity'], ['/research/topic', '', 'research'], ['/teaching/course', '', 'teaching'], ['/knowledge-lab/resource', '', 'knowledge'], ['/projects/demo', '', 'projects'], ['/field-lab/action', '', 'action'], ['/identity/nexaeon-navigator', '', 'navigator'], ['/', '#research', 'research'], ['/unknown', '', 'fallback']];
  for (const [path, hash, key] of cases) assert.equal(resolveCompanionRoute(path, hash).key, key);
});

test('research and knowledge safely fall back from unavailable thinking to sitting smile', () => {
  for (const key of ['research', 'knowledge']) {
    assert.equal(companionRouteConfig[key].requestedState, 'thinking');
    assert.equal(companionRouteConfig[key].state, 'sitting_smile');
  }
});

test('every route has localized copy with an English fallback', () => {
  for (const config of Object.values(companionRouteConfig)) {
    for (const lang of ['zh', 'ko', 'en']) assert.ok(getCompanionRouteMessage(config, lang));
    assert.equal(getCompanionRouteMessage(config, 'xx'), config.messages.en);
  }
});

test('bubble controller deduplicates rerenders, clears old timeouts, and disposes cleanly', () => {
  let nextId = 1; const timers = new Map(); const changes = [];
  const controller = createCompanionBubbleController({ onChange: (value) => changes.push(value?.key || null), setTimeoutFn: (fn) => { const id = nextId++; timers.set(id, fn); return id; }, clearTimeoutFn: (id) => timers.delete(id) });
  assert.equal(controller.show(resolveCompanionRoute('/research/a')), true);
  assert.equal(controller.show(resolveCompanionRoute('/research/b')), false);
  assert.equal(timers.size, 1);
  assert.equal(controller.show(resolveCompanionRoute('/projects/a')), true);
  assert.equal(timers.size, 1);
  const [activeId, activeTimer] = [...timers.entries()][0];
  timers.delete(activeId);
  activeTimer();
  assert.deepEqual(changes, ['research', 'projects', null]);
  controller.dispose();
  assert.equal(timers.size, 0);
});
