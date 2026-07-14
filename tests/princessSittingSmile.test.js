import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';
import { princessAnimations } from '../src/lib/princessPetAnimations.ts';
import {
  PRINCESS_STATES,
  canTransitionPrincess,
  getPrincessStatePriority,
} from '../src/lib/princessStateController.js';

const ASSET_PATH = fileURLToPath(new URL('../public/pet/princess/frames/frame-001.png', import.meta.url));

test('sitting smile configuration is localized and uses the consistent legacy Princess asset', () => {
  const sittingSmile = princessAnimations.sitting_smile;

  assert.equal(sittingSmile.name, 'sitting_smile');
  assert.deepEqual(sittingSmile.frames, ['/pet/princess/frames/frame-001.png']);
  assert.deepEqual(sittingSmile.localizedLabel, {
    zh: '坐著微笑',
    ko: '앉아서 미소',
    en: 'Sitting Smile',
  });
  assert.deepEqual(sittingSmile.ariaLabel, {
    zh: '公主正坐著微笑陪伴你',
    ko: '공주가 앉아서 미소 지으며 함께하고 있음',
    en: 'Princess sitting and smiling gently',
  });
  assert.equal(sittingSmile.priority, 1);
  assert.equal(sittingSmile.fallback, 'sit');
  assert.equal(sittingSmile.preload, false);
});

test('sitting smile is a low-priority state and cannot overwrite active interactions or sleep', () => {
  assert.equal(PRINCESS_STATES.SITTING_SMILE, 'sitting_smile');
  assert.equal(getPrincessStatePriority(PRINCESS_STATES.SITTING_SMILE), 1);
  assert.equal(canTransitionPrincess({
    current: PRINCESS_STATES.HAPPY,
    next: PRINCESS_STATES.SITTING_SMILE,
    source: 'presence',
  }), false);
  assert.equal(canTransitionPrincess({
    current: PRINCESS_STATES.SLEEPING_PRONE,
    next: PRINCESS_STATES.SITTING_SMILE,
    source: 'automatic',
  }), false);
});

test('legacy sitting smile asset is compact and contains transparency', async () => {
  const metadata = await sharp(ASSET_PATH).metadata();
  const bytes = (await readFile(ASSET_PATH)).byteLength;

  assert.equal(metadata.format, 'png');
  assert.equal(metadata.hasAlpha, true);
  assert.ok(metadata.width >= 100);
  assert.ok(metadata.height >= 180);
  assert.ok(bytes < 200_000);
});

test('reduced motion disables all Princess animation layers including sitting smile', async () => {
  const css = await readFile(new URL('../src/components/PrincessPet.module.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.aliveLayer[\s\S]*animation: none !important/);
  assert.match(css, /\.sittingSmileAlive\s*\{[\s\S]*princess-sitting-smile-breathe/);
});
