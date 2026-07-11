import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PET_AFFECTION_EVENT, PET_CURIOUS_EVENT, PET_HAPPY_EVENT } from '../lib/petEvents.js';
import {
  clampPrincessPosition,
  clearPrincessPosition,
  clearPrincessScale,
  getPrincessStorage,
  readPrincessPosition,
  readPrincessScale,
  subscribePrincessViewportChanges,
  writePrincessPosition,
  writePrincessScale,
} from '../lib/princessLayoutPersistence.js';
import {
  PRINCESS_CONTEXT_PROFILES,
  getContextPreferredPosition,
  selectContextIdleAnimation,
} from '../lib/princessContextResolver.js';
import {
  PRINCESS_PRESENCE_TIMING,
  createPrincessPresenceController,
  getPrincessSessionStorage,
} from '../lib/princessPresenceController.js';
import { princessAnimations } from '../lib/princessPetAnimations';
import type { PrincessEventBridge } from '../lib/princessEventBridge';
import {
  PRINCESS_STATES,
  PRINCESS_STATE_GROUPS,
  classifyPrincessPointerGesture,
  createPrincessStateController,
} from '../lib/princessStateController.js';
import styles from './PrincessPet.module.css';

type PetState = keyof typeof princessAnimations;
type WalkState = 'walkLeft' | 'walkRight';
type PlayfulInteraction = 'wave' | 'happy';
type PendingInteraction = PlayfulInteraction | 'curious' | 'affection' | null;
type PetPosition = {
  x: number;
  y: number;
};
type PetScale = number;
type NaturalBehavior = 'idle' | 'walk' | 'sit' | 'curious' | 'wave' | 'happy' | 'rest' | 'quiet' | 'sleep';
type LowPowerState = 'rest' | 'quiet' | 'sleep';

const PET_DEBUG = false;

const PET_BEHAVIOR_TIMING = {
  idleNextBehaviorDelay: [12_000, 26_000],
  dragResumeDelay: [1_500, 3_000],

  walkDuration: [1_600, 2_600],
  sitDuration: [9_000, 18_000],
  restDuration: [18_000, 36_000],
  quietDuration: [12_000, 24_000],
  sleepDuration: [30_000, 70_000],
  waveDuration: [1_200, 2_000],
  happyDuration: [1_400, 2_400],
  curiousDuration: [1_800, 3_200],
  affectionDuration: [1_800, 2_800],

  minTimeBeforeRest: 90_000,
  minTimeBeforeQuiet: 150_000,
  minTimeBeforeSleep: 240_000,

  restCooldown: 120_000,
  quietCooldown: 150_000,
  sleepCooldown: 240_000,

  interactionCooldown: 10_000,
  waveCooldown: 12_000,
  happyCooldown: 10_000,
  affectionCooldown: 12_000,
  curiousCooldown: 35_000,
  curiousPlayfulGap: 25_000,
} as const;

const PET_SCALE = {
  min: 0.72,
  max: 1.32,
  mobileMax: 1.1,
  default: 1,
  wheelStep: 0.05,
  doubleClickSizes: [0.82, 1, 1.18],
} as const;

const NATURAL_BEHAVIOR_WEIGHTS: Record<'base' | 'restReady' | 'quietReady' | 'sleepReady', { behavior: NaturalBehavior; weight: number }[]> = {
  base: [
    { behavior: 'idle', weight: 60 },
    { behavior: 'walk', weight: 16 },
    { behavior: 'sit', weight: 12 },
    { behavior: 'curious', weight: 8 },
    { behavior: 'wave', weight: 3 },
    { behavior: 'happy', weight: 1 },
  ],
  restReady: [
    { behavior: 'idle', weight: 48 },
    { behavior: 'walk', weight: 14 },
    { behavior: 'sit', weight: 12 },
    { behavior: 'curious', weight: 10 },
    { behavior: 'wave', weight: 2 },
    { behavior: 'happy', weight: 2 },
  ],
  quietReady: [
    { behavior: 'idle', weight: 42 },
    { behavior: 'walk', weight: 12 },
    { behavior: 'sit', weight: 10 },
    { behavior: 'curious', weight: 10 },
    { behavior: 'wave', weight: 3 },
    { behavior: 'happy', weight: 2 },
  ],
  sleepReady: [
    { behavior: 'idle', weight: 42 },
    { behavior: 'walk', weight: 12 },
    { behavior: 'sit', weight: 10 },
    { behavior: 'curious', weight: 10 },
    { behavior: 'wave', weight: 3 },
    { behavior: 'happy', weight: 2 },
  ],
};

const DESKTOP_WALK_DISTANCE = [24, 56] as const;
const MOBILE_WALK_DISTANCE = [12, 28] as const;
const MOBILE_BREAKPOINT = 520;
const USER_ACTIVITY_THROTTLE = 1_500;
const QUIET_HOVER_WAKE_DELAY = [300, 600] as const;
const SLEEP_WAKE_INTERACTION_DELAY = 400;
const CUSTOM_EVENT_COOLDOWN = 8_000;
const LOW_POWER_STATE_GAP = 45_000;
const POST_SLEEP_LOW_POWER_GAP = 90_000;
const DRAG_CLICK_THRESHOLD = 7;
const LONG_PRESS_DELAY = [800, 1_200] as const;
const SINGLE_CLICK_DELAY = 220;
const DOUBLE_CLICK_WINDOW = 320;
const REPEAT_CLICK_AFFECTION_WINDOW = 8_000;
const PET_VISUAL_WIDTH_MULTIPLIER = 1.42;
const PET_ASPECT_RATIO = 1.56;
const PET_INTERACTION_LABELS = {
  zh: { enabled: '與 Princess 互動或拖曳', disabled: '拖曳 Princess' },
  ko: { enabled: 'Princess와 상호작용하거나 드래그', disabled: 'Princess 드래그' },
  en: { enabled: 'Interact with or drag Princess', disabled: 'Drag Princess' },
} as const;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(media.matches);

    handleChange();
    media.addEventListener('change', handleChange);

    return () => media.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getRandomBlinkDelay() {
  return 14_000 + Math.random() * 14_000;
}

function getRandomBetween([min, max]: readonly [number, number]) {
  return min + Math.random() * (max - min);
}

function getViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 800 };
  }

  return {
    width: window.innerWidth || document.documentElement.clientWidth || 1280,
    height: window.innerHeight || document.documentElement.clientHeight || 800,
  };
}

function getFallbackPetWidth(viewportWidth: number) {
  return viewportWidth <= MOBILE_BREAKPOINT
    ? clampNumber(viewportWidth * 0.22, 76, 98)
    : clampNumber(viewportWidth * 0.11, 88, 148);
}

function getPetSize(root: HTMLDivElement | null) {
  const { width: viewportWidth } = getViewportSize();
  const fallbackWidth = getFallbackPetWidth(viewportWidth);
  const width = root?.offsetWidth || fallbackWidth;
  const height = root?.offsetHeight || width * PET_ASPECT_RATIO;

  return { width, height };
}

function getDefaultPetMargins(viewportWidth: number, viewportHeight: number) {
  const isMobile = viewportWidth <= MOBILE_BREAKPOINT;

  return {
    right: isMobile
      ? clampNumber(viewportWidth * 0.04, 14, 22)
      : clampNumber(viewportWidth * 0.04, 18, 52),
    bottom: isMobile
      ? clampNumber(viewportHeight * 0.12, 68, 92)
      : clampNumber(viewportWidth * 0.04, 18, 48),
  };
}

function getPetSafeArea(viewportWidth: number) {
  const isMobile = viewportWidth <= MOBILE_BREAKPOINT;

  return {
    left: 12,
    right: 12,
    top: isMobile ? 72 : 76,
    bottom: isMobile ? 96 : 12,
  };
}

function getMaxScale(viewportWidth: number) {
  return viewportWidth <= MOBILE_BREAKPOINT ? PET_SCALE.mobileMax : PET_SCALE.max;
}

function clampPetScale(scale: number) {
  const { width } = getViewportSize();
  return clampNumber(scale, PET_SCALE.min, getMaxScale(width));
}

function clampPetPosition(position: PetPosition, scale: PetScale, root: HTMLDivElement | null): PetPosition {
  const viewport = getViewportSize();
  const safeArea = getPetSafeArea(viewport.width);
  const size = getPetSize(root);

  return clampPrincessPosition({
    position,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    safeArea,
    size,
    scale,
    visualWidthMultiplier: PET_VISUAL_WIDTH_MULTIPLIER,
  });
}

function getDefaultPetPosition(root: HTMLDivElement | null, scale: PetScale, preferredAnchor = 'bottomRight'): PetPosition {
  const viewport = getViewportSize();
  const size = getPetSize(root);
  const margins = getDefaultPetMargins(viewport.width, viewport.height);
  const baseSafeArea = getPetSafeArea(viewport.width);
  const preferred = getContextPreferredPosition({
    preferredAnchor,
    viewport,
    size,
    safeArea: {
      ...baseSafeArea,
      left: margins.right,
      right: margins.right,
      bottom: margins.bottom,
    },
  });

  return clampPetPosition(preferred.position, scale, root);
}

function readStoredPosition() {
  if (typeof window === 'undefined') return null;
  return readPrincessPosition(getPrincessStorage(window)) as PetPosition | null;
}

function readStoredScale() {
  if (typeof window === 'undefined') return null;
  return readPrincessScale(getPrincessStorage(window));
}

function writeStoredPosition(position: PetPosition) {
  if (typeof window === 'undefined') return;
  writePrincessPosition(getPrincessStorage(window), position);
}

function writeStoredScale(scale: PetScale) {
  if (typeof window === 'undefined') return;
  writePrincessScale(getPrincessStorage(window), scale);
}

function clearStoredPetLayout() {
  if (typeof window === 'undefined') return;
  const storage = getPrincessStorage(window);
  clearPrincessPosition(storage);
  clearPrincessScale(storage);
}

function getInitialPetLayout(preferredAnchor = 'bottomRight') {
  const restoredScale = clampPetScale(readStoredScale() ?? PET_SCALE.default);
  const restoredPosition = readStoredPosition();
  const position = restoredPosition
    ? clampPetPosition(restoredPosition, restoredScale, null)
    : getDefaultPetPosition(null, restoredScale, preferredAnchor);

  return { position, scale: restoredScale };
}

function chooseWeightedBehavior(weights: { behavior: NaturalBehavior; weight: number }[]) {
  const totalWeight = weights.reduce((total, item) => total + item.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const item of weights) {
    roll -= item.weight;
    if (roll <= 0) return item.behavior;
  }

  return 'idle';
}

type PrincessPetProps = {
  lang?: 'zh' | 'ko' | 'en';
  navigationKey?: string;
  visible?: boolean;
  autoBehaviorEnabled?: boolean;
  interactionEnabled?: boolean;
  resetPositionToken?: number;
  resetSizeToken?: number;
  eventBridge?: PrincessEventBridge;
  contextProfile?: (typeof PRINCESS_CONTEXT_PROFILES)[keyof typeof PRINCESS_CONTEXT_PROFILES];
};

export default function PrincessPet({
  lang = 'zh',
  navigationKey = '',
  visible = true,
  autoBehaviorEnabled = true,
  interactionEnabled = true,
  resetPositionToken = 0,
  resetSizeToken = 0,
  eventBridge,
  contextProfile = PRINCESS_CONTEXT_PROFILES.generic,
}: PrincessPetProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [initialLayout] = useState(() => getInitialPetLayout(contextProfile.preferredAnchor));
  const [petState, setPetState] = useState<PetState>('idle');
  const animation = princessAnimations[petState];
  const normalFrames = animation.frames;
  const blinkFrame = petState === 'idle' ? princessAnimations.idle.blinkFrames?.[0] || null : null;
  const [frameIndex, setFrameIndex] = useState(0);
  const [blinkSrc, setBlinkSrc] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [motionDuration, setMotionDuration] = useState(0);
  const [position, setPosition] = useState<PetPosition>(initialLayout.position);
  const [scale, setScale] = useState<PetScale>(initialLayout.scale);
  const [isDragging, setIsDragging] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const interactiveRef = useRef<HTMLButtonElement | null>(null);
  const offsetXRef = useRef(0);
  const positionRef = useRef(position);
  const scaleRef = useRef(scale);
  const stateRef = useRef<PetState>('idle');
  const isDraggingRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const blinkTimeoutRef = useRef<number | null>(null);
  const blinkResetRef = useRef<number | null>(null);
  const behaviorTimeoutRef = useRef<number | null>(null);
  const restInteractionTimeoutRef = useRef<number | null>(null);
  const sleepInteractionTimeoutRef = useRef<number | null>(null);
  const quietInteractionTimeoutRef = useRef<number | null>(null);
  const interactionWakeTimeoutRef = useRef<number | null>(null);
  const dragResumeTimeoutRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const singleClickTimeoutRef = useRef<number | null>(null);
  const scaleSaveTimeoutRef = useRef<number | null>(null);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const pendingDragPositionRef = useRef<PetPosition | null>(null);
  const suppressNativeClickRef = useRef(false);
  const lastPointerClickAtRef = useRef(0);
  const waveAllowedAtRef = useRef(0);
  const happyAllowedAtRef = useRef(0);
  const curiousAllowedAtRef = useRef(0);
  const customEventAllowedAtRef = useRef(0);
  const restAllowedAtRef = useRef(Date.now() + PET_BEHAVIOR_TIMING.minTimeBeforeRest);
  const sleepAllowedAtRef = useRef(Date.now() + PET_BEHAVIOR_TIMING.minTimeBeforeSleep);
  const quietAllowedAtRef = useRef(Date.now() + PET_BEHAVIOR_TIMING.minTimeBeforeQuiet);
  const restEndedAtRef = useRef(0);
  const sleepEndedAtRef = useRef(0);
  const quietEndedAtRef = useRef(0);
  const lastPlayfulInteractionAtRef = useRef(0);
  const lastCuriousAtRef = useRef(0);
  const pageLoadedAtRef = useRef(Date.now());
  const lastUserInteractionAtRef = useRef(Date.now());
  const lastThrottledActivityAtRef = useRef(0);
  const pendingInteractionRef = useRef<PendingInteraction>(null);
  const nextClickInteractionRef = useRef<PlayfulInteraction>('wave');
  const lastPetClickAtRef = useRef(0);
  const longPressTriggeredRef = useRef(false);
  const previousNavigationKeyRef = useRef(navigationKey);
  const previousResetPositionTokenRef = useRef(resetPositionToken);
  const previousResetSizeTokenRef = useRef(resetSizeToken);
  const scheduleBehaviorRef = useRef<((delayRange: readonly [number, number]) => void) | null>(null);
  const dragSessionRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originPosition: PetPosition;
    dragging: boolean;
    altKey: boolean;
  } | null>(null);
  const stateControllerRef = useRef<ReturnType<typeof createPrincessStateController> | null>(null);
  const presenceControllerRef = useRef<ReturnType<typeof createPrincessPresenceController> | null>(null);
  const contextProfileRef = useRef(contextProfile);
  const suppressRouteReactionAfterDragRef = useRef(false);

  if (stateControllerRef.current === null) {
    stateControllerRef.current = createPrincessStateController({
      initialState: PRINCESS_STATES.IDLE,
      onStateChange: (nextState: PetState) => {
        stateRef.current = nextState;
        setPetState(nextState);
        setFrameIndex(0);
        setBlinkSrc(null);
        if (nextState === PRINCESS_STATES.IDLE) setMotionDuration(0);
      },
    });
  }

  if (presenceControllerRef.current === null) {
    presenceControllerRef.current = createPrincessPresenceController({
      storage: getPrincessSessionStorage(typeof window === 'undefined' ? null : window),
      contextProfile,
      onPersistentStateChange: (persistentState: string) => {
        if (isDraggingRef.current || PRINCESS_STATE_GROUPS.INTERACTION.includes(stateRef.current)) return;
        stateControllerRef.current?.transition(
          selectContextIdleAnimation(contextProfileRef.current, persistentState),
          { source: 'presence' },
        );
      },
      onWake: () => {
        if (isDraggingRef.current) return;
        stateControllerRef.current?.transition(PRINCESS_STATES.CURIOUS, {
          source: 'wake',
          duration: PRINCESS_PRESENCE_TIMING.wakeDuration,
          completionState: PRINCESS_STATES.IDLE,
        });
      },
      onDebug: (entry: unknown) => {
        if (import.meta.env.DEV) console.debug('[Princess Presence]', entry);
      },
    });
  }

  useEffect(() => {
    contextProfileRef.current = contextProfile;
    presenceControllerRef.current?.setContext(contextProfile);
  }, [contextProfile]);

  const currentFrame = useMemo(() => {
    if (prefersReducedMotion) return princessAnimations.idle.frames[0];
    return blinkSrc || normalFrames[frameIndex % normalFrames.length];
  }, [blinkSrc, frameIndex, normalFrames, prefersReducedMotion]);

  useEffect(() => {
    offsetXRef.current = offsetX;
  }, [offsetX]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const clearTimer = useCallback((timerRef: { current: number | null }) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearBehaviorTimers = useCallback(() => {
    clearTimer(behaviorTimeoutRef);
    clearTimer(restInteractionTimeoutRef);
    clearTimer(sleepInteractionTimeoutRef);
    clearTimer(quietInteractionTimeoutRef);
    clearTimer(interactionWakeTimeoutRef);
    clearTimer(dragResumeTimeoutRef);
  }, [clearTimer]);

  const clearPetTimers = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    clearTimer(blinkTimeoutRef);
    clearTimer(blinkResetRef);
    clearTimer(longPressTimeoutRef);
    clearTimer(singleClickTimeoutRef);
    clearTimer(scaleSaveTimeoutRef);
    clearBehaviorTimers();
    stateControllerRef.current?.cancelCompletion();

    if (dragAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }
  }, [clearBehaviorTimers, clearTimer]);

  const noteUserInteraction = useCallback((options: { immediate?: boolean; type?: string; wake?: boolean } = {}) => {
    const now = Date.now();

    if (!options.immediate && now - lastThrottledActivityAtRef.current < USER_ACTIVITY_THROTTLE) {
      return;
    }

    lastThrottledActivityAtRef.current = now;
    lastUserInteractionAtRef.current = now;
    presenceControllerRef.current?.noteActivity(options.type || 'princessInteraction', { wake: options.wake !== false });
  }, []);

  const setIdleState = useCallback(() => {
    stateControllerRef.current?.transition(PRINCESS_STATES.IDLE, { source: 'complete' });
    setFrameIndex(0);
    setBlinkSrc(null);
    setMotionDuration(0);
  }, []);

  const settleWalkOffset = useCallback(() => {
    const currentOffset = offsetXRef.current;
    if (currentOffset === 0) return positionRef.current;

    const nextPosition = clampPetPosition({
      x: positionRef.current.x + currentOffset,
      y: positionRef.current.y,
    }, scaleRef.current, rootRef.current);

    offsetXRef.current = 0;
    positionRef.current = nextPosition;
    setPosition(nextPosition);
    setMotionDuration(0);
    setOffsetX(0);
    return nextPosition;
  }, []);

  const persistScaleSoon = useCallback((nextScale: PetScale) => {
    clearTimer(scaleSaveTimeoutRef);
    scaleSaveTimeoutRef.current = window.setTimeout(() => {
      scaleSaveTimeoutRef.current = null;
      writeStoredScale(nextScale);
    }, 240);
  }, [clearTimer]);

  const applyScale = useCallback((nextScale: PetScale, options: { persist?: boolean } = {}) => {
    const clampedScale = clampPetScale(nextScale);
    scaleRef.current = clampedScale;
    setScale(clampedScale);

    const nextPosition = clampPetPosition(positionRef.current, clampedScale, rootRef.current);
    positionRef.current = nextPosition;
    setPosition(nextPosition);

    if (options.persist) {
      persistScaleSoon(clampedScale);
    }

    return clampedScale;
  }, [persistScaleSoon]);

  const playAffection = useCallback(() => {
    if (prefersReducedMotion || isDraggingRef.current || stateRef.current !== PRINCESS_STATES.IDLE) return false;

    const now = Date.now();
    clearTimer(behaviorTimeoutRef);
    setMotionDuration(0);
    const started = stateControllerRef.current?.requestAffection({
      duration: getRandomBetween(PET_BEHAVIOR_TIMING.affectionDuration),
      cooldown: PET_BEHAVIOR_TIMING.affectionCooldown,
      onComplete: () => {
        scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
      },
    }) ?? false;

    if (!started) return false;

    lastPlayfulInteractionAtRef.current = now;

    return true;
  }, [clearTimer, prefersReducedMotion]);

  const playPendingAffection = useCallback(() => {
    if (pendingInteractionRef.current !== 'affection') return false;

    pendingInteractionRef.current = null;
    return playAffection();
  }, [playAffection]);

  const playWave = useCallback(() => {
    if (prefersReducedMotion || isDraggingRef.current || stateRef.current !== PRINCESS_STATES.IDLE) return false;

    clearTimer(behaviorTimeoutRef);
    setMotionDuration(0);
    const started = stateControllerRef.current?.transition(PRINCESS_STATES.WAVE, {
      source: 'interaction',
      duration: getRandomBetween(PET_BEHAVIOR_TIMING.waveDuration),
      onComplete: () => {
        if (playPendingAffection()) return;
        scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
      },
    }) ?? false;

    if (!started) return false;

    lastPlayfulInteractionAtRef.current = Date.now();

    return true;
  }, [clearTimer, playPendingAffection, prefersReducedMotion]);

  const playHappy = useCallback(() => {
    if (prefersReducedMotion || isDraggingRef.current || stateRef.current !== PRINCESS_STATES.IDLE) return false;

    clearTimer(behaviorTimeoutRef);
    setMotionDuration(0);
    const started = stateControllerRef.current?.transition(PRINCESS_STATES.HAPPY, {
      source: 'interaction',
      duration: getRandomBetween(PET_BEHAVIOR_TIMING.happyDuration),
      onComplete: () => {
        if (playPendingAffection()) return;
        scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
      },
    }) ?? false;

    if (!started) return false;

    lastPlayfulInteractionAtRef.current = Date.now();

    return true;
  }, [clearTimer, playPendingAffection, prefersReducedMotion]);

  const playCurious = useCallback(() => {
    if (prefersReducedMotion || isDraggingRef.current || stateRef.current !== PRINCESS_STATES.IDLE) return false;

    const now = Date.now();
    clearTimer(behaviorTimeoutRef);
    setMotionDuration(0);
    const started = stateControllerRef.current?.transition(PRINCESS_STATES.CURIOUS, {
      source: 'interaction',
      duration: getRandomBetween(PET_BEHAVIOR_TIMING.curiousDuration),
      onComplete: () => {
        if (playPendingAffection()) return;
        scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
      },
    }) ?? false;

    if (!started) return false;

    lastCuriousAtRef.current = now;
    curiousAllowedAtRef.current = now + PET_BEHAVIOR_TIMING.curiousCooldown;

    return true;
  }, [clearTimer, playPendingAffection, prefersReducedMotion]);

  const playPendingInteraction = useCallback(() => {
    const pendingInteraction = pendingInteractionRef.current;
    if (!pendingInteraction) return false;

    pendingInteractionRef.current = null;
    if (pendingInteraction === 'affection') return playAffection();
    if (pendingInteraction === 'wave') return playWave();
    if (pendingInteraction === 'happy') return playHappy();
    return playCurious();
  }, [playAffection, playCurious, playHappy, playWave]);

  const finishSleep = useCallback((options: { schedule?: boolean; playPending?: boolean } = {}) => {
    clearTimer(sleepInteractionTimeoutRef);

    const now = Date.now();
    setIdleState();
    sleepEndedAtRef.current = now;
    sleepAllowedAtRef.current = Math.max(sleepAllowedAtRef.current, now + PET_BEHAVIOR_TIMING.sleepCooldown);
    restAllowedAtRef.current = Math.max(restAllowedAtRef.current, now + POST_SLEEP_LOW_POWER_GAP);
    quietAllowedAtRef.current = Math.max(quietAllowedAtRef.current, now + POST_SLEEP_LOW_POWER_GAP);

    if (options.playPending !== false && playPendingInteraction()) return;

    if (options.schedule !== false) {
      scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
    }
  }, [clearTimer, playPendingInteraction, setIdleState]);

  const finishQuiet = useCallback((options: { schedule?: boolean; playPending?: boolean } = {}) => {
    clearTimer(quietInteractionTimeoutRef);

    const now = Date.now();
    setIdleState();
    quietEndedAtRef.current = now;
    quietAllowedAtRef.current = Math.max(quietAllowedAtRef.current, now + PET_BEHAVIOR_TIMING.quietCooldown);
    restAllowedAtRef.current = Math.max(restAllowedAtRef.current, now + LOW_POWER_STATE_GAP);
    sleepAllowedAtRef.current = Math.max(sleepAllowedAtRef.current, now + LOW_POWER_STATE_GAP);

    if (options.playPending !== false && playPendingInteraction()) return;

    if (options.schedule !== false) {
      scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
    }
  }, [clearTimer, playPendingInteraction, setIdleState]);

  const finishRest = useCallback((options: { schedule?: boolean; playPending?: boolean } = {}) => {
    clearTimer(restInteractionTimeoutRef);

    const now = Date.now();
    setIdleState();
    restEndedAtRef.current = now;
    restAllowedAtRef.current = Math.max(restAllowedAtRef.current, now + PET_BEHAVIOR_TIMING.restCooldown);
    quietAllowedAtRef.current = Math.max(quietAllowedAtRef.current, now + LOW_POWER_STATE_GAP);
    sleepAllowedAtRef.current = Math.max(sleepAllowedAtRef.current, now + LOW_POWER_STATE_GAP);

    if (options.playPending !== false && playPendingInteraction()) return;

    if (options.schedule !== false) {
      scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
    }
  }, [clearTimer, playPendingInteraction, setIdleState]);

  const requestAffection = useCallback((source: 'customEvent' | 'drag' | 'interaction' | 'longPress') => {
    if (prefersReducedMotion || isDraggingRef.current) return false;

    const currentState = stateRef.current;
    if (currentState === PRINCESS_STATES.AFFECTION) return false;

    const now = Date.now();
    if (!stateControllerRef.current?.canRequestAffection()) return false;
    if (source === 'customEvent' && now < customEventAllowedAtRef.current) return false;

    if (source === 'customEvent') {
      customEventAllowedAtRef.current = now + CUSTOM_EVENT_COOLDOWN;
    }

    if (currentState === PRINCESS_STATES.IDLE) {
      return playAffection();
    }

    pendingInteractionRef.current = 'affection';
    return true;
  }, [playAffection, prefersReducedMotion]);

  const requestWave = useCallback((source: 'greeting' | 'interaction' | 'natural') => {
    if (prefersReducedMotion || isDraggingRef.current) return false;

    const currentState = stateRef.current;
    if (currentState === 'wave' || currentState === 'happy') return false;

    const now = Date.now();
    if (source !== 'greeting') {
      if (now - lastCuriousAtRef.current < PET_BEHAVIOR_TIMING.curiousPlayfulGap) return false;
      if (now < waveAllowedAtRef.current) return false;
      waveAllowedAtRef.current = now + PET_BEHAVIOR_TIMING.waveCooldown;
    }

    if (currentState === 'idle') {
      return playWave();
    }

    const canDefer = currentState === 'walkLeft' || currentState === 'walkRight' || currentState === 'sit' || currentState === 'rest';
    if (source === 'interaction' && canDefer) {
      pendingInteractionRef.current = 'wave';
      return true;
    }

    return false;
  }, [playWave, prefersReducedMotion]);

  const requestHappy = useCallback((source: 'interaction' | 'customEvent' | 'initial' | 'natural') => {
    if (prefersReducedMotion || isDraggingRef.current) return false;

    const currentState = stateRef.current;
    if (currentState === 'wave' || currentState === 'happy') return false;
    const canDefer = currentState === 'walkLeft' || currentState === 'walkRight' || currentState === 'sit' || currentState === 'rest';
    const now = Date.now();
    const isHappyCoolingDown = now < happyAllowedAtRef.current;
    const isCustomEventCoolingDown = source === 'customEvent' && now < customEventAllowedAtRef.current;
    const isTooSoonAfterCurious = now - lastCuriousAtRef.current < PET_BEHAVIOR_TIMING.curiousPlayfulGap;

    if (currentState === 'quiet') {
      if (source === 'natural') return false;

      finishQuiet({ schedule: false, playPending: false });

      if (isHappyCoolingDown || isCustomEventCoolingDown || isTooSoonAfterCurious) {
        scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
        return false;
      }

      happyAllowedAtRef.current = now + PET_BEHAVIOR_TIMING.happyCooldown;

      if (source === 'customEvent') {
        customEventAllowedAtRef.current = now + CUSTOM_EVENT_COOLDOWN;
      }

      clearTimer(interactionWakeTimeoutRef);
      interactionWakeTimeoutRef.current = window.setTimeout(() => {
        interactionWakeTimeoutRef.current = null;

        if (stateRef.current === 'idle') {
          playHappy();
        } else {
          pendingInteractionRef.current = 'happy';
        }
      }, 300);
      return true;
    }

    if (currentState === 'sleep') {
      if (source === 'natural') return false;

      finishSleep({ schedule: false, playPending: false });

      if (isHappyCoolingDown || isCustomEventCoolingDown || isTooSoonAfterCurious) {
        scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
        return false;
      }

      happyAllowedAtRef.current = now + PET_BEHAVIOR_TIMING.happyCooldown;

      if (source === 'customEvent') {
        customEventAllowedAtRef.current = now + CUSTOM_EVENT_COOLDOWN;
      }

      clearTimer(interactionWakeTimeoutRef);
      interactionWakeTimeoutRef.current = window.setTimeout(() => {
        interactionWakeTimeoutRef.current = null;

        if (stateRef.current === 'idle') {
          playHappy();
        } else {
          pendingInteractionRef.current = 'happy';
        }
      }, SLEEP_WAKE_INTERACTION_DELAY);
      return true;
    }

    if (isHappyCoolingDown || isCustomEventCoolingDown || isTooSoonAfterCurious) return false;

    happyAllowedAtRef.current = now + PET_BEHAVIOR_TIMING.happyCooldown;

    if (source === 'customEvent') {
      customEventAllowedAtRef.current = now + CUSTOM_EVENT_COOLDOWN;
    }

    if (currentState !== 'idle' && !canDefer) return false;

    if (currentState === 'idle') {
      return playHappy();
    }

    if (source !== 'natural') {
      pendingInteractionRef.current = 'happy';
      return true;
    }

    return false;
  }, [clearTimer, finishQuiet, finishSleep, playHappy, prefersReducedMotion]);

  const requestCurious = useCallback((source: 'customEvent' | 'drag' | 'natural') => {
    if (prefersReducedMotion || isDraggingRef.current) return false;

    const currentState = stateRef.current;
    if (currentState === 'curious') return false;

    const now = Date.now();
    if (now < curiousAllowedAtRef.current) return false;
    if (now - lastPlayfulInteractionAtRef.current < PET_BEHAVIOR_TIMING.curiousPlayfulGap) return false;
    if (source === 'customEvent' && now < customEventAllowedAtRef.current) return false;

    if (currentState === 'idle') {
      if (source === 'customEvent') {
        customEventAllowedAtRef.current = now + CUSTOM_EVENT_COOLDOWN;
      }

      return playCurious();
    }

    if (source !== 'natural') {
      if (source === 'customEvent') {
        customEventAllowedAtRef.current = now + CUSTOM_EVENT_COOLDOWN;
      }

      pendingInteractionRef.current = 'curious';
      return true;
    }

    return false;
  }, [playCurious, prefersReducedMotion]);

  const getNaturalBehaviorWeights = useCallback((now: number) => {
    const pageElapsed = now - pageLoadedAtRef.current;
    const userInactive = now - lastUserInteractionAtRef.current;

    if (
      pageElapsed >= PET_BEHAVIOR_TIMING.minTimeBeforeSleep
      && userInactive >= PET_BEHAVIOR_TIMING.minTimeBeforeQuiet
    ) {
      return NATURAL_BEHAVIOR_WEIGHTS.sleepReady;
    }

    if (
      pageElapsed >= PET_BEHAVIOR_TIMING.minTimeBeforeQuiet
      && userInactive >= PET_BEHAVIOR_TIMING.minTimeBeforeRest
    ) {
      return NATURAL_BEHAVIOR_WEIGHTS.quietReady;
    }

    if (pageElapsed >= PET_BEHAVIOR_TIMING.minTimeBeforeRest) {
      return NATURAL_BEHAVIOR_WEIGHTS.restReady;
    }

    return NATURAL_BEHAVIOR_WEIGHTS.base;
  }, []);

  const canStartLowPowerState = useCallback((state: LowPowerState, now: number) => {
    const pageElapsed = now - pageLoadedAtRef.current;
    const userInactive = now - lastUserInteractionAtRef.current;
    const afterSleepGap = now - sleepEndedAtRef.current >= POST_SLEEP_LOW_POWER_GAP;

    if (state === 'rest') {
      return pageElapsed >= PET_BEHAVIOR_TIMING.minTimeBeforeRest
        && now >= restAllowedAtRef.current
        && now - quietEndedAtRef.current >= LOW_POWER_STATE_GAP
        && afterSleepGap;
    }

    if (state === 'quiet') {
      return pageElapsed >= PET_BEHAVIOR_TIMING.minTimeBeforeQuiet
        && userInactive >= PET_BEHAVIOR_TIMING.minTimeBeforeRest
        && now >= quietAllowedAtRef.current
        && now - restEndedAtRef.current >= LOW_POWER_STATE_GAP
        && afterSleepGap;
    }

    return pageElapsed >= PET_BEHAVIOR_TIMING.minTimeBeforeSleep
      && userInactive >= PET_BEHAVIOR_TIMING.minTimeBeforeQuiet
      && now >= sleepAllowedAtRef.current
      && now - restEndedAtRef.current >= LOW_POWER_STATE_GAP
      && now - quietEndedAtRef.current >= LOW_POWER_STATE_GAP
      && now - sleepEndedAtRef.current >= POST_SLEEP_LOW_POWER_GAP
      && now - lastPlayfulInteractionAtRef.current >= PET_BEHAVIOR_TIMING.interactionCooldown;
  }, []);

  useEffect(() => {
    const frames = Object.values(princessAnimations).flatMap((item) => [
      ...item.frames,
      ...('blinkFrames' in item ? item.blinkFrames || [] : []),
    ]);
    const uniqueFrames = Array.from(new Set(frames));
    const preloadedFrames = uniqueFrames.map((src) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
      return image;
    });

    return () => {
      preloadedFrames.splice(0, preloadedFrames.length);
    };
  }, []);

  useEffect(() => {
    let resizeFrame: number | null = null;

    const applyViewportBounds = () => {
      resizeFrame = null;
      const clampedScale = clampPetScale(scaleRef.current);
      scaleRef.current = clampedScale;
      setScale(clampedScale);

      const nextPosition = clampPetPosition(positionRef.current, clampedScale, rootRef.current);
      positionRef.current = nextPosition;
      setPosition(nextPosition);
    };

    const scheduleViewportBounds = () => {
      if (resizeFrame !== null) return;
      resizeFrame = window.requestAnimationFrame(applyViewportBounds);
    };

    const unsubscribe = subscribePrincessViewportChanges(window, scheduleViewportBounds);

    return () => {
      unsubscribe();
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || !visible) {
      stateControllerRef.current?.transition(PRINCESS_STATES.IDLE, { source: 'reducedMotion' });
      setFrameIndex(0);
      setBlinkSrc(null);
      return undefined;
    }

    setFrameIndex(0);
    const frameDuration = Math.round(1000 / animation.fps);
    intervalRef.current = window.setInterval(() => {
      setFrameIndex((current) => (
        animation.loop
          ? (current + 1) % normalFrames.length
          : Math.min(current + 1, normalFrames.length - 1)
      ));
    }, frameDuration);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [animation.fps, animation.loop, normalFrames.length, prefersReducedMotion, visible]);

  useEffect(() => {
    if (prefersReducedMotion || !visible || !blinkFrame) return undefined;

    const scheduleBlink = () => {
      blinkTimeoutRef.current = window.setTimeout(() => {
        setBlinkSrc(blinkFrame);

        blinkResetRef.current = window.setTimeout(() => {
          setBlinkSrc(null);
          scheduleBlink();
        }, 120 + Math.random() * 60);
      }, getRandomBlinkDelay());
    };

    scheduleBlink();

    return () => {
      clearTimer(blinkTimeoutRef);
      clearTimer(blinkResetRef);
      setBlinkSrc(null);
    };
  }, [blinkFrame, clearTimer, prefersReducedMotion, visible]);

  useEffect(() => {
    if (prefersReducedMotion || !visible || !autoBehaviorEnabled) return undefined;

    const scheduleBehavior = (delayRange: readonly [number, number]) => {
      clearTimer(behaviorTimeoutRef);

      if (isDraggingRef.current) return;

      behaviorTimeoutRef.current = window.setTimeout(() => {
        if (document.hidden || isDraggingRef.current || stateRef.current !== 'idle') {
          scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
          return;
        }

        if (playPendingInteraction()) return;

        const root = rootRef.current;
        const now = Date.now();
        const chosenBehavior = chooseWeightedBehavior(getNaturalBehaviorWeights(now));

        const startSit = () => {
          setMotionDuration(0);
          stateControllerRef.current?.transition(PRINCESS_STATES.SIT, {
            source: 'automatic',
            duration: getRandomBetween(PET_BEHAVIOR_TIMING.sitDuration),
            onComplete: () => {
              if (playPendingInteraction()) return;
              scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            },
          });
        };

        const startRest = () => {
          if (!canStartLowPowerState('rest', now)) {
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          }

          setMotionDuration(0);
          stateControllerRef.current?.transition(PRINCESS_STATES.REST, {
            source: 'automatic',
            duration: getRandomBetween(PET_BEHAVIOR_TIMING.restDuration),
            onComplete: () => finishRest(),
          });
        };

        const startQuiet = () => {
          if (!canStartLowPowerState('quiet', now)) {
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          }

          setMotionDuration(0);
          stateControllerRef.current?.transition(PRINCESS_STATES.QUIET, {
            source: 'automatic',
            duration: getRandomBetween(PET_BEHAVIOR_TIMING.quietDuration),
            onComplete: () => finishQuiet(),
          });
        };

        const startSleep = () => {
          if (!canStartLowPowerState('sleep', now)) {
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          }

          setMotionDuration(0);
          stateControllerRef.current?.transition(PRINCESS_STATES.SLEEP, {
            source: 'automatic',
            duration: getRandomBetween(PET_BEHAVIOR_TIMING.sleepDuration),
            onComplete: () => finishSleep(),
          });
        };

        const startWalk = () => {
          if (!root) {
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          }

          const viewport = getViewportSize();
          const isMobile = viewport.width <= MOBILE_BREAKPOINT;
          const safeArea = getPetSafeArea(viewport.width);
          const size = getPetSize(root);
          const horizontalOverflow = Math.max(0, ((size.width * PET_VISUAL_WIDTH_MULTIPLIER * scaleRef.current) - size.width) / 2);
          const currentX = positionRef.current.x + offsetXRef.current;
          const [minDistance, maxDistance] = isMobile ? MOBILE_WALK_DISTANCE : DESKTOP_WALK_DISTANCE;
          const availableLeft = Math.max(0, currentX - safeArea.left - horizontalOverflow);
          const availableRight = Math.max(0, viewport.width - safeArea.right - horizontalOverflow - size.width - currentX);
          const canWalkLeft = availableLeft >= minDistance;
          const canWalkRight = availableRight >= minDistance;

          if (!canWalkLeft && !canWalkRight) {
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          }

          let nextWalkState: WalkState = Math.random() < 0.5 ? 'walkLeft' : 'walkRight';

          if (!canWalkLeft) nextWalkState = 'walkRight';
          if (!canWalkRight) nextWalkState = 'walkLeft';

          const availableDistance = nextWalkState === 'walkLeft' ? availableLeft : availableRight;
          const distance = Math.min(getRandomBetween([minDistance, maxDistance]), availableDistance);
          const signedDistance = nextWalkState === 'walkLeft' ? -distance : distance;
          const duration = Math.round(getRandomBetween(PET_BEHAVIOR_TIMING.walkDuration));

          const started = stateControllerRef.current?.transition(nextWalkState, {
            source: 'automatic',
            duration,
            onComplete: () => {
              if (playPendingInteraction()) return;
              scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            },
          });
          if (!started) {
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          }

          setMotionDuration(duration);
          setOffsetX((current) => {
            const nextOffset = current + signedDistance;
            offsetXRef.current = nextOffset;
            return nextOffset;
          });
        };

        switch (chosenBehavior) {
          case 'walk':
            startWalk();
            return;
          case 'sit':
            startSit();
            return;
          case 'curious':
            if (!requestCurious('natural')) scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          case 'wave':
            if (!requestWave('natural')) scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          case 'happy':
            if (!requestHappy('natural')) scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          case 'rest':
            startRest();
            return;
          case 'quiet':
            startQuiet();
            return;
          case 'sleep':
            startSleep();
            return;
          case 'idle':
          default:
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
        }
      }, getRandomBetween(delayRange));
    };

    scheduleBehaviorRef.current = scheduleBehavior;
    scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);

    return () => {
      scheduleBehaviorRef.current = null;
      clearBehaviorTimers();
    };
  }, [
    canStartLowPowerState,
    clearBehaviorTimers,
    clearTimer,
    finishQuiet,
    finishRest,
    finishSleep,
    getNaturalBehaviorWeights,
    playPendingInteraction,
    prefersReducedMotion,
    requestCurious,
    requestHappy,
    requestWave,
    setIdleState,
    autoBehaviorEnabled,
    visible,
  ]);

  useEffect(() => {
    if (prefersReducedMotion || !visible || !eventBridge) return undefined;

    return eventBridge.subscribe((request) => {
      if (isDraggingRef.current) return false;
      if (suppressRouteReactionAfterDragRef.current && ['route_enter', 'module_enter', 'subpage_enter'].includes(request.event.type)) {
        suppressRouteReactionAfterDragRef.current = false;
        return false;
      }
      if (request.event.type === 'navigator_question_submitted' || request.event.type === 'navigator_response_started') {
        noteUserInteraction({ immediate: true, type: 'navigatorQuestionSubmitted' });
      }
      if (request.event.type === 'navigator_navigation_completed') {
        noteUserInteraction({ immediate: true, type: 'primaryNavigation' });
      }
      if (request.event.type === 'navigator_response_aborted') {
        const navigatorTransientStates = new Set(['curious', 'sit', 'happy', 'quiet']);
        if (!navigatorTransientStates.has(stateRef.current)) return false;
        const restoreState = selectContextIdleAnimation(
          contextProfileRef.current,
          presenceControllerRef.current?.evaluate('navigator_abort'),
        );
        return stateControllerRef.current?.transition(restoreState, { source: 'presence' }) || false;
      }
      return stateControllerRef.current?.transition(request.state, {
        source: request.canWakeSleeping && stateRef.current === 'sleep' ? 'wake' : 'websiteEvent',
        duration: request.duration,
        resolveCompletionState: () => selectContextIdleAnimation(
          contextProfileRef.current,
          presenceControllerRef.current?.evaluate('transient_complete'),
        ),
      }) || false;
    });
  }, [eventBridge, noteUserInteraction, prefersReducedMotion, visible]);

  useEffect(() => {
    if (prefersReducedMotion || !visible || !interactionEnabled) return undefined;

    const handlePetHappy = () => {
      noteUserInteraction({ immediate: true });
      requestHappy('customEvent');
    };

    window.addEventListener(PET_HAPPY_EVENT, handlePetHappy);

    return () => {
      window.removeEventListener(PET_HAPPY_EVENT, handlePetHappy);
    };
  }, [interactionEnabled, noteUserInteraction, prefersReducedMotion, requestHappy, visible]);

  useEffect(() => {
    if (prefersReducedMotion || !visible || !interactionEnabled) return undefined;

    const handlePetCurious = () => {
      noteUserInteraction({ immediate: true });
      requestCurious('customEvent');
    };

    window.addEventListener(PET_CURIOUS_EVENT, handlePetCurious);

    return () => {
      window.removeEventListener(PET_CURIOUS_EVENT, handlePetCurious);
    };
  }, [interactionEnabled, noteUserInteraction, prefersReducedMotion, requestCurious, visible]);

  useEffect(() => {
    if (prefersReducedMotion || !visible || !interactionEnabled) return undefined;

    const handlePetAffection = () => {
      noteUserInteraction({ immediate: true });
      requestAffection('customEvent');
    };

    window.addEventListener(PET_AFFECTION_EVENT, handlePetAffection);

    return () => {
      window.removeEventListener(PET_AFFECTION_EVENT, handlePetAffection);
    };
  }, [interactionEnabled, noteUserInteraction, prefersReducedMotion, requestAffection, visible]);

  useEffect(() => {
    if (prefersReducedMotion || !visible) return undefined;

    let lastScrollAt = 0;
    const isPassiveControl = (event: Event) => (
      event.target instanceof Element
      && Boolean(event.target.closest('[data-princess-passive-control="true"]'))
    );
    const handlePointerActivity = (event: PointerEvent) => {
      if (isPassiveControl(event)) return;
      noteUserInteraction({ immediate: true, type: 'pointerDown' });
    };
    const handleTouchActivity = (event: TouchEvent) => {
      if (isPassiveControl(event)) return;
      noteUserInteraction({ immediate: true, type: 'touchStart' });
    };
    const handleKeyboardActivity = (event: KeyboardEvent) => {
      if (isPassiveControl(event)) return;
      noteUserInteraction({ immediate: true, type: 'keyDown' });
    };
    const handleScrollActivity = () => {
      const now = Date.now();
      if (now - lastScrollAt < PRINCESS_PRESENCE_TIMING.meaningfulScrollThrottle) return;
      lastScrollAt = now;
      noteUserInteraction({ immediate: true, type: 'meaningfulScroll', wake: false });
    };

    window.addEventListener('pointerdown', handlePointerActivity, { passive: true });
    window.addEventListener('touchstart', handleTouchActivity, { passive: true });
    window.addEventListener('keydown', handleKeyboardActivity);
    window.addEventListener('scroll', handleScrollActivity, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerActivity);
      window.removeEventListener('touchstart', handleTouchActivity);
      window.removeEventListener('keydown', handleKeyboardActivity);
      window.removeEventListener('scroll', handleScrollActivity);
    };
  }, [noteUserInteraction, prefersReducedMotion, visible]);

  useEffect(() => {
    const controller = presenceControllerRef.current;
    if (!controller) return undefined;
    const handleVisibility = () => controller.setVisibility(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility();
    if (visible && autoBehaviorEnabled && !prefersReducedMotion) controller.start();
    else controller.stop();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      controller.stop();
    };
  }, [autoBehaviorEnabled, prefersReducedMotion, visible]);

  useEffect(() => {
    if (!prefersReducedMotion) return;

    pendingInteractionRef.current = null;
    clearPetTimers();
    setIdleState();
    setMotionDuration(0);
  }, [clearPetTimers, prefersReducedMotion, setIdleState]);

  useEffect(() => () => {
    scheduleBehaviorRef.current = null;
    clearPetTimers();
    stateControllerRef.current?.dispose();
    presenceControllerRef.current?.dispose();
  }, [clearPetTimers]);

  const handlePointerEnter = useCallback(() => {
    if (!interactionEnabled || isDraggingRef.current) return;

    if (stateRef.current === 'quiet') {
      clearTimer(quietInteractionTimeoutRef);
      quietInteractionTimeoutRef.current = window.setTimeout(() => {
        if (stateRef.current === 'quiet') {
          finishQuiet();
        }
      }, getRandomBetween(QUIET_HOVER_WAKE_DELAY));
      return;
    }

  }, [clearTimer, finishQuiet, interactionEnabled]);

  const handlePetClick = useCallback(() => {
    if (!interactionEnabled || prefersReducedMotion || isDraggingRef.current) return;

    noteUserInteraction({ immediate: true });

    if (stateRef.current === 'quiet') {
      finishQuiet({ schedule: false, playPending: false });
      clearTimer(interactionWakeTimeoutRef);
      interactionWakeTimeoutRef.current = window.setTimeout(() => {
        interactionWakeTimeoutRef.current = null;
        if (!requestHappy('interaction')) {
          scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
        }
      }, 300);
      return;
    }

    if (stateRef.current === 'sleep') {
      finishSleep({ schedule: false, playPending: false });
      clearTimer(interactionWakeTimeoutRef);
      interactionWakeTimeoutRef.current = window.setTimeout(() => {
        interactionWakeTimeoutRef.current = null;
        const preferredInteraction = Math.random() < 0.7 ? 'happy' : 'wave';
        const played = preferredInteraction === 'happy'
          ? requestHappy('interaction') || requestWave('interaction')
          : requestWave('interaction') || requestHappy('interaction');

        if (!played) {
          scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
        }
      }, SLEEP_WAKE_INTERACTION_DELAY);
      return;
    }

    const now = Date.now();
    const isRepeatPetClick = now - lastPetClickAtRef.current <= REPEAT_CLICK_AFFECTION_WINDOW;
    lastPetClickAtRef.current = now;

    if (isRepeatPetClick) {
      const preferAffection = Math.random() < 0.5;
      const played = preferAffection
        ? requestAffection('interaction') || requestHappy('interaction')
        : requestHappy('interaction') || requestAffection('interaction');

      if (played) return;
    }

    const preferredInteraction = nextClickInteractionRef.current;
    const alternateInteraction = preferredInteraction === 'wave' ? 'happy' : 'wave';
    const requestInteraction = (interaction: PlayfulInteraction) => (
      interaction === 'wave' ? requestWave('interaction') : requestHappy('interaction')
    );

    if (requestInteraction(preferredInteraction)) {
      nextClickInteractionRef.current = alternateInteraction;
      return;
    }

    if (requestInteraction(alternateInteraction)) {
      nextClickInteractionRef.current = preferredInteraction;
      return;
    }

    scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
  }, [
    clearTimer,
    finishQuiet,
    finishSleep,
    interactionEnabled,
    noteUserInteraction,
    prefersReducedMotion,
    requestAffection,
    requestHappy,
    requestWave,
  ]);

  const scheduleSingleClick = useCallback(() => {
    clearTimer(singleClickTimeoutRef);
    singleClickTimeoutRef.current = window.setTimeout(() => {
      singleClickTimeoutRef.current = null;
      handlePetClick();
    }, SINGLE_CLICK_DELAY);
  }, [clearTimer, handlePetClick]);

  const resetPosition = useCallback(() => {
    clearPrincessPosition(getPrincessStorage(typeof window === 'undefined' ? null : window));
    settleWalkOffset();

    const nextPosition = getDefaultPetPosition(rootRef.current, scaleRef.current);
    positionRef.current = nextPosition;
    setPosition(nextPosition);
  }, [settleWalkOffset]);

  const resetSize = useCallback(() => {
    clearPrincessScale(getPrincessStorage(typeof window === 'undefined' ? null : window));
    clearTimer(scaleSaveTimeoutRef);
    applyScale(PET_SCALE.default);
  }, [applyScale, clearTimer]);

  const resetLayout = useCallback(() => {
    clearStoredPetLayout();
    resetSize();
    resetPosition();
  }, [resetPosition, resetSize]);

  useEffect(() => {
    if (previousResetSizeTokenRef.current === resetSizeToken) return;
    previousResetSizeTokenRef.current = resetSizeToken;
    resetSize();
  }, [resetSize, resetSizeToken]);

  useEffect(() => {
    if (previousResetPositionTokenRef.current === resetPositionToken) return;
    previousResetPositionTokenRef.current = resetPositionToken;
    resetPosition();
  }, [resetPosition, resetPositionToken]);

  const handleDoubleClick = useCallback((altKey: boolean) => {
    noteUserInteraction({ immediate: true });
    clearTimer(singleClickTimeoutRef);

    if (altKey) {
      resetLayout();

      if (!prefersReducedMotion && stateRef.current === 'idle') {
        requestHappy('interaction') || requestWave('interaction');
      }

      return;
    }

    settleWalkOffset();
    const sizes = PET_SCALE.doubleClickSizes;
    const currentScale = scaleRef.current;
    const nextPreset = sizes.find((size) => size > currentScale + 0.03) ?? sizes[0];
    const nextScale = applyScale(nextPreset);
    clearTimer(scaleSaveTimeoutRef);
    writeStoredScale(nextScale);
  }, [
    applyScale,
    clearTimer,
    noteUserInteraction,
    prefersReducedMotion,
    requestHappy,
    requestWave,
    resetLayout,
    settleWalkOffset,
  ]);

  const queueDragPosition = useCallback((nextPosition: PetPosition) => {
    pendingDragPositionRef.current = nextPosition;

    if (dragAnimationFrameRef.current !== null) return;

    dragAnimationFrameRef.current = window.requestAnimationFrame(() => {
      dragAnimationFrameRef.current = null;
      const pendingPosition = pendingDragPositionRef.current;
      if (!pendingPosition) return;

      positionRef.current = pendingPosition;
      setPosition(pendingPosition);
    });
  }, []);

  const beginDrag = useCallback(() => {
    noteUserInteraction({ immediate: true, type: 'princessDragStart' });
    isDraggingRef.current = true;
    setIsDragging(true);
    clearTimer(longPressTimeoutRef);
    clearBehaviorTimers();
    pendingInteractionRef.current = null;
    stateControllerRef.current?.startDrag();
    setFrameIndex(0);
    setBlinkSrc(null);
    setMotionDuration(0);
  }, [clearBehaviorTimers, clearTimer, noteUserInteraction]);

  const endDrag = useCallback((nextPosition: PetPosition, options: { resume?: boolean } = {}) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    stateControllerRef.current?.endDrag();
    positionRef.current = nextPosition;
    setPosition(nextPosition);
    writeStoredPosition(nextPosition);
    presenceControllerRef.current?.evaluate('drag_complete');
    stateControllerRef.current?.transition(
      selectContextIdleAnimation(contextProfileRef.current, presenceControllerRef.current?.getPersistentState()),
      { source: 'presence' },
    );

    if (prefersReducedMotion || options.resume === false) {
      scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
      return;
    }

    clearTimer(dragResumeTimeoutRef);
    dragResumeTimeoutRef.current = window.setTimeout(() => {
      dragResumeTimeoutRef.current = null;
      if (Math.random() < 0.4 && requestAffection('drag')) return;
      if (Math.random() < 0.3 && requestCurious('drag')) return;
      scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
    }, getRandomBetween(PET_BEHAVIOR_TIMING.dragResumeDelay));
  }, [clearTimer, prefersReducedMotion, requestAffection, requestCurious, setIdleState]);

  useEffect(() => {
    if (visible) {
      setIdleState();
      return;
    }

    const dragSession = dragSessionRef.current;
    dragSessionRef.current = null;
    pendingInteractionRef.current = null;
    pendingDragPositionRef.current = null;
    longPressTriggeredRef.current = false;

    if (dragSession && interactiveRef.current?.hasPointerCapture(dragSession.pointerId)) {
      interactiveRef.current.releasePointerCapture(dragSession.pointerId);
    }

    if (scaleSaveTimeoutRef.current !== null) {
      writeStoredScale(scaleRef.current);
    }

    isDraggingRef.current = false;
    setIsDragging(false);
    stateControllerRef.current?.endDrag();
    clearPetTimers();
    setIdleState();
  }, [clearPetTimers, setIdleState, visible]);

  useEffect(() => {
    if (autoBehaviorEnabled || !visible) return;

    pendingInteractionRef.current = null;
    clearBehaviorTimers();
    stateControllerRef.current?.cancelCompletion();
    if (!isDraggingRef.current) setIdleState();
  }, [autoBehaviorEnabled, clearBehaviorTimers, setIdleState, visible]);

  useEffect(() => {
    if (interactionEnabled) return;

    clearTimer(longPressTimeoutRef);
    clearTimer(singleClickTimeoutRef);
    longPressTriggeredRef.current = false;
    pendingInteractionRef.current = null;

    if (PRINCESS_STATE_GROUPS.INTERACTION.includes(stateRef.current)) {
      stateControllerRef.current?.cancelCompletion();
      setIdleState();
    }
  }, [clearTimer, interactionEnabled, setIdleState]);

  useEffect(() => {
    if (previousNavigationKeyRef.current === navigationKey) return;
    previousNavigationKeyRef.current = navigationKey;

    const dragSession = dragSessionRef.current;
    if (!dragSession) return;

    dragSessionRef.current = null;
    suppressNativeClickRef.current = true;
    clearTimer(longPressTimeoutRef);
    clearTimer(singleClickTimeoutRef);

    const interactiveNode = interactiveRef.current;
    if (interactiveNode?.hasPointerCapture(dragSession.pointerId)) {
      interactiveNode.releasePointerCapture(dragSession.pointerId);
    }

    if (dragAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }

    const safePosition = pendingDragPositionRef.current || positionRef.current;
    pendingDragPositionRef.current = null;

    if (dragSession.dragging || isDraggingRef.current) {
      suppressRouteReactionAfterDragRef.current = true;
      endDrag(safePosition, { resume: false });
      clearTimer(dragResumeTimeoutRef);
      dragResumeTimeoutRef.current = window.setTimeout(() => {
        dragResumeTimeoutRef.current = null;
        stateControllerRef.current?.transition(PRINCESS_STATES.IDLE, { source: 'drag' });
      }, 0);
      return;
    }

    scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
  }, [clearTimer, endDrag, navigationKey]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    noteUserInteraction({ immediate: true });
    clearTimer(singleClickTimeoutRef);
    clearTimer(dragResumeTimeoutRef);
    clearTimer(behaviorTimeoutRef);
    clearTimer(longPressTimeoutRef);
    longPressTriggeredRef.current = false;
    settleWalkOffset();

    const originPosition = positionRef.current;
    dragSessionRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originPosition,
      dragging: false,
      altKey: event.altKey,
    };

    if (interactionEnabled && !prefersReducedMotion) {
      const pointerId = event.pointerId;

      longPressTimeoutRef.current = window.setTimeout(() => {
        longPressTimeoutRef.current = null;

        const activeSession = dragSessionRef.current;
        if (!activeSession || activeSession.pointerId !== pointerId || activeSession.dragging || isDraggingRef.current) {
          return;
        }

        longPressTriggeredRef.current = true;
        suppressNativeClickRef.current = true;
        requestAffection('longPress');
      }, getRandomBetween(LONG_PRESS_DELAY));
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  }, [clearTimer, interactionEnabled, noteUserInteraction, prefersReducedMotion, requestAffection, settleWalkOffset]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragSession = dragSessionRef.current;
    if (!dragSession || dragSession.pointerId !== event.pointerId) return;

    const distanceX = event.clientX - dragSession.startClientX;
    const distanceY = event.clientY - dragSession.startClientY;
    const movedDistance = Math.hypot(distanceX, distanceY);

    if (!dragSession.dragging && movedDistance > DRAG_CLICK_THRESHOLD) {
      dragSession.dragging = true;
      beginDrag();
    }

    if (!dragSession.dragging) return;

    event.preventDefault();
    const nextPosition = clampPetPosition({
      x: dragSession.originPosition.x + distanceX,
      y: dragSession.originPosition.y + distanceY,
    }, scaleRef.current, rootRef.current);

    queueDragPosition(nextPosition);
  }, [beginDrag, queueDragPosition]);

  const finishPointerSession = useCallback((event: ReactPointerEvent<HTMLButtonElement>, options: { cancelled?: boolean } = {}) => {
    const dragSession = dragSessionRef.current;
    if (!dragSession || dragSession.pointerId !== event.pointerId) return;

    dragSessionRef.current = null;
    suppressNativeClickRef.current = true;
    clearTimer(longPressTimeoutRef);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }

    const distanceX = event.clientX - dragSession.startClientX;
    const distanceY = event.clientY - dragSession.startClientY;
    const movedDistance = Math.hypot(distanceX, distanceY);
    const gesture = classifyPrincessPointerGesture({
      movedDistance,
      dragThreshold: DRAG_CLICK_THRESHOLD,
      longPressTriggered: longPressTriggeredRef.current,
      cancelled: options.cancelled === true,
    });
    const finalPosition = clampPetPosition({
      x: dragSession.originPosition.x + distanceX,
      y: dragSession.originPosition.y + distanceY,
    }, scaleRef.current, rootRef.current);

    if (gesture === 'drag') {
      pendingDragPositionRef.current = null;
      endDrag(finalPosition);
      return;
    }

    if (gesture === 'cancel') {
      pendingDragPositionRef.current = null;
      if (dragSession.dragging || isDraggingRef.current) {
        endDrag(finalPosition, { resume: false });
      }
      scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
      return;
    }

    if (gesture === 'longPress') {
      longPressTriggeredRef.current = false;
      scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
      return;
    }

    if (!interactionEnabled) {
      lastPointerClickAtRef.current = 0;
      scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
      return;
    }

    const now = Date.now();
    const isDoubleClick = now - lastPointerClickAtRef.current <= DOUBLE_CLICK_WINDOW;
    lastPointerClickAtRef.current = now;

    if (isDoubleClick) {
      handleDoubleClick(event.altKey || dragSession.altKey);
      return;
    }

    scheduleSingleClick();
  }, [clearTimer, endDrag, handleDoubleClick, interactionEnabled, scheduleSingleClick]);

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    finishPointerSession(event);
  }, [finishPointerSession]);

  const handlePointerCancel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    finishPointerSession(event, { cancelled: true });
  }, [finishPointerSession]);

  const handlePointerLeave = useCallback(() => {
    clearTimer(longPressTimeoutRef);
  }, [clearTimer]);

  const handlePetWheel = useCallback((event: WheelEvent) => {
    if (!interactionEnabled) return;

    event.preventDefault();
    event.stopPropagation();

    noteUserInteraction({ immediate: true });
    clearTimer(behaviorTimeoutRef);
    settleWalkOffset();

    const direction = event.deltaY < 0 ? 1 : -1;
    applyScale(scaleRef.current + direction * PET_SCALE.wheelStep, { persist: true });
  }, [applyScale, clearTimer, interactionEnabled, noteUserInteraction, settleWalkOffset]);

  useEffect(() => {
    const interactiveNode = interactiveRef.current;
    if (!interactiveNode || !interactionEnabled || !visible) return undefined;

    interactiveNode.addEventListener('wheel', handlePetWheel, { passive: false });

    return () => {
      interactiveNode.removeEventListener('wheel', handlePetWheel);
    };
  }, [handlePetWheel, interactionEnabled, visible]);

  const handleNativeClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    if (suppressNativeClickRef.current) {
      suppressNativeClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (interactionEnabled) handlePetClick();
  }, [handlePetClick, interactionEnabled]);

  const handleFrameError = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const fallbackFrame = princessAnimations.idle.frames[0];
    if (new URL(event.currentTarget.src, window.location.href).pathname === fallbackFrame) return;
    event.currentTarget.src = fallbackFrame;
  }, []);

  if (!visible) return null;

  const interactionLabel = PET_INTERACTION_LABELS[lang] || PET_INTERACTION_LABELS.en;

  const rootStyle = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
  } as CSSProperties;

  const walkStyle = {
    '--princess-pet-motion-duration': `${motionDuration}ms`,
    transform: `translateX(${offsetX}px)`,
  } as CSSProperties;

  const scaleStyle = {
    transform: `scale(${scale})`,
  } as CSSProperties;

  const aliveClassName = [
    styles.aliveLayer,
    isDragging
      ? styles.draggingAlive
      : petState === 'idle'
        ? styles.idleAlive
        : petState === 'sit'
          ? styles.sitAlive
          : petState === 'wave'
            ? styles.waveAlive
            : petState === 'happy'
              ? styles.happyAlive
              : petState === 'rest'
                ? styles.restAlive
              : petState === 'quiet'
                ? styles.quietAlive
              : petState === 'sleep'
                  ? styles.sleepAlive
                  : petState === 'curious'
                    ? styles.curiousAlive
                    : petState === 'affection'
                      ? styles.affectionAlive
                      : styles.walkAlive,
  ].join(' ');

  const imageClassName = [
    styles.image,
    petState === 'walkLeft' ? styles.flipped : '',
  ].filter(Boolean).join(' ');
  const debugInfo = PET_DEBUG
    ? [
      `state: ${petState}`,
      `pending: ${pendingInteractionRef.current || 'none'}`,
      `scale: ${scale.toFixed(2)}`,
      `position: ${Math.round(position.x)},${Math.round(position.y)}`,
      `inactive: ${Math.round((Date.now() - lastUserInteractionAtRef.current) / 1000)}s`,
      `frame: ${currentFrame.split('/').pop()?.replace('.png', '') || currentFrame}`,
    ].join(' | ')
    : null;

  return (
    <div
      ref={rootRef}
      className={[styles.root, isDragging ? styles.dragging : ''].filter(Boolean).join(' ')}
      style={rootStyle}
      data-pet-state={petState}
      data-pet-dragging={isDragging ? 'true' : 'false'}
      data-pet-scale={scale.toFixed(2)}
      data-pet-auto-behavior={autoBehaviorEnabled ? 'true' : 'false'}
      data-pet-interaction={interactionEnabled ? 'true' : 'false'}
      data-princess-context={contextProfile.id}
    >
      <div className={styles.walkOffsetLayer} style={walkStyle}>
        <div className={styles.scaleLayer} style={scaleStyle}>
          <div className={aliveClassName} data-state={petState}>
            <div className={styles.frameLayer}>
              <button
                ref={interactiveRef}
                type="button"
                data-testid="princess-interactive"
                className={styles.interactiveLayer}
                aria-label={interactionEnabled ? interactionLabel.enabled : interactionLabel.disabled}
                onPointerEnter={handlePointerEnter}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onPointerLeave={handlePointerLeave}
                onClick={handleNativeClick}
              >
                <img
                  className={imageClassName}
                  src={currentFrame}
                  alt=""
                  draggable="false"
                  decoding="async"
                  onError={handleFrameError}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      {debugInfo ? <div className={styles.debugLabel}>{debugInfo}</div> : null}
    </div>
  );
}
