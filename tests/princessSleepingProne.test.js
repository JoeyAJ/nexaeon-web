import assert from 'node:assert/strict';
import test from 'node:test';
import { princessAnimations } from '../src/lib/princessPetAnimations.ts';

test('sleeping prone animation has its dedicated uploaded asset and three-language accessibility copy', () => {
  const sleeping = princessAnimations.sleeping_prone;

  assert.equal(sleeping.name, 'sleeping_prone');
  assert.deepEqual(sleeping.frames, ['/images/princess/princess-sleeping-prone.png']);
  assert.deepEqual(sleeping.localizedLabel, {
    zh: '趴著睡覺',
    ko: '엎드려 자기',
    en: 'Sleeping',
  });
  assert.deepEqual(sleeping.ariaLabel, {
    zh: '公主正趴著安靜睡覺',
    ko: '공주가 편안하게 엎드려 자고 있음',
    en: 'Princess sleeping peacefully',
  });
  assert.equal(sleeping.preload, false);
});
