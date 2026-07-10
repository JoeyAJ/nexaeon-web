import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PRINCESS_SETTINGS,
  PRINCESS_LAYOUT_STORAGE_VERSION,
  PRINCESS_POSITION_STORAGE_KEY,
  PRINCESS_SCALE_STORAGE_KEY,
  PRINCESS_SETTINGS_STORAGE_KEY,
  clampPrincessPosition,
  getPrincessStorage,
  parseStoredPrincessPosition,
  parseStoredPrincessScale,
  parseStoredPrincessSettings,
  readPrincessPosition,
  readPrincessSettings,
  subscribePrincessViewportChanges,
  writePrincessPosition,
  writePrincessScale,
  writePrincessSettings,
} from '../src/lib/princessLayoutPersistence.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('drag-end position and scale writes use versioned storage records', () => {
  const storage = createMemoryStorage();
  const updatedAt = 123_456;

  assert.equal(writePrincessPosition(storage, { x: 120, y: 340 }, updatedAt), true);
  assert.equal(writePrincessScale(storage, 1.18, updatedAt), true);
  assert.deepEqual(JSON.parse(storage.getItem(PRINCESS_POSITION_STORAGE_KEY)), {
    version: PRINCESS_LAYOUT_STORAGE_VERSION,
    x: 120,
    y: 340,
    updatedAt,
  });
  assert.deepEqual(JSON.parse(storage.getItem(PRINCESS_SCALE_STORAGE_KEY)), {
    version: PRINCESS_LAYOUT_STORAGE_VERSION,
    scale: 1.18,
    updatedAt,
  });
});

test('versioned and legacy Princess layout records both restore safely', () => {
  assert.deepEqual(parseStoredPrincessPosition('{"version":1,"x":32,"y":64,"updatedAt":10}'), { x: 32, y: 64 });
  assert.deepEqual(parseStoredPrincessPosition('{"x":12,"y":24}'), { x: 12, y: 24 });
  assert.equal(parseStoredPrincessScale('{"version":1,"scale":1.1,"updatedAt":10}'), 1.1);
  assert.equal(parseStoredPrincessScale('{"scale":0.82}'), 0.82);
  assert.equal(parseStoredPrincessPosition('{"version":2,"x":12,"y":24}'), null);
});

test('Princess control settings use one versioned record and restore safely', () => {
  const storage = createMemoryStorage();
  const settings = {
    visible: false,
    autoBehaviorEnabled: false,
    interactionEnabled: true,
  };

  assert.equal(writePrincessSettings(storage, settings, 789), true);
  assert.deepEqual(JSON.parse(storage.getItem(PRINCESS_SETTINGS_STORAGE_KEY)), {
    version: PRINCESS_LAYOUT_STORAGE_VERSION,
    ...settings,
    updatedAt: 789,
  });
  assert.deepEqual(readPrincessSettings(storage), settings);
});

test('invalid or future Princess settings fall back to safe visible defaults', () => {
  assert.deepEqual(parseStoredPrincessSettings('not json'), DEFAULT_PRINCESS_SETTINGS);
  assert.deepEqual(
    parseStoredPrincessSettings('{"version":2,"visible":false}'),
    DEFAULT_PRINCESS_SETTINGS,
  );
  assert.deepEqual(parseStoredPrincessSettings('{"version":1,"visible":false}'), {
    visible: false,
    autoBehaviorEnabled: true,
    interactionEnabled: true,
  });
});

test('saved positions outside a smaller viewport are clamped into the safe area', () => {
  const position = clampPrincessPosition({
    position: { x: 2_000, y: 2_000 },
    viewportWidth: 390,
    viewportHeight: 844,
    safeArea: { left: 12, right: 12, top: 72, bottom: 96 },
    size: { width: 86, height: 134 },
    scale: 1.1,
    visualWidthMultiplier: 1.42,
  });

  assert.ok(position.x >= 12 && position.x < 390 - 12);
  assert.ok(position.y >= 72 && position.y <= 844 - 96 - 134);
});

test('localStorage failures return the safe fallback instead of throwing', () => {
  const unavailableStorage = {
    getItem() {
      throw new Error('storage unavailable');
    },
  };

  assert.equal(readPrincessPosition(unavailableStorage), null);
  assert.equal(writePrincessPosition(unavailableStorage, { x: 1, y: 2 }), false);

  const unavailableWindow = {};
  Object.defineProperty(unavailableWindow, 'localStorage', {
    get() {
      throw new Error('blocked property');
    },
  });
  assert.equal(getPrincessStorage(unavailableWindow), null);
});

test('viewport subscription removes resize, orientation, and visualViewport listeners', () => {
  const activeWindowListeners = new Map();
  const activeViewportListeners = new Map();
  const visualViewport = {
    addEventListener: (name, callback) => activeViewportListeners.set(name, callback),
    removeEventListener: (name) => activeViewportListeners.delete(name),
  };
  const windowTarget = {
    visualViewport,
    addEventListener: (name, callback) => activeWindowListeners.set(name, callback),
    removeEventListener: (name) => activeWindowListeners.delete(name),
  };

  const unsubscribe = subscribePrincessViewportChanges(windowTarget, () => {});
  assert.deepEqual([...activeWindowListeners.keys()].sort(), ['orientationchange', 'resize']);
  assert.deepEqual([...activeViewportListeners.keys()], ['resize']);

  unsubscribe();
  assert.equal(activeWindowListeners.size, 0);
  assert.equal(activeViewportListeners.size, 0);
});
