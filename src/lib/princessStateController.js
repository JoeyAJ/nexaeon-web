export const PRINCESS_STATES = Object.freeze({
  IDLE: 'idle',
  WALK_LEFT: 'walkLeft',
  WALK_RIGHT: 'walkRight',
  SIT: 'sit',
  SITTING_SMILE: 'sitting_smile',
  RESTING_AWAKE: 'resting_awake',
  STANDING_ATTENTIVE: 'standing_attentive',
  ATTENTIVE_PORTRAIT: 'attentive_portrait',
  WAVE: 'wave',
  HAPPY: 'happy',
  CURIOUS: 'curious',
  AFFECTION: 'affection',
  QUIET: 'quiet',
  REST: 'rest',
  SLEEP: 'sleep',
  SLEEPING_PRONE: 'sleeping_prone',
});

export const PRINCESS_STATE_GROUPS = Object.freeze({
  BASE: Object.freeze([
    PRINCESS_STATES.IDLE,
    PRINCESS_STATES.WALK_LEFT,
    PRINCESS_STATES.WALK_RIGHT,
    PRINCESS_STATES.SIT,
    PRINCESS_STATES.SITTING_SMILE,
    PRINCESS_STATES.STANDING_ATTENTIVE,
    PRINCESS_STATES.ATTENTIVE_PORTRAIT,
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
    PRINCESS_STATES.RESTING_AWAKE,
  ]),
  SLEEP: Object.freeze([PRINCESS_STATES.SLEEP, PRINCESS_STATES.SLEEPING_PRONE]),
});

const INTERACTION_STATES = new Set(PRINCESS_STATE_GROUPS.INTERACTION);
const KNOWN_STATES = new Set(Object.values(PRINCESS_STATES));
const RELEASE_SOURCES = new Set(['complete', 'drag', 'reducedMotion']);

export function getPrincessStatePriority(state, isDragging = false) {
  if (isDragging) return 6;
  if (state === PRINCESS_STATES.AFFECTION) return 5;
  if (INTERACTION_STATES.has(state)) return 4;
  if (PRINCESS_STATE_GROUPS.SLEEP.includes(state)) return 3;
  if (PRINCESS_STATE_GROUPS.LOW_ACTIVITY.includes(state)) return 2;
  return 1;
}

export function canTransitionPrincess({ current, next, isDragging = false, source = 'automatic' }) {
  if (!KNOWN_STATES.has(current) || !KNOWN_STATES.has(next)) return false;
  if (current === next) return false;
  if (source === 'debug') return true;
  if (isDragging && source !== 'drag' && source !== 'reducedMotion') return false;

  if (RELEASE_SOURCES.has(source)) {
    return next === PRINCESS_STATES.IDLE;
  }

  if (source === 'wake') {
    return PRINCESS_STATE_GROUPS.SLEEP.includes(current)
      && [PRINCESS_STATES.IDLE, PRINCESS_STATES.CURIOUS, PRINCESS_STATES.HAPPY, PRINCESS_STATES.WAVE].includes(next);
  }

  if (source === 'presence') {
    return !INTERACTION_STATES.has(current);
  }

  if (source === 'websiteEvent' && !PRINCESS_STATE_GROUPS.SLEEP.includes(current)) {
    return !INTERACTION_STATES.has(current);
  }

  // Automatic behavior may only claim the machine from a settled idle state.
  if (source === 'automatic') {
    return current === PRINCESS_STATES.IDLE || current === PRINCESS_STATES.SITTING_SMILE;
  }

  // Active animations finish before another interaction starts; higher-priority
  // requests are queued by the component instead of replacing a visible frame.
  if (INTERACTION_STATES.has(current)) return false;
  if (PRINCESS_STATE_GROUPS.SLEEP.includes(current)) return false;

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
  onSnapshotChange = () => {},
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
  nowFn = Date.now,
} = {}) {
  let state = initialState;
  let dragging = false;
  let completionTimer = null;
  let affectionAllowedAt = 0;
  let disposed = false;
  let snapshot = Object.freeze({
    emotion: getCompanionEmotionForPose(initialState),
    pose: initialState,
    source: COMPANION_BEHAVIOR_SOURCES.IDLE,
    priority: getCompanionSourcePriority(COMPANION_BEHAVIOR_SOURCES.IDLE),
    startedAt: nowFn(),
    minDuration: getCompanionMinimumDuration(COMPANION_BEHAVIOR_SOURCES.IDLE),
    expiresAt: null,
    interruptible: true,
  });

  const cancelCompletion = () => {
    if (completionTimer === null) return;
    clearTimeoutFn(completionTimer);
    completionTimer = null;
  };

  const applyState = (next, options = {}) => {
    state = next;
    onStateChange(next);
    const source = options.behaviorSource || options.source || COMPANION_BEHAVIOR_SOURCES.IDLE;
    const startedAt = nowFn();
    const duration = Number.isFinite(options.duration) && options.duration > 0 ? options.duration : null;
    snapshot = Object.freeze({
      emotion: options.emotion || getCompanionEmotionForPose(next),
      pose: next,
      source,
      priority: Number.isFinite(options.priority) ? options.priority : getCompanionSourcePriority(source),
      startedAt,
      minDuration: Number.isFinite(options.minDuration) ? Math.max(0, options.minDuration) : getCompanionMinimumDuration(source),
      expiresAt: duration === null ? null : startedAt + duration,
      interruptible: options.interruptible !== false,
    });
    onSnapshotChange(snapshot);
  };

  const transition = (next, options = {}) => {
    if (disposed) return false;
    const source = options.source || 'automatic';

    if (!canTransitionPrincess({ current: state, next, isDragging: dragging, source })) {
      return false;
    }

    cancelCompletion();
    applyState(next, options);

    if (Number.isFinite(options.duration) && options.duration > 0) {
      const expectedState = next;
      completionTimer = setTimeoutFn(() => {
        completionTimer = null;
        if (disposed || dragging || state !== expectedState) return;
        const completionState = options.resolveCompletionState?.() || options.completionState || PRINCESS_STATES.IDLE;
        applyState(KNOWN_STATES.has(completionState) ? completionState : PRINCESS_STATES.IDLE, {
          source: options.completionSource || COMPANION_BEHAVIOR_SOURCES.IDLE,
          emotion: options.resolveCompletionEmotion?.(),
        });
        options.onComplete?.();
      }, options.duration);
    }

    return true;
  };

  const requestBehavior = ({ pose, emotion, source, priority, minDuration, duration, interruptible = true, force = false, ...options } = {}) => {
    if (!KNOWN_STATES.has(pose) || disposed) return false;
    const behaviorSource = source || COMPANION_BEHAVIOR_SOURCES.IDLE;
    const nextPriority = Number.isFinite(priority) ? priority : getCompanionSourcePriority(behaviorSource);
    const now = nowFn();
    if (!force && snapshot.pose === pose && snapshot.emotion === (emotion || getCompanionEmotionForPose(pose))) return false;
    if (!force && now - snapshot.startedAt < snapshot.minDuration && nextPriority < snapshot.priority) return false;
    if (
      !force
      && !snapshot.interruptible
      && ![
        COMPANION_BEHAVIOR_SOURCES.INTERACTION,
        COMPANION_BEHAVIOR_SOURCES.SYSTEM,
        COMPANION_BEHAVIOR_SOURCES.DEBUG,
      ].includes(behaviorSource)
    ) return false;
    if (state === pose) {
      cancelCompletion();
      applyState(pose, {
        ...options,
        behaviorSource,
        emotion: emotion || getCompanionEmotionForPose(pose),
        priority: nextPriority,
        minDuration,
        duration,
        interruptible,
      });
      return true;
    }
    return transition(pose, {
      ...options,
      source: 'debug',
      behaviorSource,
      emotion: emotion || getCompanionEmotionForPose(pose),
      priority: nextPriority,
      minDuration,
      duration,
      interruptible,
    });
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

  const startDrag = (nextState = PRINCESS_STATES.IDLE, options = {}) => {
    if (disposed) return false;
    dragging = true;
    cancelCompletion();
    if (state !== nextState) applyState(nextState, options);
    return true;
  };

  const endDrag = (nextState = PRINCESS_STATES.IDLE, options = {}) => {
    if (disposed) return false;
    dragging = false;
    if (state !== nextState) applyState(nextState, options);
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
    getSnapshot: () => snapshot,
    isDragging: () => dragging,
    requestAffection,
    requestBehavior,
    startDrag,
    transition,
  };
}
import {
  COMPANION_BEHAVIOR_SOURCES,
  getCompanionEmotionForPose,
  getCompanionMinimumDuration,
  getCompanionSourcePriority,
} from './companionBehaviorConfig.ts';
