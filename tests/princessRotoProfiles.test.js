import assert from 'node:assert/strict';
import test from 'node:test';
import { PRINCESS_ROTO_LIMITS, PRINCESS_ROTO_PROFILES, getPrincessRotoProfile, supportsPrincessMotion } from '../src/lib/princessRotoProfiles.js';

test('all eight fixed module images have bounded roto profiles', () => {
  assert.equal(Object.keys(PRINCESS_ROTO_PROFILES).length, 8);
  for (const [key, profile] of Object.entries(PRINCESS_ROTO_PROFILES)) {
    assert.equal(profile.imageKey, key);
    assert.ok(profile.sourceSize.width > 0 && profile.sourceSize.height > 0);
    assert.ok(profile.motionIntensity > 0 && profile.motionIntensity <= 0.7);
    assert.ok(profile.headAmplitude <= PRINCESS_ROTO_LIMITS.headDegrees);
    for (const region of Object.values(profile.regions)) {
      assert.ok(region.cx >= 0 && region.cx <= 100);
      assert.ok(region.cy >= 0 && region.cy <= 100);
      assert.ok(region.rx > 0 && region.rx <= 40);
      assert.ok(region.ry > 0 && region.ry <= 45);
    }
  }
});

test('pose-specific motions do not invent unavailable anatomy', () => {
  const standing = getPrincessRotoProfile('/pet/princess/module-poses/princess-module-pose-03.png');
  const portrait = getPrincessRotoProfile('/pet/princess/module-poses/princess-module-pose-01.png');
  const prone = getPrincessRotoProfile('/pet/princess/module-poses/princess-module-pose-08.png');
  assert.equal(supportsPrincessMotion(standing, 'tail'), true);
  assert.ok(standing.regions.tail);
  assert.equal(supportsPrincessMotion(portrait, 'tail'), false);
  assert.equal(portrait.regions.tail, undefined);
  assert.equal(portrait.shadowProfile.enabled, false);
  assert.equal(supportsPrincessMotion(prone, 'sleepyEyelids'), true);
  assert.equal(prone.poseType, 'prone');
});

test('unknown module asset safely falls back to the Home rig', () => {
  assert.equal(getPrincessRotoProfile('/missing.png').imageKey, 'princess-module-pose-02.png');
});
