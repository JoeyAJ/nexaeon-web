import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getInternalDemoStatus,
  isSafeDemoUrl,
  LAUNCH_MODES,
  normalizeLaunchMode,
  resolveDemoLaunch,
} from '../src/lib/demoRuntime.js';

test('External normalization uses the official value', () => {
  assert.equal(normalizeLaunchMode('External'), LAUNCH_MODES.EXTERNAL);
});

test('Embedded normalization uses the official value', () => {
  assert.equal(normalizeLaunchMode('Embedded'), LAUNCH_MODES.EMBEDDED);
});

test('Internal normalization uses the official value', () => {
  assert.equal(normalizeLaunchMode('Internal'), LAUNCH_MODES.INTERNAL);
});

test('historical launch mode aliases normalize safely', () => {
  assert.equal(normalizeLaunchMode('External URL'), LAUNCH_MODES.EXTERNAL);
  assert.equal(normalizeLaunchMode('Embed'), LAUNCH_MODES.EMBEDDED);
  assert.equal(normalizeLaunchMode('Iframe'), LAUNCH_MODES.EMBEDDED);
  assert.equal(normalizeLaunchMode('In-app'), LAUNCH_MODES.INTERNAL);
});

test('unknown launch mode falls back only to safe External URL behavior', () => {
  assert.deepEqual(resolveDemoLaunch({
    launchMode: 'Legacy Mystery',
    demoUrl: 'https://example.com/demo',
  }, { environment: 'production' }), {
    mode: LAUNCH_MODES.EXTERNAL,
    canLaunch: true,
    url: 'https://example.com/demo',
  });

  assert.deepEqual(resolveDemoLaunch({
    launchMode: 'Legacy Mystery',
    demoUrl: '',
  }, { environment: 'production' }), {
    mode: null,
    canLaunch: false,
    url: null,
  });
});

test('legal HTTPS URL is accepted', () => {
  assert.equal(isSafeDemoUrl('https://example.com/demo', { environment: 'production' }), true);
});

test('localhost development URL is accepted', () => {
  assert.equal(isSafeDemoUrl('http://localhost:4173/demo', { environment: 'development' }), true);
  assert.equal(isSafeDemoUrl('http://127.0.0.1:4173/demo', { environment: 'development' }), true);
});

test('javascript URL is rejected', () => {
  assert.equal(isSafeDemoUrl('javascript:alert(1)', { environment: 'development' }), false);
});

test('data URL is rejected', () => {
  assert.equal(isSafeDemoUrl('data:text/html,hello', { environment: 'development' }), false);
});

test('blank URL is rejected', () => {
  assert.equal(isSafeDemoUrl('   ', { environment: 'development' }), false);
});

test('file and malformed URLs are rejected', () => {
  assert.equal(isSafeDemoUrl('file:///tmp/demo.html', { environment: 'development' }), false);
  assert.equal(isSafeDemoUrl('not a url', { environment: 'development' }), false);
});

test('Internal Registry only allows explicitly registered slugs', () => {
  const registry = Object.freeze({
    'connected-demo': () => null,
  });

  assert.equal(getInternalDemoStatus('connected-demo', registry), 'registered');
  assert.equal(getInternalDemoStatus('missing-demo', registry), 'unregistered');
  assert.equal(getInternalDemoStatus('../connected-demo', registry), 'unregistered');
});

test('unregistered Internal Demo resolves to a safe routable state', () => {
  const launch = resolveDemoLaunch({
    slug: 'unregistered-demo',
    launchMode: 'Internal',
    demoUrl: '',
  }, { environment: 'production' });

  assert.equal(launch.mode, LAUNCH_MODES.INTERNAL);
  assert.equal(launch.canLaunch, false);
  assert.equal(getInternalDemoStatus('unregistered-demo', {}), 'unregistered');
});

test('unregistered Internal Demo can expose safe External fallback URL', () => {
  const launch = resolveDemoLaunch({
    slug: 'unregistered-demo',
    launchMode: 'Internal',
    demoUrl: 'https://example.com/demo',
  }, { environment: 'production' });

  assert.equal(launch.mode, LAUNCH_MODES.EXTERNAL);
  assert.equal(launch.canLaunch, true);
  assert.equal(launch.url, 'https://example.com/demo');
});
