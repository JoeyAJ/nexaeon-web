import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRINCESS_STATES,
  canTransitionPrincess,
  classifyPrincessPointerGesture,
  createPrincessStateController,
} from '../src/lib/princessStateController.js';

function createFakeClock() {
  let now = 1_000;
  let nextId = 1;
  const timers = new Map();

  return {
    clearTimeoutFn: (id) => timers.delete(id),
    nowFn: () => now,
    pendingCount: () => timers.size,
    setTimeoutFn: (callback, delay) => {
      const id = nextId;
      nextId += 1;
      timers.set(id, { callback, dueAt: now + delay });
      return id;
    },
    tick: (duration) => {
      now += duration;
      const dueTimers = [...timers.entries()]
        .filter(([, timer]) => timer.dueAt <= now)
        .sort((left, right) => left[1].dueAt - right[1].dueAt);

      for (const [id, timer] of dueTimers) {
        if (!timers.delete(id)) continue;
        timer.callback();
      }
    },
  };
}

test('interaction completion returns Princess to idle', () => {
  const clock = createFakeClock();
  const states = [];
  const controller = createPrincessStateController({ ...clock, onStateChange: (state) => states.push(state) });

  assert.equal(controller.transition(PRINCESS_STATES.WAVE, { source: 'interaction', duration: 1_500 }), true);
  assert.equal(controller.getState(), PRINCESS_STATES.WAVE);
  clock.tick(1_500);
  assert.equal(controller.getState(), PRINCESS_STATES.IDLE);
  assert.deepEqual(states, [PRINCESS_STATES.WAVE, PRINCESS_STATES.IDLE]);
});

test('affection cooldown prevents rapid repeat activation', () => {
  const clock = createFakeClock();
  const controller = createPrincessStateController({ ...clock });

  assert.equal(controller.requestAffection({ duration: 1_000, cooldown: 12_000 }), true);
  clock.tick(1_000);
  assert.equal(controller.getState(), PRINCESS_STATES.IDLE);
  assert.equal(controller.requestAffection({ duration: 1_000, cooldown: 12_000 }), false);
  clock.tick(11_000);
  assert.equal(controller.requestAffection({ duration: 1_000, cooldown: 12_000 }), true);
});

test('drag gesture cannot also become a click', () => {
  assert.equal(classifyPrincessPointerGesture({
    movedDistance: 8,
    dragThreshold: 7,
    longPressTriggered: false,
    cancelled: false,
  }), 'drag');
});

test('sleep cannot be interrupted by an automatic idle transition', () => {
  assert.equal(canTransitionPrincess({
    current: PRINCESS_STATES.SLEEP,
    next: PRINCESS_STATES.IDLE,
    source: 'automatic',
  }), false);
  assert.equal(canTransitionPrincess({
    current: PRINCESS_STATES.SLEEP,
    next: PRINCESS_STATES.IDLE,
    source: 'wake',
  }), true);
});

test('disposing the controller clears its active completion timer', () => {
  const clock = createFakeClock();
  const controller = createPrincessStateController({ ...clock });

  controller.transition(PRINCESS_STATES.HAPPY, { source: 'interaction', duration: 2_000 });
  assert.equal(clock.pendingCount(), 1);
  controller.dispose();
  assert.equal(clock.pendingCount(), 0);
  clock.tick(2_000);
  assert.equal(controller.getState(), PRINCESS_STATES.HAPPY);
});
