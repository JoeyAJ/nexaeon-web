import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMPANION_BEHAVIOR_PRIORITY,
  COMPANION_BEHAVIOR_SOURCES,
  COMPANION_BEHAVIOR_TIMING,
  COMPANION_EMOTIONS,
  getCompanionEventBehavior,
  getCompanionInactivityBehavior,
  getCompanionModuleBehavior,
} from '../src/lib/companionBehaviorConfig.ts';
import { normalizeCompanionEventDetail } from '../src/lib/companionEvents.ts';
import { PRINCESS_STATES, createPrincessStateController } from '../src/lib/princessStateController.js';

test('emotion, module, inactivity, and system-event mappings are centralized', () => {
  assert.deepEqual(getCompanionModuleBehavior('home'), { emotion: 'calm', pose: 'resting_awake' });
  assert.deepEqual(getCompanionModuleBehavior('identity'), { emotion: 'attentive', pose: 'standing_attentive' });
  assert.deepEqual(getCompanionModuleBehavior('research'), { emotion: 'curious', pose: 'standing_attentive' });
  assert.deepEqual(getCompanionModuleBehavior('coaching'), { emotion: 'happy', pose: 'sitting_smile' });
  assert.deepEqual(getCompanionModuleBehavior('knowledge'), { emotion: 'attentive', pose: 'standing_attentive' });
  assert.deepEqual(getCompanionModuleBehavior('prototype'), { emotion: 'curious', pose: 'standing_attentive' });
  assert.deepEqual(getCompanionModuleBehavior('action'), { emotion: 'attentive', pose: 'standing_attentive' });
  assert.deepEqual(getCompanionInactivityBehavior('calmIdle', 'research'), { emotion: 'calm', pose: 'resting_awake' });
  assert.deepEqual(getCompanionInactivityBehavior('resting', 'home'), { emotion: 'sleepy', pose: 'sleep' });
  assert.deepEqual(getCompanionInactivityBehavior('sleeping', 'home'), { emotion: 'sleepy', pose: 'sleeping_prone' });
  assert.deepEqual(getCompanionEventBehavior('success'), { emotion: 'happy', pose: 'sitting_smile' });
  assert.deepEqual(getCompanionEventBehavior('error'), { emotion: 'sad', pose: 'quiet' });
  assert.deepEqual(getCompanionEventBehavior('loading'), { emotion: 'attentive', pose: 'standing_attentive' });
});

test('inactivity and interaction timing follows the Sprint 2-C thresholds', () => {
  assert.deepEqual(COMPANION_BEHAVIOR_TIMING.inactivity, {
    calm: 45_000,
    sleepy: 90_000,
    sleeping: 150_000,
    reevaluation: 5_000,
  });
  assert.ok(COMPANION_BEHAVIOR_TIMING.hover.minimumHold >= 1_500);
  assert.ok(COMPANION_BEHAVIOR_TIMING.hover.returnDelay <= 2_500);
  assert.ok(COMPANION_BEHAVIOR_TIMING.click.duration >= 2_000);
  assert.ok(COMPANION_BEHAVIOR_TIMING.click.duration <= 4_000);
  assert.ok(COMPANION_BEHAVIOR_TIMING.transition >= 250);
  assert.ok(COMPANION_BEHAVIOR_TIMING.transition <= 400);
});

test('behavior snapshots separate emotion from pose and enforce priority plus minimum hold', () => {
  let now = 1_000;
  const snapshots = [];
  const controller = createPrincessStateController({
    initialState: PRINCESS_STATES.RESTING_AWAKE,
    nowFn: () => now,
    onSnapshotChange: (snapshot) => snapshots.push(snapshot),
  });

  assert.equal(controller.requestBehavior({
    emotion: COMPANION_EMOTIONS.ATTENTIVE,
    pose: PRINCESS_STATES.STANDING_ATTENTIVE,
    source: COMPANION_BEHAVIOR_SOURCES.INTERACTION,
    minDuration: 2_000,
  }), true);
  assert.deepEqual(controller.getSnapshot(), {
    emotion: 'attentive',
    pose: 'standing_attentive',
    source: 'interaction',
    priority: COMPANION_BEHAVIOR_PRIORITY.interaction,
    startedAt: 1_000,
    minDuration: 2_000,
    expiresAt: null,
    interruptible: true,
  });
  assert.equal(controller.requestBehavior({
    ...getCompanionModuleBehavior('home'),
    source: COMPANION_BEHAVIOR_SOURCES.CONTEXT,
  }), false);
  assert.equal(controller.requestBehavior({
    emotion: COMPANION_EMOTIONS.ATTENTIVE,
    pose: PRINCESS_STATES.STANDING_ATTENTIVE,
    source: COMPANION_BEHAVIOR_SOURCES.INTERACTION,
  }), false);
  now = 3_100;
  assert.equal(controller.requestBehavior({
    ...getCompanionModuleBehavior('home'),
    source: COMPANION_BEHAVIOR_SOURCES.CONTEXT,
  }), true);
  assert.equal(snapshots.length, 2);
});

test('system behavior can interrupt context and non-interruptible sleep rejects lower priority', () => {
  let now = 1_000;
  const controller = createPrincessStateController({ initialState: PRINCESS_STATES.RESTING_AWAKE, nowFn: () => now });
  controller.requestBehavior({
    ...getCompanionModuleBehavior('home'),
    source: COMPANION_BEHAVIOR_SOURCES.CONTEXT,
  });
  assert.equal(controller.requestBehavior({
    ...getCompanionEventBehavior('success'),
    source: COMPANION_BEHAVIOR_SOURCES.SYSTEM,
  }), true);
  now += 10_000;
  assert.equal(controller.requestBehavior({
    ...getCompanionInactivityBehavior('sleeping'),
    source: COMPANION_BEHAVIOR_SOURCES.INACTIVITY,
    interruptible: false,
  }), true);
  assert.equal(controller.requestBehavior({
    ...getCompanionModuleBehavior('identity'),
    source: COMPANION_BEHAVIOR_SOURCES.CONTEXT,
  }), false);
});

test('public companion events validate types and clamp durations', () => {
  assert.deepEqual(normalizeCompanionEventDetail({ type: 'success' }), { type: 'success', duration: 3_000 });
  assert.deepEqual(normalizeCompanionEventDetail({ type: 'loading', duration: 50 }), { type: 'loading', duration: 500 });
  assert.deepEqual(normalizeCompanionEventDetail({ type: 'reset' }), { type: 'reset' });
  assert.equal(normalizeCompanionEventDetail({ type: 'unknown' }), null);
  assert.equal(normalizeCompanionEventDetail(null), null);
});
