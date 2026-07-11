export const PRINCESS_STATES = Object.freeze({
  IDLE: 'idle',
  WALK_LEFT: 'walkLeft',
  WALK_RIGHT: 'walkRight',
  SIT: 'sit',
  WAVE: 'wave',
  HAPPY: 'happy',
  CURIOUS: 'curious',
  AFFECTION: 'affection',
  QUIET: 'quiet',
  REST: 'rest',
  SLEEP: 'sleep',
});

export const PRINCESS_STATE_GROUPS = Object.freeze({
  BASE: Object.freeze([
    PRINCESS_STATES.IDLE,
    PRINCESS_STATES.WALK_LEFT,
    PRINCESS_STATES.WALK_RIGHT,
    PRINCESS_STATES.SIT,
  ]),
  INTERACTION: Object.freeze([
    PRINCESS_STATES.WAVE,
    PRINCESS_STATES.HAPPY,
    PRINCESS_STATES.CURIOUS,
    PRINCESS_STATES.AFFECTION,
  ]),
  LOW_ACTIVITY: Object.freeze([
    PRINCESS_STATES.QUIET,
    PRINCESS_STATES.REST,
  ]),
  SLEEP: Object.freeze([PRINCESS_STATES.SLEEP]),
});

const INTERACTION_STATES = new Set(PRINCESS_STATE_GROUPS.INTERACTION);
const KNOWN_STATES = new Set(Object.values(PRINCESS_STATES));
const RELEASE_SOURCES = new Set(['complete', 'drag', 'reducedMotion']);

export function getPrincessStatePriority(state, isDragging = false) {
  if (isDragging) return 6;
  if (state === PRINCESS_STATES.AFFECTION) return 5;
  if (INTERACTION_STATES.has(state)) return 4;
  if (state === PRINCESS_STATES.SLEEP) return 3;
  if (PRINCESS_STATE_GROUPS.LOW_ACTIVITY.includes(state)) return 2;
  return 1;
}

export function canTransitionPrincess({ current, next, isDragging = false, source = 'automatic' }) {
  if (!KNOWN_STATES.has(current) || !KNOWN_STATES.has(next)) return false;
  if (current === next) return false;
  if (isDragging && source !== 'drag' && source !== 'reducedMotion') return false;

  if (RELEASE_SOURCES.has(source)) {
    return next === PRINCESS_STATES.IDLE;
  }

  if (source === 'wake') {
    return current === PRINCESS_STATES.SLEEP
      && (next === PRINCESS_STATES.IDLE || next === PRINCESS_STATES.CURIOUS);
  }

  if (source === 'presence') {
    return !INTERACTION_STATES.has(current);
  }

  if (source === 'websiteEvent' && current !== PRINCESS_STATES.SLEEP) {
    return !INTERACTION_STATES.has(current);
  }

  // Automatic behavior may only claim the machine from a settled idle state.
  if (source === 'automatic') {
    return current === PRINCESS_STATES.IDLE;
  }

  // Active animations finish before another interaction starts; higher-priority
  // requests are queued by the component instead of replacing a visible frame.
  if (INTERACTION_STATES.has(current)) return false;
  if (current === PRINCESS_STATES.SLEEP) return false;

  return current === PRINCESS_STATES.IDLE
    && getPrincessStatePriority(next) >= getPrincessStatePriority(current);
}

export function classifyPrincessPointerGesture({ movedDistance, dragThreshold, longPressTriggered, cancelled }) {
  if (cancelled) return 'cancel';
  if (movedDistance > dragThreshold) return 'drag';
  if (longPressTriggered) return 'longPress';
  return 'click';
}

export function createPrincessStateController({
  initialState = PRINCESS_STATES.IDLE,
  onStateChange = () => {},
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
  nowFn = Date.now,
} = {}) {
  let state = initialState;
  let dragging = false;
  let completionTimer = null;
  let affectionAllowedAt = 0;
  let disposed = false;

  const cancelCompletion = () => {
    if (completionTimer === null) return;
    clearTimeoutFn(completionTimer);
    completionTimer = null;
  };

  const applyState = (next) => {
    state = next;
    onStateChange(next);
  };

  const transition = (next, options = {}) => {
    if (disposed) return false;
    const source = options.source || 'automatic';

    if (!canTransitionPrincess({ current: state, next, isDragging: dragging, source })) {
      return false;
    }

    cancelCompletion();
    applyState(next);

    if (Number.isFinite(options.duration) && options.duration > 0) {
      const expectedState = next;
      completionTimer = setTimeoutFn(() => {
        completionTimer = null;
        if (disposed || dragging || state !== expectedState) return;
        const completionState = options.resolveCompletionState?.() || options.completionState || PRINCESS_STATES.IDLE;
        applyState(KNOWN_STATES.has(completionState) ? completionState : PRINCESS_STATES.IDLE);
        options.onComplete?.();
      }, options.duration);
    }

    return true;
  };

  const requestAffection = ({ duration, cooldown, onComplete } = {}) => {
    const now = nowFn();
    if (now < affectionAllowedAt) return false;

    const started = transition(PRINCESS_STATES.AFFECTION, {
      source: 'interaction',
      duration,
      onComplete,
    });

    if (started) affectionAllowedAt = now + Math.max(0, cooldown || 0);
    return started;
  };

  const startDrag = () => {
    if (disposed) return false;
    dragging = true;
    cancelCompletion();
    if (state !== PRINCESS_STATES.IDLE) applyState(PRINCESS_STATES.IDLE);
    return true;
  };

  const endDrag = () => {
    if (disposed) return false;
    dragging = false;
    if (state !== PRINCESS_STATES.IDLE) applyState(PRINCESS_STATES.IDLE);
    return true;
  };

  const dispose = () => {
    disposed = true;
    cancelCompletion();
  };

  return {
    canRequestAffection: () => !disposed && nowFn() >= affectionAllowedAt,
    cancelCompletion,
    dispose,
    endDrag,
    getState: () => state,
    isDragging: () => dragging,
    requestAffection,
    startDrag,
    transition,
  };
}
