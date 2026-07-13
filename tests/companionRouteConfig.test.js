import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMPANION_MODULE_BUBBLE_SEEN_KEY,
  companionAccessorySuitabilityRules,
  companionImageSuitabilityRules,
  companionInteractionFallbackRules,
  accessoryAnchorsByPose,
  companionModuleProfiles,
  createCompanionBubbleController,
  getCompanionBubblePosition,
  getAccessoryAnchor,
  getCompanionDisplayedAsset,
  getCompanionInteractionVariant,
  getCompanionLocaleChangedGreeting,
  getCompanionRouteMessage,
  resolveCompanionRoute,
  shouldShowCompanionAccessory,
} from '../src/lib/companionRouteConfig.js';

function createStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('real primary and child routes resolve to one centralized module profile', () => {
  const cases = [['/', '', 'home'], ['/identity/profile', '', 'identity'], ['/research/topic', '', 'research'], ['/teaching/course', '', 'coaching'], ['/knowledge-lab/resource', '', 'knowledge'], ['/projects/demo', '', 'prototype'], ['/field-lab/action', '', 'action'], ['/identity/nexaeon-navigator', '', 'navigator'], ['/', '#research', 'research'], ['/unknown', '', 'fallback']];
  for (const [path, hash, key] of cases) assert.equal(resolveCompanionRoute(path, hash).moduleKey, key);
});

test('module image profiles favor natural semantic matches over accessory coverage', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(companionModuleProfiles).map(([key, value]) => [key, [value.emotion, value.accessory]])), {
    home: ['calm', 'none'], identity: ['attentive', 'none'], research: ['curious', 'none'], coaching: ['happy', 'academic-cap'], knowledge: ['attentive', 'none'], prototype: ['curious', 'none'], action: ['attentive', 'none'], navigator: ['attentive', 'none'], fallback: ['calm', 'none'],
  });
  assert.deepEqual(Object.keys(accessoryAnchorsByPose).sort(), ['academic-cap', 'round-glasses']);
  assert.equal(Object.keys(companionImageSuitabilityRules).length, 8);
  assert.deepEqual(companionAccessorySuitabilityRules['round-glasses'].modules, []);
  assert.equal(companionInteractionFallbackRules.imageStrategy, 'preserve-module-base-image');
});

test('accessories use module-specific fixed anchors', () => {
  assert.equal(getAccessoryAnchor('round-glasses', 'identity', 1440), null);
  assert.equal(getAccessoryAnchor('round-glasses', 'home', 1440), null);
  assert.ok(getAccessoryAnchor('academic-cap', 'coaching', 1440));
});

test('all eight contexts have a distinct fixed transparent pose asset', () => {
  const assets = ['home', 'identity', 'research', 'coaching', 'knowledge', 'prototype', 'action', 'navigator'].map((key) => companionModuleProfiles[key].asset);
  assert.equal(new Set(assets).size, 8);
  assert.ok(assets.every((asset) => asset.endsWith('.png')));
});

test('every module preserves its fixed image throughout interaction and inactivity', () => {
  for (const key of ['home', 'identity', 'research', 'coaching', 'knowledge', 'prototype', 'action', 'navigator']) {
    const profile = companionModuleProfiles[key];
    assert.equal(getCompanionDisplayedAsset(profile, '/legacy-sleep.png', 'sleeping_prone', 'inactivity'), profile.asset);
    assert.equal(getCompanionDisplayedAsset(profile, '/interaction.png', 'happy', 'interaction'), profile.baseImage);
    assert.equal(getCompanionDisplayedAsset(profile, '/base.png', profile.pose, 'context'), profile.asset);
    assert.ok(profile.allowedInteractionVariants.includes(getCompanionInteractionVariant(profile, 'happy')));
  }
});

test('accessory visibility follows image suitability and hides only for unsafe low-energy states', () => {
  const coaching = companionModuleProfiles.coaching;
  assert.equal(shouldShowCompanionAccessory(coaching, { petState: 'sitting_smile' }), true);
  assert.equal(shouldShowCompanionAccessory(coaching, { petState: 'wave' }), true);
  assert.equal(shouldShowCompanionAccessory(coaching, { petState: 'sleep' }), false);
  assert.equal(shouldShowCompanionAccessory(companionModuleProfiles.research, { petState: 'standing_attentive' }), false);
  assert.equal(shouldShowCompanionAccessory(coaching, { petState: 'sitting_smile', accessoriesEnabled: false }), false);
});

test('every bubble has exact localized copy and English fallback', () => {
  for (const profile of Object.values(companionModuleProfiles).filter((item) => item.bubbleKey)) {
    for (const lang of ['zh', 'ko', 'en']) assert.ok(getCompanionRouteMessage(profile, lang));
    assert.equal(getCompanionRouteMessage(profile, 'xx'), profile.messages.en);
  }
});

test('locale change greeting has exact copy in all supported translations', () => {
  assert.equal(getCompanionLocaleChangedGreeting('zh'), '語言已切換，我會繼續陪你探索 NexAeon。');
  assert.equal(getCompanionLocaleChangedGreeting('ko'), '언어가 변경되었어요. 계속 함께 NexAeon을 탐험해 볼게요.');
  assert.equal(getCompanionLocaleChangedGreeting('en'), 'The language has changed. I’ll continue exploring NexAeon with you.');
  assert.equal(getCompanionLocaleChangedGreeting('unsupported'), getCompanionLocaleChangedGreeting('en'));
});

test('every fixed image has a pose-specific depth profile', () => {
  const profiles = Object.values(companionModuleProfiles);
  assert.ok(profiles.every((item) => ['ground', 'soft-float', 'none'].includes(item.visualProfile.shadowType)));
  assert.equal(companionModuleProfiles.identity.visualProfile.shadowType, 'soft-float');
  assert.equal(companionModuleProfiles.research.visualProfile.shadowType, 'soft-float');
  for (const key of ['home', 'coaching', 'knowledge', 'prototype', 'action', 'navigator']) {
    assert.equal(companionModuleProfiles[key].visualProfile.shadowType, 'ground');
  }
  assert.notDeepEqual(companionModuleProfiles.action.visualProfile.shadowScale, companionModuleProfiles.knowledge.visualProfile.shadowScale);
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
