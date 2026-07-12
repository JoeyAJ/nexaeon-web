import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';
import { princessAnimations } from '../src/lib/princessPetAnimations.ts';
import { PRINCESS_STATES, PRINCESS_STATE_GROUPS } from '../src/lib/princessStateController.js';

const poseAssets = {
  resting_awake: 'princess-resting-awake-closeup.png',
  standing_attentive: 'princess-standing-attentive.png',
  attentive_portrait: 'princess-attentive-portrait.png',
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
  for (const [state, file] of Object.entries(poseAssets)) {
    const animation = princessAnimations[state];
    assert.deepEqual(animation.frames, [`/pet/princess/frames/${file}`]);
    assert.deepEqual(Object.keys(animation.localizedLabel).sort(), ['en', 'ko', 'zh']);
    assert.deepEqual(Object.keys(animation.ariaLabel).sort(), ['en', 'ko', 'zh']);
  }
});

test('new pose PNG files contain real transparency', async () => {
  for (const file of Object.values(poseAssets)) {
    const assetPath = fileURLToPath(new URL(`../public/pet/princess/frames/${file}`, import.meta.url));
    const metadata = await sharp(assetPath).metadata();
    const { data, info } = await sharp(assetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparentPixels = 0;
    for (let index = 3; index < data.length; index += info.channels) {
      if (data[index] === 0) transparentPixels += 1;
    }
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.hasAlpha, true);
    assert.ok(transparentPixels > 0);
    assert.ok((await readFile(assetPath)).byteLength > 0);
  }
});
