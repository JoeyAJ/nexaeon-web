import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMPANION_MODULE_BUBBLE_SEEN_KEY,
  accessoryAnchorsByPose,
  companionModuleProfiles,
  createCompanionBubbleController,
  getCompanionBubblePosition,
  getAccessoryAnchor,
  getCompanionRouteMessage,
  resolveCompanionRoute,
} from '../src/lib/companionRouteConfig.js';

function createStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('real primary and child routes resolve to one centralized module profile', () => {
  const cases = [['/', '', 'home'], ['/identity/profile', '', 'identity'], ['/research/topic', '', 'research'], ['/teaching/course', '', 'coaching'], ['/knowledge-lab/resource', '', 'knowledge'], ['/projects/demo', '', 'prototype'], ['/field-lab/action', '', 'action'], ['/identity/nexaeon-navigator', '', 'navigator'], ['/', '#research', 'research'], ['/unknown', '', 'fallback']];
  for (const [path, hash, key] of cases) assert.equal(resolveCompanionRoute(path, hash).moduleKey, key);
});

test('Sprint 2-E emotion and accessory mapping stays within the requested scope', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(companionModuleProfiles).map(([key, value]) => [key, [value.emotion, value.accessory]])), {
    home: ['calm', 'none'], identity: ['attentive', 'round-glasses'], research: ['curious', 'round-glasses'], coaching: ['happy', 'academic-cap'], knowledge: ['attentive', 'round-glasses'], prototype: ['curious', 'none'], action: ['attentive', 'none'], navigator: ['attentive', 'round-glasses'], fallback: ['calm', 'none'],
  });
  assert.deepEqual(Object.keys(accessoryAnchorsByPose).sort(), ['academic-cap', 'round-glasses']);
});

test('accessories use module-specific fixed anchors', () => {
  const standingDesktop = getAccessoryAnchor('round-glasses', 'identity', 1440);
  const standingMobile = getAccessoryAnchor('round-glasses', 'identity', 390);
  assert.ok(standingDesktop.top > 0);
  assert.ok(standingMobile.width < standingDesktop.width);
  assert.equal(getAccessoryAnchor('round-glasses', 'home', 1440), null);
  assert.ok(getAccessoryAnchor('academic-cap', 'coaching', 1440));
});

test('all eight contexts have a distinct fixed transparent pose asset', () => {
  const assets = ['home', 'identity', 'research', 'coaching', 'knowledge', 'prototype', 'action', 'navigator'].map((key) => companionModuleProfiles[key].asset);
  assert.equal(new Set(assets).size, 8);
  assert.ok(assets.every((asset) => asset.endsWith('.png')));
});

test('every bubble has exact localized copy and English fallback', () => {
  for (const profile of Object.values(companionModuleProfiles).filter((item) => item.bubbleKey)) {
    for (const lang of ['zh', 'ko', 'en']) assert.ok(getCompanionRouteMessage(profile, lang));
    assert.equal(getCompanionRouteMessage(profile, 'xx'), profile.messages.en);
  }
});

test('bubble controller delays, persists once per session, auto-hides, and disposes', () => {
  let nextId = 1; const timers = new Map(); const changes = []; const storage = createStorage();
  const controller = createCompanionBubbleController({ storage, delay: 900, onChange: (value) => changes.push(value?.moduleKey || null), setTimeoutFn: (fn) => { const id = nextId++; timers.set(id, fn); return id; }, clearTimeoutFn: (id) => timers.delete(id) });
  const research = resolveCompanionRoute('/research/a');
  assert.equal(controller.show(research), true);
  assert.equal(controller.show(resolveCompanionRoute('/research/b')), false);
  assert.deepEqual(JSON.parse(storage.getItem(COMPANION_MODULE_BUBBLE_SEEN_KEY)), ['research']);
  const show = [...timers.entries()][0]; timers.delete(show[0]); show[1]();
  assert.deepEqual(changes, ['research']);
  const hide = [...timers.entries()][0]; timers.delete(hide[0]); hide[1]();
  assert.deepEqual(changes, ['research', null]);
  assert.equal(controller.show(research), false);
  controller.dispose();
  assert.equal(timers.size, 0);
});

test('bubble positioning stays within viewport and changes side when space is constrained', () => {
  const bubbleRect = { width: 250, height: 80 };
  const result = getCompanionBubblePosition({ petRect: { left: 270, right: 350, top: 20, width: 80, height: 130 }, bubbleRect, viewportWidth: 375, viewportHeight: 667 });
  assert.ok(result.left >= 16);
  assert.ok(result.left + result.width <= 359);
  assert.ok(result.top >= 16);
  assert.match(result.placement, /left/);
});
