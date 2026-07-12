export const PRINCESS_PRESENCE_STORAGE_KEY = 'nexaeon-princess-presence';
export const PRINCESS_PRESENCE_STORAGE_VERSION = 2;

export const PRINCESS_PERSISTENT_STATES = Object.freeze({
  ACTIVE_IDLE: 'activeIdle',
  CALM_IDLE: 'calmIdle',
  RESTING: 'resting',
  SLEEPING: 'sleeping',
});

export const PRINCESS_PRESENCE_TIMING = Object.freeze({
  activeIdleThreshold: 45_000,
  calmIdleThreshold: 180_000,
  restThreshold: 420_000,
  sleepThreshold: import.meta.env?.DEV ? 35_000 : 240_000,
  wakeDuration: 1_200,
  reevaluationInterval: 15_000,
  minimumPersistentStateDuration: 20_000,
  meaningfulScrollThrottle: 8_000,
});

const PERSISTENT_STATES = new Set(Object.values(PRINCESS_PERSISTENT_STATES));
const CONTEXT_IDS = new Set(['home', 'identity', 'research', 'coaching', 'knowledge', 'prototype', 'action', 'navigator', 'generic']);

export function getPersistentStateForInactivity(inactiveFor, timing = PRINCESS_PRESENCE_TIMING, contextProfile = null) {
  const bias = contextProfile?.presenceBias || {};
  const sleepThreshold = contextProfile?.allowAutoSleep === false
    ? Number.POSITIVE_INFINITY
    : timing.sleepThreshold * (Number.isFinite(bias.sleep) ? bias.sleep : 1);
  const restThreshold = timing.restThreshold * (Number.isFinite(bias.rest) ? bias.rest : 1);
  const calmThreshold = timing.calmIdleThreshold * (Number.isFinite(bias.calm) ? bias.calm : 1);
  if (inactiveFor >= sleepThreshold) return PRINCESS_PERSISTENT_STATES.SLEEPING;
  if (inactiveFor >= restThreshold) return PRINCESS_PERSISTENT_STATES.RESTING;
  if (inactiveFor >= calmThreshold) return PRINCESS_PERSISTENT_STATES.CALM_IDLE;
  return PRINCESS_PERSISTENT_STATES.ACTIVE_IDLE;
}

export function getAnimationStateForPersistent(persistentState) {
  if (persistentState === PRINCESS_PERSISTENT_STATES.CALM_IDLE) return 'sitting_smile';
  if (persistentState === PRINCESS_PERSISTENT_STATES.RESTING) return 'rest';
  if (persistentState === PRINCESS_PERSISTENT_STATES.SLEEPING) return 'sleeping_prone';
  return 'idle';
}

export function parsePrincessPresenceRecord(rawValue, now = Date.now()) {
  try {
    const value = JSON.parse(rawValue);
    if (value?.version !== 1 && value?.version !== PRINCESS_PRESENCE_STORAGE_VERSION) return null;
    if (!PERSISTENT_STATES.has(value.persistentState)) return null;
    if (![value.lastActivityAt, value.stateEnteredAt].every(Number.isFinite)) return null;
    if (value.lastActivityAt < 0 || value.stateEnteredAt < 0 || value.lastActivityAt > now + 60_000) return null;
    if (value.hiddenAt != null && (!Number.isFinite(value.hiddenAt) || value.hiddenAt < 0)) return null;
    return {
      lastActivityAt: value.lastActivityAt,
      persistentState: value.persistentState,
      stateEnteredAt: value.stateEnteredAt,
      hiddenAt: value.hiddenAt ?? null,
      currentContextId: CONTEXT_IDS.has(value.currentContextId) ? value.currentContextId : 'generic',
      previousContextId: CONTEXT_IDS.has(value.previousContextId) ? value.previousContextId : null,
      contextEnteredAt: Number.isFinite(value.contextEnteredAt) ? value.contextEnteredAt : value.stateEnteredAt,
    };
  } catch {
    return null;
  }
}

export function getPrincessSessionStorage(windowTarget) {
  try {
    return windowTarget?.sessionStorage || null;
  } catch {
    return null;
  }
}

export function createPrincessPresenceController({
  nowFn = Date.now,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
  timing = PRINCESS_PRESENCE_TIMING,
  storage = null,
  onPersistentStateChange = () => {},
  onWake = () => {},
  contextProfile = null,
  onDebug = () => {},
} = {}) {
  const storedValue = (() => {
    try {
      return storage?.getItem?.(PRINCESS_PRESENCE_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  })();
  const restored = parsePrincessPresenceRecord(storedValue, nowFn());
  let lastActivityAt = restored?.lastActivityAt ?? nowFn();
  let persistentState = restored?.persistentState
    ?? getPersistentStateForInactivity(Math.max(0, nowFn() - lastActivityAt), timing, contextProfile);
  let stateEnteredAt = restored?.stateEnteredAt ?? nowFn();
  let hiddenAt = restored?.hiddenAt ?? null;
  let currentContextProfile = contextProfile;
  let currentContextId = contextProfile?.id || restored?.currentContextId || 'generic';
  let previousContextId = restored?.previousContextId ?? null;
  let contextEnteredAt = restored?.contextEnteredAt ?? nowFn();
  let timer = null;
  let running = false;
  let disposed = false;
  let generation = 0;
  let initialStateNotified = false;

  const debug = (entry) => onDebug({ ...entry, persistentState, lastActivityAt });

  const persist = () => {
    try {
      storage?.setItem?.(PRINCESS_PRESENCE_STORAGE_KEY, JSON.stringify({
        version: PRINCESS_PRESENCE_STORAGE_VERSION,
        lastActivityAt,
        persistentState,
        stateEnteredAt,
        hiddenAt,
        currentContextId,
        previousContextId,
        contextEnteredAt,
      }));
    } catch {
      debug({ action: 'storage_ignored', reason: 'unavailable' });
    }
  };

  const cancelTimer = () => {
    generation += 1;
    if (timer === null) return;
    clearTimeoutFn(timer);
    timer = null;
    debug({ action: 'timer_cancelled' });
  };

  const applyPersistentState = (next, reason, { force = false } = {}) => {
    if (disposed || next === persistentState) return false;
    const now = nowFn();
    if (!force && now - stateEnteredAt < timing.minimumPersistentStateDuration) {
      debug({ action: 'transition_ignored', reason: 'minimum_duration', nextPersistentState: next });
      return false;
    }
    const previous = persistentState;
    persistentState = next;
    stateEnteredAt = now;
    persist();
    onPersistentStateChange(next, { previous, reason });
    debug({ action: 'transition_accepted', previousPersistentState: previous, nextPersistentState: next, reason });
    return true;
  };

  const evaluate = (reason = 'inactivity') => {
    if (disposed || hiddenAt !== null) return persistentState;
    const next = getPersistentStateForInactivity(Math.max(0, nowFn() - lastActivityAt), timing, currentContextProfile);
    applyPersistentState(next, reason);
    return persistentState;
  };

  const schedule = () => {
    cancelTimer();
    if (!running || disposed || hiddenAt !== null) return;
    const expectedGeneration = generation;
    timer = setTimeoutFn(() => {
      timer = null;
      if (disposed || !running || expectedGeneration !== generation) return;
      evaluate('scheduled_reevaluation');
      schedule();
    }, timing.reevaluationInterval);
    debug({ action: 'timer_scheduled', delay: timing.reevaluationInterval });
  };

  const noteActivity = (activityType, { wake = true } = {}) => {
    if (disposed) return false;
    const previous = persistentState;
    if (previous === PRINCESS_PERSISTENT_STATES.SLEEPING && !wake) {
      debug({ action: 'activity_ignored', activityType, reason: 'sleeping_low_priority' });
      return false;
    }
    lastActivityAt = nowFn();
    persist();
    if (hiddenAt !== null) {
      debug({ action: 'activity_ignored', activityType, reason: 'hidden' });
      return false;
    }
    if (previous === PRINCESS_PERSISTENT_STATES.SLEEPING && wake) {
      onWake({ activityType, previousPersistentState: previous });
      applyPersistentState(PRINCESS_PERSISTENT_STATES.ACTIVE_IDLE, `wake:${activityType}`, { force: true });
    } else {
      applyPersistentState(PRINCESS_PERSISTENT_STATES.ACTIVE_IDLE, `activity:${activityType}`, { force: true });
    }
    debug({ action: 'activity', activityType, wake });
    schedule();
    return true;
  };

  const setVisibility = (visible) => {
    if (disposed) return;
    if (!visible) {
      hiddenAt = nowFn();
      persist();
      cancelTimer();
      debug({ action: 'visibility_change', visible: false });
      return;
    }
    const wasHidden = hiddenAt !== null;
    hiddenAt = null;
    persist();
    if (wasHidden) evaluate('visibility_restored');
    if (running) schedule();
    debug({ action: 'visibility_change', visible: true });
  };

  const setContext = (nextProfile, { reason = 'route_context' } = {}) => {
    if (disposed) return false;
    const nextContextId = CONTEXT_IDS.has(nextProfile?.id) ? nextProfile.id : 'generic';
    if (nextContextId === currentContextId) {
      debug({ action: 'context_ignored', reason: 'duplicate_context', contextId: nextContextId });
      return false;
    }
    const previous = currentContextId;
    previousContextId = previous;
    currentContextId = nextContextId;
    currentContextProfile = nextProfile;
    contextEnteredAt = nowFn();
    persist();
    evaluate('context_change');
    debug({ action: 'context_changed', previousContext: previous, nextContext: nextContextId, reason });
    return true;
  };

  const start = () => {
    if (disposed || running) return false;
    running = true;
    const beforeEvaluation = persistentState;
    evaluate('start');
    if (!initialStateNotified) {
      initialStateNotified = true;
      if (persistentState === beforeEvaluation) {
        onPersistentStateChange(persistentState, { previous: null, reason: restored ? 'session_restore' : 'initial_presence' });
      }
    }
    schedule();
    return true;
  };

  const stop = () => {
    if (!running) return false;
    running = false;
    cancelTimer();
    return true;
  };

  const dispose = () => {
    disposed = true;
    running = false;
    cancelTimer();
  };

  return {
    dispose,
    evaluate,
    getLastActivityAt: () => lastActivityAt,
    getContextId: () => currentContextId,
    getPreviousContextId: () => previousContextId,
    getContextEnteredAt: () => contextEnteredAt,
    getPersistentState: () => persistentState,
    getStateEnteredAt: () => stateEnteredAt,
    isHidden: () => hiddenAt !== null,
    isRunning: () => running,
    noteActivity,
    setVisibility,
    setContext,
    start,
    stop,
  };
}
