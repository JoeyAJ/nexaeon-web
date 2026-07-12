import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRINCESS_CONTEXT_PROFILES,
  correctContextPositionOnce,
  getContextPreferredPosition,
  getPrincessContextProfile,
  resolvePrincessContext,
  selectContextIdleAnimation,
} from '../src/lib/princessContextResolver.js';

const resolve = (pathname, options = {}) => resolvePrincessContext({ pathname, ...options });

test('stable routes resolve to all supported Princess contexts', () => {
  assert.equal(resolve('/').id, 'home');
  assert.equal(resolve('/identity/about').id, 'identity');
  assert.equal(resolve('/research/literature').id, 'research');
  assert.equal(resolve('/teaching/curriculum').id, 'coaching');
  assert.equal(resolve('/knowledge-lab/knowledge-resources').id, 'knowledge');
  assert.equal(resolve('/projects/module-demos').id, 'prototype');
  assert.equal(resolve('/field-lab/action-projects').id, 'action');
  assert.equal(resolve('/identity/nexaeon-navigator').id, 'navigator');
  assert.equal(resolve('/unknown/path').id, 'generic');
});

test('research subpages retain the same context id without display-text inspection', () => {
  const first = resolve('/research/page-a');
  const second = resolve('/research/page-b');
  assert.equal(first.id, second.id);
  assert.equal(first.id, 'research');
});

test('locale and viewport metadata never change the route context id', () => {
  const zh = resolve('/research/page-a', { locale: 'zh', viewportCategory: 'desktop' });
  const ko = resolve('/research/page-a', { locale: 'ko', viewportCategory: 'mobile' });
  const en = resolve('/research/page-a', { locale: 'en', viewportCategory: 'desktop' });
  assert.deepEqual([zh.id, ko.id, en.id], ['research', 'research', 'research']);
});

test('resolver is pure and SSR-safe when no browser globals or pathname are supplied', () => {
  assert.doesNotThrow(() => resolvePrincessContext());
  assert.equal(resolvePrincessContext().id, 'home');
});

test('every context profile exposes compact policy fields and known anchors', () => {
  for (const [id, profile] of Object.entries(PRINCESS_CONTEXT_PROFILES)) {
    assert.equal(profile.id, id);
    assert.ok(profile.preferredPersistentStates.length > 0);
    assert.ok(profile.idleAnimationPool.length > 0);
    assert.ok(['bottomLeft', 'bottomRight'].includes(profile.preferredAnchor));
    assert.ok(profile.reactionCooldownMultiplier > 0);
    assert.equal(typeof profile.allowAutoSleep, 'boolean');
  }
});

test('unknown context profiles use conservative generic defaults', () => {
  assert.equal(getPrincessContextProfile('missing'), PRINCESS_CONTEXT_PROFILES.generic);
});

test('invalid animation keys safely fall back to idle', () => {
  assert.equal(selectContextIdleAnimation({ idleAnimationPool: ['invalid'] }, 'activeIdle'), 'idle');
  assert.equal(selectContextIdleAnimation({ idleAnimationPool: ['invalid', 'sit'] }, 'calmIdle'), 'sit');
  assert.equal(selectContextIdleAnimation(PRINCESS_CONTEXT_PROFILES.home, 'calmIdle'), 'sitting_smile');
  assert.equal(selectContextIdleAnimation(PRINCESS_CONTEXT_PROFILES.research, 'resting'), 'rest');
  assert.equal(selectContextIdleAnimation(PRINCESS_CONTEXT_PROFILES.knowledge, 'sleeping'), 'sleeping_prone');
});

test('saved drag position wins over a context preferred anchor', () => {
  const savedPosition = { x: 120, y: 240 };
  const result = getContextPreferredPosition({
    preferredAnchor: 'bottomLeft',
    viewport: { width: 1200, height: 800 },
    size: { width: 100, height: 150 },
    safeArea: { left: 12, right: 12, top: 72, bottom: 12 },
    savedPosition,
  });
  assert.equal(result.position, savedPosition);
  assert.equal(result.source, 'saved');
});

test('Navigator uses a left safe anchor only when there is no saved position', () => {
  const result = getContextPreferredPosition({
    preferredAnchor: PRINCESS_CONTEXT_PROFILES.navigator.preferredAnchor,
    viewport: { width: 1200, height: 800 },
    size: { width: 100, height: 150 },
    safeArea: { left: 12, right: 12, top: 72, bottom: 12 },
  });
  assert.deepEqual(result.position, { x: 12, y: 638 });
  assert.equal(result.source, 'context_anchor');
});

test('out-of-viewport context position is corrected once', () => {
  const input = {
    position: { x: 2_000, y: 2_000 },
    viewport: { width: 390, height: 844 },
    size: { width: 90, height: 140 },
    safeArea: { left: 12, right: 12, top: 72, bottom: 96 },
  };
  const first = correctContextPositionOnce(input);
  assert.equal(first.corrected, true);
  const second = correctContextPositionOnce({ ...input, position: first.position, alreadyCorrected: true });
  assert.equal(second.corrected, false);
  assert.equal(second.position, first.position);
});
