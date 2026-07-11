import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRINCESS_PERSISTENT_STATES,
  PRINCESS_PRESENCE_STORAGE_KEY,
  PRINCESS_PRESENCE_TIMING,
  createPrincessPresenceController,
  getAnimationStateForPersistent,
  getPersistentStateForInactivity,
  getPrincessSessionStorage,
  parsePrincessPresenceRecord,
} from '../src/lib/princessPresenceController.js';

function createFakeClock(start = 1_000_000) {
  let now = start;
  let nextId = 1;
  const timers = new Map();
  return {
    nowFn: () => now,
    setTimeoutFn(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, dueAt: now + delay });
      return id;
    },
    clearTimeoutFn(id) {
      timers.delete(id);
    },
    pendingCount: () => timers.size,
    tick(duration) {
      const target = now + duration;
      while (true) {
        const next = [...timers.entries()]
          .filter(([, timer]) => timer.dueAt <= target)
          .sort((a, b) => a[1].dueAt - b[1].dueAt)[0];
        if (!next) break;
        const [id, timer] = next;
        timers.delete(id);
        now = timer.dueAt;
        timer.callback();
      }
      now = target;
    },
  };
}

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    value: (key) => values.get(key),
  };
}

const TEST_TIMING = {
  ...PRINCESS_PRESENCE_TIMING,
  calmIdleThreshold: 100,
  restThreshold: 200,
  sleepThreshold: 300,
  reevaluationInterval: 25,
  minimumPersistentStateDuration: 0,
};

test('inactivity thresholds map to active, calm, rest, and sleep', () => {
  assert.equal(getPersistentStateForInactivity(0, TEST_TIMING), PRINCESS_PERSISTENT_STATES.ACTIVE_IDLE);
  assert.equal(getPersistentStateForInactivity(100, TEST_TIMING), PRINCESS_PERSISTENT_STATES.CALM_IDLE);
  assert.equal(getPersistentStateForInactivity(200, TEST_TIMING), PRINCESS_PERSISTENT_STATES.RESTING);
  assert.equal(getPersistentStateForInactivity(300, TEST_TIMING), PRINCESS_PERSISTENT_STATES.SLEEPING);
});

test('single scheduler advances persistent states and never repeats the same state', () => {
  const clock = createFakeClock();
  const states = [];
  const controller = createPrincessPresenceController({ ...clock, timing: TEST_TIMING, onPersistentStateChange: (state) => states.push(state) });
  assert.equal(controller.start(), true);
  states.length = 0;
  assert.equal(controller.start(), false);
  assert.equal(clock.pendingCount(), 1);
  clock.tick(99);
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.ACTIVE_IDLE);
  clock.tick(1);
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.CALM_IDLE);
  clock.tick(100);
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.RESTING);
  clock.tick(100);
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.SLEEPING);
  clock.tick(100);
  assert.deepEqual(states, ['calmIdle', 'resting', 'sleeping']);
  assert.equal(clock.pendingCount(), 1);
});

test('activity recalculates recovery target as active idle', () => {
  const clock = createFakeClock();
  const controller = createPrincessPresenceController({ ...clock, timing: TEST_TIMING });
  controller.start();
  clock.tick(200);
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.RESTING);
  controller.noteActivity('pointerDown');
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.ACTIVE_IDLE);
  assert.equal(getAnimationStateForPersistent(controller.getPersistentState()), 'idle');
});

test('sleeping direct activity emits one wake while passive activity does not', () => {
  const clock = createFakeClock();
  const wakes = [];
  const controller = createPrincessPresenceController({ ...clock, timing: TEST_TIMING, onWake: (event) => wakes.push(event) });
  controller.start();
  clock.tick(300);
  controller.noteActivity('meaningfulScroll', { wake: false });
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.SLEEPING);
  assert.equal(wakes.length, 0);
  clock.tick(300);
  controller.noteActivity('navigatorQuestionSubmitted');
  controller.noteActivity('pointerDown');
  assert.equal(wakes.length, 1);
  assert.equal(wakes[0].activityType, 'navigatorQuestionSubmitted');
});

test('hidden pauses scheduler and visible evaluates actual elapsed time once', () => {
  const clock = createFakeClock();
  const states = [];
  const controller = createPrincessPresenceController({ ...clock, timing: TEST_TIMING, onPersistentStateChange: (state) => states.push(state) });
  controller.start();
  states.length = 0;
  controller.setVisibility(false);
  assert.equal(clock.pendingCount(), 0);
  clock.tick(300);
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.ACTIVE_IDLE);
  controller.setVisibility(true);
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.SLEEPING);
  assert.deepEqual(states, ['sleeping']);
  assert.equal(clock.pendingCount(), 1);
});

test('minimum duration prevents flicker until the guard expires', () => {
  const clock = createFakeClock();
  const timing = { ...TEST_TIMING, minimumPersistentStateDuration: 150 };
  const controller = createPrincessPresenceController({ ...clock, timing });
  controller.start();
  clock.tick(100);
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.ACTIVE_IDLE);
  clock.tick(50);
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.CALM_IDLE);
});

test('stopped and disposed schedulers cancel timers and never update again', () => {
  const clock = createFakeClock();
  const states = [];
  const controller = createPrincessPresenceController({ ...clock, timing: TEST_TIMING, onPersistentStateChange: (state) => states.push(state) });
  controller.start();
  states.length = 0;
  assert.equal(controller.stop(), true);
  assert.equal(clock.pendingCount(), 0);
  clock.tick(400);
  assert.deepEqual(states, []);
  controller.noteActivity('pointerDown');
  controller.start();
  states.length = 0;
  controller.dispose();
  assert.equal(clock.pendingCount(), 0);
  clock.tick(400);
  assert.deepEqual(states, []);
  assert.equal(controller.noteActivity('pointerDown'), false);
});

test('old timer generations cannot overwrite a newer activity state', () => {
  const clock = createFakeClock();
  const callbacks = [];
  const controller = createPrincessPresenceController({
    nowFn: clock.nowFn,
    clearTimeoutFn: () => {},
    setTimeoutFn(callback, delay) {
      callbacks.push(callback);
      return clock.setTimeoutFn(callback, delay);
    },
    timing: TEST_TIMING,
  });
  controller.start();
  controller.noteActivity('pointerDown');
  callbacks[0]();
  assert.equal(controller.getPersistentState(), PRINCESS_PERSISTENT_STATES.ACTIVE_IDLE);
});

test('versioned session storage persists only presence timestamps and state', () => {
  const clock = createFakeClock();
  const storage = createMemoryStorage();
  const controller = createPrincessPresenceController({ ...clock, timing: TEST_TIMING, storage });
  controller.noteActivity('keyDown');
  const saved = JSON.parse(storage.value(PRINCESS_PRESENCE_STORAGE_KEY));
  assert.deepEqual(Object.keys(saved).sort(), [
    'contextEnteredAt',
    'currentContextId',
    'hiddenAt',
    'lastActivityAt',
    'persistentState',
    'previousContextId',
    'stateEnteredAt',
    'version',
  ]);
  assert.equal(saved.persistentState, PRINCESS_PERSISTENT_STATES.ACTIVE_IDLE);
});

test('valid session state restores while invalid and future records degrade safely', () => {
  const now = 1_000;
  const valid = JSON.stringify({ version: 1, lastActivityAt: 500, persistentState: 'resting', stateEnteredAt: 700, hiddenAt: null });
  assert.equal(parsePrincessPresenceRecord(valid, now)?.persistentState, 'resting');
  assert.equal(parsePrincessPresenceRecord('not-json', now), null);
  assert.equal(parsePrincessPresenceRecord('{"version":2,"persistentState":"sleeping"}', now), null);
  assert.equal(parsePrincessPresenceRecord('{"version":1,"lastActivityAt":1,"stateEnteredAt":1,"persistentState":"unknown"}', now), null);
});

test('storage access failures and SSR window access are safe', () => {
  assert.equal(getPrincessSessionStorage(undefined), null);
  const blockedWindow = {};
  Object.defineProperty(blockedWindow, 'sessionStorage', { get() { throw new Error('blocked'); } });
  assert.equal(getPrincessSessionStorage(blockedWindow), null);
  assert.doesNotThrow(() => createPrincessPresenceController({ storage: { getItem() { throw new Error('blocked'); } } }));
});

test('persistent states map onto existing animations without new assets', () => {
  assert.equal(getAnimationStateForPersistent('activeIdle'), 'idle');
  assert.equal(getAnimationStateForPersistent('calmIdle'), 'sit');
  assert.equal(getAnimationStateForPersistent('resting'), 'rest');
  assert.equal(getAnimationStateForPersistent('sleeping'), 'sleep');
});

test('context change preserves activity and does not reset the persistent state', () => {
  const clock = createFakeClock();
  const controller = createPrincessPresenceController({ ...clock, timing: TEST_TIMING, contextProfile: { id: 'generic' } });
  controller.start();
  clock.tick(100);
  const lastActivityAt = controller.getLastActivityAt();
  const persistentState = controller.getPersistentState();
  assert.equal(controller.setContext({ id: 'research', presenceBias: { calm: 1, rest: 1, sleep: 1 }, allowAutoSleep: true }), true);
  assert.equal(controller.getLastActivityAt(), lastActivityAt);
  assert.equal(controller.getPersistentState(), persistentState);
});

test('same context subpage update is ignored without scheduling another transition', () => {
  const clock = createFakeClock();
  const transitions = [];
  const controller = createPrincessPresenceController({ ...clock, timing: TEST_TIMING, contextProfile: { id: 'research' }, onPersistentStateChange: (state) => transitions.push(state) });
  controller.start();
  transitions.length = 0;
  assert.equal(controller.setContext({ id: 'research' }), false);
  assert.deepEqual(transitions, []);
  assert.equal(clock.pendingCount(), 1);
});

test('context bias adjusts persistent thresholds without direct state forcing', () => {
  const timing = { ...TEST_TIMING, minimumPersistentStateDuration: 0 };
  const base = getPersistentStateForInactivity(80, timing, { presenceBias: { calm: 1 } });
  const research = getPersistentStateForInactivity(80, timing, { presenceBias: { calm: 0.75 } });
  assert.equal(base, PRINCESS_PERSISTENT_STATES.ACTIVE_IDLE);
  assert.equal(research, PRINCESS_PERSISTENT_STATES.CALM_IDLE);
});

test('version one records migrate safely to generic context metadata', () => {
  const migrated = parsePrincessPresenceRecord(JSON.stringify({
    version: 1,
    lastActivityAt: 500,
    persistentState: 'calmIdle',
    stateEnteredAt: 600,
    hiddenAt: null,
  }), 1_000);
  assert.equal(migrated.currentContextId, 'generic');
  assert.equal(migrated.previousContextId, null);
  assert.equal(migrated.contextEnteredAt, 600);
});
