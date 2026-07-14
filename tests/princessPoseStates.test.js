import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';
import { PRINCESS_INTRO_ASSET, princessAnimations } from '../src/lib/princessPetAnimations.ts';
import { PRINCESS_STATES, PRINCESS_STATE_GROUPS } from '../src/lib/princessStateController.js';

const poseAssets = {
  resting_awake: '/images/princess/princess-active.png',
  standing_attentive: '/images/princess/princess-active.png',
  attentive_portrait: '/images/princess/princess-active.png',
};

const expectedVisualByState = {
  idle: 'princess-active.png',
  walkRight: 'princess-seasonal-reindeer.png',
  walkLeft: 'princess-seasonal-reindeer.png',
  sit: 'princess-active.png',
  sitting_smile: 'princess-active.png',
  resting_awake: 'princess-active.png',
  standing_attentive: 'princess-active.png',
  attentive_portrait: 'princess-active.png',
  wave: 'princess-seasonal-reindeer.png',
  rest: 'princess-resting-prone.png',
  happy: 'princess-seasonal-reindeer.png',
  quiet: 'princess-resting-prone.png',
  sleep: 'princess-resting-prone.png',
  sleeping_prone: 'princess-sleeping-prone.png',
  curious: 'princess-active.png',
  affection: 'princess-active.png',
};

test('new Princess pose states extend the existing state system', () => {
  assert.equal(PRINCESS_STATES.RESTING_AWAKE, 'resting_awake');
  assert.equal(PRINCESS_STATES.STANDING_ATTENTIVE, 'standing_attentive');
  assert.equal(PRINCESS_STATES.ATTENTIVE_PORTRAIT, 'attentive_portrait');
  assert.ok(PRINCESS_STATE_GROUPS.LOW_ACTIVITY.includes('resting_awake'));
  assert.ok(PRINCESS_STATE_GROUPS.BASE.includes('standing_attentive'));
  assert.ok(PRINCESS_STATE_GROUPS.BASE.includes('attentive_portrait'));
});

test('new pose metadata is localized in Traditional Chinese, Korean, and English', () => {
  for (const [state, asset] of Object.entries(poseAssets)) {
    const animation = princessAnimations[state];
    assert.deepEqual(animation.frames, [asset]);
    assert.deepEqual(Object.keys(animation.localizedLabel).sort(), ['en', 'ko', 'zh']);
    assert.deepEqual(Object.keys(animation.ariaLabel).sort(), ['en', 'ko', 'zh']);
  }
});

test('every state renders one complete uploaded image while intro keeps the blue-dress Princess', () => {
  for (const [state, filename] of Object.entries(expectedVisualByState)) {
    const animation = princessAnimations[state];
    assert.equal(animation.frames.length, 1);
    assert.equal(animation.frames[0].split('/').pop(), filename);
  }
  assert.equal(PRINCESS_INTRO_ASSET, '/pet/princess/frames/frame-001.png');
});

test('new pose PNG file is the uploaded complete image', async () => {
  for (const asset of new Set(Object.values(poseAssets))) {
    const assetPath = fileURLToPath(new URL(`../public${asset}`, import.meta.url));
    const metadata = await sharp(assetPath).metadata();
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.width, 866);
    assert.equal(metadata.height, 604);
    assert.ok((await readFile(assetPath)).byteLength > 0);
  }
});
