import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMPANION_PREFERENCES_STORAGE_KEY,
  DEFAULT_COMPANION_PREFERENCES,
  LEGACY_COMPANION_STORAGE_KEYS,
  fromNormalizedPosition,
  getCompanionStorage,
  readCompanionPreferences,
  resetCompanionLayout,
  resetCompanionPreferences,
  resolveEffectiveMotionLevel,
  sanitizeCompanionPreferences,
  toNormalizedPosition,
  updateCompanionPreferences,
  writeCompanionPreferences,
} from '../src/lib/companionPreferences.js';
import { clampPrincessPosition, subscribePrincessViewportChanges } from '../src/lib/princessLayoutPersistence.js';

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('default Companion preferences are complete and safe', () => {
  const preferences = readCompanionPreferences(null);
  assert.deepEqual(preferences, DEFAULT_COMPANION_PREFERENCES);
  assert.equal(preferences.soundEnabled, false);
  assert.equal(preferences.motionLevel, 'full');
});

test('single versioned preference record saves and restores every setting', () => {
  const storage = createMemoryStorage();
  const preferences = {
    ...DEFAULT_COMPANION_PREFERENCES,
    visible: false,
    autoBehavior: false,
    proactiveBubbles: false,
    accessoriesEnabled: false,
    interactionEnabled: false,
    motionLevel: 'none',
    position: { x: 0.25, y: 0.75 },
    scale: 1.18,
    lastModule: 'research',
  };
  assert.equal(writeCompanionPreferences(storage, preferences, new Date('2026-07-13T00:00:00Z')), true);
  assert.deepEqual(readCompanionPreferences(storage), {
    ...preferences,
    updatedAt: '2026-07-13T00:00:00.000Z',
  });
});

test('invalid JSON and missing or hostile fields fall back without throwing', () => {
  const invalid = createMemoryStorage({ [COMPANION_PREFERENCES_STORAGE_KEY]: '{bad' });
  assert.deepEqual(readCompanionPreferences(invalid, { now: new Date('2026-07-13T00:00:00Z') }), {
    ...DEFAULT_COMPANION_PREFERENCES,
    updatedAt: null,
  });
  const sanitized = sanitizeCompanionPreferences({
    visible: 'no', scale: 999, motionLevel: 'warp', position: { x: 99, y: -99 }, lastModule: 'x'.repeat(100),
  });
  assert.equal(sanitized.visible, true);
  assert.equal(sanitized.scale, 1.32);
  assert.equal(sanitized.motionLevel, 'full');
  assert.equal(sanitized.position, null);
  assert.equal(sanitized.lastModule, null);
});

test('legacy settings, absolute position, and scale migrate once into normalized schema', () => {
  const storage = createMemoryStorage({
    [LEGACY_COMPANION_STORAGE_KEYS.settings]: JSON.stringify({ version: 1, visible: false, autoBehaviorEnabled: false, interactionEnabled: true }),
    [LEGACY_COMPANION_STORAGE_KEYS.position]: JSON.stringify({ version: 1, x: 320, y: 400 }),
    [LEGACY_COMPANION_STORAGE_KEYS.scale]: JSON.stringify({ version: 1, scale: 1.18 }),
  });
  const migrated = readCompanionPreferences(storage, { viewport: { width: 1280, height: 800 }, now: new Date('2026-07-13T00:00:00Z') });
  assert.equal(migrated.visible, false);
  assert.equal(migrated.autoBehavior, false);
  assert.deepEqual(migrated.position, { x: 0.25, y: 0.5 });
  assert.equal(migrated.scale, 1.18);
  assert.ok(storage.getItem(COMPANION_PREFERENCES_STORAGE_KEY));
  for (const key of Object.values(LEGACY_COMPANION_STORAGE_KEYS)) assert.equal(storage.getItem(key), null);
  assert.deepEqual(readCompanionPreferences(storage), {
    ...migrated,
    updatedAt: '2026-07-13T00:00:00.000Z',
  });
});

test('storage unavailable and quota failures use in-memory defaults', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.deepEqual(readCompanionPreferences(blocked), DEFAULT_COMPANION_PREFERENCES);
  assert.equal(writeCompanionPreferences(blocked, DEFAULT_COMPANION_PREFERENCES), false);
  const blockedWindow = {};
  Object.defineProperty(blockedWindow, 'localStorage', { get() { throw new Error('private'); } });
  assert.equal(getCompanionStorage(blockedWindow), null);
});

test('normalized position restores proportionally across viewport sizes', () => {
  const normalized = toNormalizedPosition({ x: 960, y: 400 }, { width: 1280, height: 800 });
  assert.deepEqual(normalized, { x: 0.75, y: 0.5 });
  assert.deepEqual(fromNormalizedPosition(normalized, { width: 390, height: 844 }), { x: 292.5, y: 422 });
  assert.equal(toNormalizedPosition({ x: Number.NaN, y: 4 }, { width: 100, height: 100 }), null);
});

test('position and scale reset preserves behavior settings while full reset does not touch unrelated keys', () => {
  const storage = createMemoryStorage({ language: 'ko', theme: 'light' });
  updateCompanionPreferences(storage, { visible: false, scale: 1.2, position: { x: 0.4, y: 0.6 } });
  const layoutReset = resetCompanionLayout(storage);
  assert.equal(layoutReset.visible, false);
  assert.equal(layoutReset.scale, 1);
  assert.equal(layoutReset.position, null);
  const fullReset = resetCompanionPreferences(storage);
  assert.equal(fullReset.visible, true);
  assert.equal(storage.getItem('language'), 'ko');
  assert.equal(storage.getItem('theme'), 'light');
});

test('motion preference respects system reduced-motion priority', () => {
  assert.equal(resolveEffectiveMotionLevel('full', false), 'full');
  assert.equal(resolveEffectiveMotionLevel('full', true), 'reduced');
  assert.equal(resolveEffectiveMotionLevel('reduced', false), 'reduced');
  assert.equal(resolveEffectiveMotionLevel('none', false), 'none');
  assert.equal(resolveEffectiveMotionLevel('none', true), 'none');
});

test('saved positions outside a smaller viewport are clamped above the settings control', () => {
  const position = clampPrincessPosition({
    position: { x: 2_000, y: 2_000 }, viewportWidth: 390, viewportHeight: 844,
    safeArea: { left: 12, right: 12, top: 72, bottom: 12 }, size: { width: 86, height: 134 },
    scale: 1.1, visualWidthMultiplier: 1.42,
  });
  assert.ok(position.x >= 12 && position.x < 378);
  assert.ok(position.y >= 72 && position.y <= 844 - 76 - 134);
});

test('viewport subscription removes resize, orientation, and visualViewport listeners', () => {
  const windowListeners = new Map();
  const viewportListeners = new Map();
  const visualViewport = {
    addEventListener: (name, callback) => viewportListeners.set(name, callback),
    removeEventListener: (name) => viewportListeners.delete(name),
  };
  const target = {
    visualViewport,
    addEventListener: (name, callback) => windowListeners.set(name, callback),
    removeEventListener: (name) => windowListeners.delete(name),
  };
  const unsubscribe = subscribePrincessViewportChanges(target, () => {});
  assert.deepEqual([...windowListeners.keys()].sort(), ['orientationchange', 'resize']);
  assert.deepEqual([...viewportListeners.keys()], ['resize']);
  unsubscribe();
  assert.equal(windowListeners.size, 0);
  assert.equal(viewportListeners.size, 0);
});
