import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMPANION_INTRO_TIMELINE,
  getCompanionIntroFrame,
  hasSeenCompanionIntro,
  mapVideoPointToViewport,
  markCompanionIntroSeen,
} from '../src/lib/companionIntro.js';

test('video timeline resolves every intro phase from one centralized configuration', () => {
  assert.equal(getCompanionIntroFrame(0).phase, 'dormant');
  assert.equal(getCompanionIntroFrame(COMPANION_INTRO_TIMELINE.summonStart).phase, 'materializing');
  assert.equal(getCompanionIntroFrame(COMPANION_INTRO_TIMELINE.finalLightPoint).phase, 'emerging');
  assert.equal(getCompanionIntroFrame(COMPANION_INTRO_TIMELINE.greetingStart).phase, 'greeting');
  assert.equal(getCompanionIntroFrame(COMPANION_INTRO_TIMELINE.dockStart).phase, 'docking');
  assert.equal(getCompanionIntroFrame(COMPANION_INTRO_TIMELINE.complete).phase, 'active');
});

test('materialization and docking progress clamp safely', () => {
  assert.equal(getCompanionIntroFrame(-10).materializeProgress, 0);
  assert.equal(getCompanionIntroFrame(100).dockingProgress, 1);
});

test('video coordinates map through contain letterboxing and cover cropping', () => {
  const contain = mapVideoPointToViewport({
    point: { x: 445, y: 360, width: 890, height: 720 },
    videoRect: { left: 0, top: 0, width: 1440, height: 900 },
    videoWidth: 890,
    videoHeight: 720,
    objectFit: 'contain',
  });
  assert.deepEqual(contain, { x: 720, y: 450 });

  const cover = mapVideoPointToViewport({
    point: { x: 445, y: 360, width: 890, height: 720 },
    videoRect: { left: 0, top: 0, width: 390, height: 844 },
    videoWidth: 890,
    videoHeight: 720,
    objectFit: 'cover',
  });
  assert.ok(Math.abs(cover.x - 195) < 0.001);
  assert.ok(Math.abs(cover.y - 422) < 0.001);
});

test('session marker is resilient and prevents replay within the same session', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(hasSeenCompanionIntro(storage), false);
  assert.equal(markCompanionIntroSeen(storage), true);
  assert.equal(hasSeenCompanionIntro(storage), true);
  assert.equal(hasSeenCompanionIntro({ getItem() { throw new Error('blocked'); } }), false);
});
