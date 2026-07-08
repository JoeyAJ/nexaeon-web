import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PET_HAPPY_EVENT } from '../lib/petEvents.js';
import { princessAnimations } from '../lib/princessPetAnimations';
import styles from './PrincessPet.module.css';

type PetState = keyof typeof princessAnimations;
type WalkState = 'walkLeft' | 'walkRight';
type PendingInteraction = 'wave' | 'happy' | null;
type PetPosition = {
  x: number;
  y: number;
};
type PetScale = number;
type NaturalBehavior = 'idle' | 'walk' | 'sit' | 'wave' | 'happy' | 'rest' | 'quiet' | 'sleep';
type LowPowerState = 'rest' | 'quiet' | 'sleep';

const PET_DEBUG = false;
const WAVE_GREETING_STORAGE_KEY = 'nexaeon-princess-wave-greeted';
const POSITION_STORAGE_KEY = 'nexaeon-princess-pet-position';
const SCALE_STORAGE_KEY = 'nexaeon-princess-pet-scale';

const PET_BEHAVIOR_TIMING = {
  initialGreetingDelay: [2_500, 4_500],
  idleNextBehaviorDelay: [12_000, 26_000],
  dragResumeDelay: [1_500, 3_000],

  walkDuration: [1_600, 2_600],
  sitDuration: [9_000, 18_000],
  restDuration: [18_000, 36_000],
  quietDuration: [12_000, 24_000],
  sleepDuration: [30_000, 70_000],
  waveDuration: [1_200, 2_000],
  happyDuration: [1_400, 2_400],

  minTimeBeforeRest: 90_000,
  minTimeBeforeQuiet: 150_000,
  minTimeBeforeSleep: 240_000,

  restCooldown: 120_000,
  quietCooldown: 150_000,
  sleepCooldown: 240_000,

  interactionCooldown: 10_000,
  waveCooldown: 12_000,
  happyCooldown: 10_000,
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
    { behavior: 'idle', weight: 55 },
    { behavior: 'walk', weight: 20 },
    { behavior: 'sit', weight: 15 },
    { behavior: 'wave', weight: 7 },
    { behavior: 'happy', weight: 3 },
  ],
  restReady: [
    { behavior: 'idle', weight: 45 },
    { behavior: 'walk', weight: 18 },
    { behavior: 'sit', weight: 17 },
    { behavior: 'rest', weight: 10 },
    { behavior: 'wave', weight: 6 },
    { behavior: 'happy', weight: 4 },
  ],
  quietReady: [
    { behavior: 'idle', weight: 40 },
    { behavior: 'walk', weight: 15 },
    { behavior: 'sit', weight: 15 },
    { behavior: 'rest', weight: 12 },
    { behavior: 'quiet', weight: 8 },
    { behavior: 'wave', weight: 5 },
    { behavior: 'happy', weight: 5 },
  ],
  sleepReady: [
    { behavior: 'idle', weight: 35 },
    { behavior: 'walk', weight: 13 },
    { behavior: 'sit', weight: 12 },
    { behavior: 'rest', weight: 12 },
    { behavior: 'quiet', weight: 8 },
    { behavior: 'sleep', weight: 6 },
    { behavior: 'wave', weight: 7 },
    { behavior: 'happy', weight: 7 },
  ],
};

const DESKTOP_WALK_DISTANCE = [24, 56] as const;
const MOBILE_WALK_DISTANCE = [12, 28] as const;
const MOBILE_BREAKPOINT = 520;
const USER_ACTIVITY_THROTTLE = 1_500;
const QUIET_HOVER_WAKE_DELAY = [300, 600] as const;
const SLEEP_HOVER_WAKE_DELAY = [800, 1_200] as const;
const SLEEP_WAKE_INTERACTION_DELAY = 400;
const CUSTOM_EVENT_COOLDOWN = 8_000;
const LOW_POWER_STATE_GAP = 45_000;
const POST_SLEEP_LOW_POWER_GAP = 90_000;
const DRAG_CLICK_THRESHOLD = 7;
const SINGLE_CLICK_DELAY = 220;
const DOUBLE_CLICK_WINDOW = 320;
const PET_VISUAL_WIDTH_MULTIPLIER = 1.42;
const PET_ASPECT_RATIO = 1.56;

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
  return 12_000 + Math.random() * 8_000;
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
  const visualWidth = size.width * PET_VISUAL_WIDTH_MULTIPLIER * scale;
  const horizontalOverflow = Math.max(0, (visualWidth - size.width) / 2);
  const topOverflow = Math.max(0, size.height * scale - size.height);
  const minX = safeArea.left + horizontalOverflow;
  const maxX = viewport.width - safeArea.right - size.width - horizontalOverflow;
  const minY = safeArea.top + topOverflow;
  const maxY = viewport.height - safeArea.bottom - size.height;

  return {
    x: maxX < minX ? Math.max(12, (viewport.width - size.width) / 2) : clampNumber(position.x, minX, maxX),
    y: maxY < minY ? Math.max(12, (viewport.height - size.height) / 2) : clampNumber(position.y, minY, maxY),
  };
}

function getDefaultPetPosition(root: HTMLDivElement | null, scale: PetScale): PetPosition {
  const viewport = getViewportSize();
  const size = getPetSize(root);
  const margins = getDefaultPetMargins(viewport.width, viewport.height);

  return clampPetPosition({
    x: viewport.width - margins.right - size.width,
    y: viewport.height - margins.bottom - size.height,
  }, scale, root);
}

function readStoredPosition() {
  if (typeof window === 'undefined') return null;

  try {
    const payload = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (!payload) return null;
    const parsed = JSON.parse(payload) as Partial<PetPosition>;
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    return { x: Number(parsed.x), y: Number(parsed.y) };
  } catch {
    return null;
  }
}

function readStoredScale() {
  if (typeof window === 'undefined') return null;

  try {
    const payload = window.localStorage.getItem(SCALE_STORAGE_KEY);
    if (!payload) return null;
    const parsed = JSON.parse(payload) as Partial<{ scale: number }>;
    if (!Number.isFinite(parsed.scale)) return null;
    return Number(parsed.scale);
  } catch {
    return null;
  }
}

function writeStoredPosition(position: PetPosition) {
  try {
    window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Position memory is a convenience; the pet should keep working without storage.
  }
}

function writeStoredScale(scale: PetScale) {
  try {
    window.localStorage.setItem(SCALE_STORAGE_KEY, JSON.stringify({ scale }));
  } catch {
    // Scale memory is a convenience; the pet should keep working without storage.
  }
}

function clearStoredPetLayout() {
  try {
    window.localStorage.removeItem(POSITION_STORAGE_KEY);
    window.localStorage.removeItem(SCALE_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
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

export default function PrincessPet() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [petState, setPetState] = useState<PetState>('idle');
  const animation = princessAnimations[petState];
  const normalFrames = animation.frames;
  const blinkFrame = petState === 'idle' ? princessAnimations.idle.blinkFrames?.[0] || null : null;
  const [frameIndex, setFrameIndex] = useState(0);
  const [blinkSrc, setBlinkSrc] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [motionDuration, setMotionDuration] = useState(0);
  const [position, setPosition] = useState<PetPosition>(() => getDefaultPetPosition(null, PET_SCALE.default));
  const [scale, setScale] = useState<PetScale>(PET_SCALE.default);
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
  const walkEndTimeoutRef = useRef<number | null>(null);
  const sitEndTimeoutRef = useRef<number | null>(null);
  const restEndTimeoutRef = useRef<number | null>(null);
  const restInteractionTimeoutRef = useRef<number | null>(null);
  const sleepEndTimeoutRef = useRef<number | null>(null);
  const sleepInteractionTimeoutRef = useRef<number | null>(null);
  const quietEndTimeoutRef = useRef<number | null>(null);
  const quietInteractionTimeoutRef = useRef<number | null>(null);
  const interactionWakeTimeoutRef = useRef<number | null>(null);
  const waveEndTimeoutRef = useRef<number | null>(null);
  const happyEndTimeoutRef = useRef<number | null>(null);
  const initialWaveTimeoutRef = useRef<number | null>(null);
  const dragResumeTimeoutRef = useRef<number | null>(null);
  const singleClickTimeoutRef = useRef<number | null>(null);
  const scaleSaveTimeoutRef = useRef<number | null>(null);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const pendingDragPositionRef = useRef<PetPosition | null>(null);
  const suppressNativeClickRef = useRef(false);
  const lastPointerClickAtRef = useRef(0);
  const waveAllowedAtRef = useRef(0);
  const happyAllowedAtRef = useRef(0);
  const customEventAllowedAtRef = useRef(0);
  const restAllowedAtRef = useRef(Date.now() + PET_BEHAVIOR_TIMING.minTimeBeforeRest);
  const sleepAllowedAtRef = useRef(Date.now() + PET_BEHAVIOR_TIMING.minTimeBeforeSleep);
  const quietAllowedAtRef = useRef(Date.now() + PET_BEHAVIOR_TIMING.minTimeBeforeQuiet);
  const restEndedAtRef = useRef(0);
  const sleepEndedAtRef = useRef(0);
  const quietEndedAtRef = useRef(0);
  const lastPlayfulInteractionAtRef = useRef(0);
  const pageLoadedAtRef = useRef(Date.now());
  const lastUserInteractionAtRef = useRef(Date.now());
  const lastThrottledActivityAtRef = useRef(0);
  const pendingInteractionRef = useRef<PendingInteraction>(null);
  const nextClickInteractionRef = useRef<Exclude<PendingInteraction, null>>('wave');
  const scheduleBehaviorRef = useRef<((delayRange: readonly [number, number]) => void) | null>(null);
  const dragSessionRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originPosition: PetPosition;
    dragging: boolean;
    altKey: boolean;
  } | null>(null);

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

  useEffect(() => {
    stateRef.current = petState;
  }, [petState]);

  const clearTimer = useCallback((timerRef: { current: number | null }) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearBehaviorTimers = useCallback(() => {
    clearTimer(behaviorTimeoutRef);
    clearTimer(walkEndTimeoutRef);
    clearTimer(sitEndTimeoutRef);
    clearTimer(restEndTimeoutRef);
    clearTimer(restInteractionTimeoutRef);
    clearTimer(sleepEndTimeoutRef);
    clearTimer(sleepInteractionTimeoutRef);
    clearTimer(quietEndTimeoutRef);
    clearTimer(quietInteractionTimeoutRef);
    clearTimer(interactionWakeTimeoutRef);
    clearTimer(waveEndTimeoutRef);
    clearTimer(happyEndTimeoutRef);
    clearTimer(dragResumeTimeoutRef);
  }, [clearTimer]);

  const clearPetTimers = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    clearTimer(blinkTimeoutRef);
    clearTimer(blinkResetRef);
    clearTimer(initialWaveTimeoutRef);
    clearTimer(singleClickTimeoutRef);
    clearTimer(scaleSaveTimeoutRef);
    clearBehaviorTimers();

    if (dragAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }
  }, [clearBehaviorTimers, clearTimer]);

  const noteUserInteraction = useCallback((options: { immediate?: boolean } = {}) => {
    const now = Date.now();

    if (!options.immediate && now - lastThrottledActivityAtRef.current < USER_ACTIVITY_THROTTLE) {
      return;
    }

    lastThrottledActivityAtRef.current = now;
    lastUserInteractionAtRef.current = now;
  }, []);

  const setIdleState = useCallback(() => {
    stateRef.current = 'idle';
    setPetState('idle');
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

  const playWave = useCallback(() => {
    if (prefersReducedMotion || isDraggingRef.current || stateRef.current !== 'idle') return false;

    clearTimer(behaviorTimeoutRef);
    setBlinkSrc(null);
    setMotionDuration(0);
    setFrameIndex(0);
    stateRef.current = 'wave';
    setPetState('wave');
    lastPlayfulInteractionAtRef.current = Date.now();

    clearTimer(waveEndTimeoutRef);

    waveEndTimeoutRef.current = window.setTimeout(() => {
      setIdleState();
      scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
    }, getRandomBetween(PET_BEHAVIOR_TIMING.waveDuration));

    return true;
  }, [clearTimer, prefersReducedMotion, setIdleState]);

  const playHappy = useCallback(() => {
    if (prefersReducedMotion || isDraggingRef.current || stateRef.current !== 'idle') return false;

    clearTimer(behaviorTimeoutRef);
    setBlinkSrc(null);
    setMotionDuration(0);
    setFrameIndex(0);
    stateRef.current = 'happy';
    setPetState('happy');
    lastPlayfulInteractionAtRef.current = Date.now();

    clearTimer(happyEndTimeoutRef);

    happyEndTimeoutRef.current = window.setTimeout(() => {
      setIdleState();
      scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
    }, getRandomBetween(PET_BEHAVIOR_TIMING.happyDuration));

    return true;
  }, [clearTimer, prefersReducedMotion, setIdleState]);

  const playPendingInteraction = useCallback(() => {
    const pendingInteraction = pendingInteractionRef.current;
    if (!pendingInteraction) return false;

    pendingInteractionRef.current = null;
    return pendingInteraction === 'wave' ? playWave() : playHappy();
  }, [playHappy, playWave]);

  const finishSleep = useCallback((options: { schedule?: boolean; playPending?: boolean } = {}) => {
    clearTimer(sleepEndTimeoutRef);
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
    clearTimer(quietEndTimeoutRef);
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
    clearTimer(restEndTimeoutRef);
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

  const requestWave = useCallback((source: 'greeting' | 'interaction' | 'natural') => {
    if (prefersReducedMotion || isDraggingRef.current) return false;

    const currentState = stateRef.current;
    if (currentState === 'wave' || currentState === 'happy') return false;

    const now = Date.now();
    if (source !== 'greeting') {
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

    if (currentState === 'quiet') {
      if (source === 'natural') return false;

      finishQuiet({ schedule: false, playPending: false });

      if (isHappyCoolingDown || isCustomEventCoolingDown) {
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

      if (isHappyCoolingDown || isCustomEventCoolingDown) {
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

    if (isHappyCoolingDown || isCustomEventCoolingDown) return false;

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
    const restoredScale = clampPetScale(readStoredScale() ?? PET_SCALE.default);
    const restoredPosition = readStoredPosition();
    const nextPosition = restoredPosition
      ? clampPetPosition(restoredPosition, restoredScale, rootRef.current)
      : getDefaultPetPosition(rootRef.current, restoredScale);

    scaleRef.current = restoredScale;
    positionRef.current = nextPosition;
    setScale(restoredScale);
    setPosition(nextPosition);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const clampedScale = clampPetScale(scaleRef.current);
      scaleRef.current = clampedScale;
      setScale(clampedScale);

      const nextPosition = clampPetPosition(positionRef.current, clampedScale, rootRef.current);
      positionRef.current = nextPosition;
      setPosition(nextPosition);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setPetState('idle');
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
  }, [animation.fps, animation.loop, normalFrames.length, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !blinkFrame) return undefined;

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
  }, [blinkFrame, clearTimer, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

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
          setBlinkSrc(null);
          setMotionDuration(0);
          stateRef.current = 'sit';
          setPetState('sit');
          setFrameIndex(0);

          clearTimer(sitEndTimeoutRef);
          sitEndTimeoutRef.current = window.setTimeout(() => {
            setIdleState();
            if (playPendingInteraction()) return;
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
          }, getRandomBetween(PET_BEHAVIOR_TIMING.sitDuration));
        };

        const startRest = () => {
          if (!canStartLowPowerState('rest', now)) {
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          }

          setBlinkSrc(null);
          setMotionDuration(0);
          stateRef.current = 'rest';
          setPetState('rest');
          setFrameIndex(0);

          clearTimer(restEndTimeoutRef);
          restEndTimeoutRef.current = window.setTimeout(() => {
            finishRest();
          }, getRandomBetween(PET_BEHAVIOR_TIMING.restDuration));
        };

        const startQuiet = () => {
          if (!canStartLowPowerState('quiet', now)) {
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          }

          setBlinkSrc(null);
          setMotionDuration(0);
          stateRef.current = 'quiet';
          setPetState('quiet');
          setFrameIndex(0);

          clearTimer(quietEndTimeoutRef);
          quietEndTimeoutRef.current = window.setTimeout(() => {
            finishQuiet();
          }, getRandomBetween(PET_BEHAVIOR_TIMING.quietDuration));
        };

        const startSleep = () => {
          if (!canStartLowPowerState('sleep', now)) {
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
            return;
          }

          setBlinkSrc(null);
          setMotionDuration(0);
          stateRef.current = 'sleep';
          setPetState('sleep');
          setFrameIndex(0);

          clearTimer(sleepEndTimeoutRef);
          sleepEndTimeoutRef.current = window.setTimeout(() => {
            finishSleep();
          }, getRandomBetween(PET_BEHAVIOR_TIMING.sleepDuration));
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

          setBlinkSrc(null);
          stateRef.current = nextWalkState;
          setPetState(nextWalkState);
          setMotionDuration(duration);
          setOffsetX((current) => {
            const nextOffset = current + signedDistance;
            offsetXRef.current = nextOffset;
            return nextOffset;
          });

          clearTimer(walkEndTimeoutRef);
          walkEndTimeoutRef.current = window.setTimeout(() => {
            setIdleState();
            if (playPendingInteraction()) return;
            scheduleBehavior(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
          }, duration);
        };

        switch (chosenBehavior) {
          case 'walk':
            startWalk();
            return;
          case 'sit':
            startSit();
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
    requestHappy,
    requestWave,
    setIdleState,
  ]);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    let hasGreeted = false;

    try {
      hasGreeted = window.sessionStorage.getItem(WAVE_GREETING_STORAGE_KEY) === 'true';
    } catch {
      hasGreeted = false;
    }

    if (hasGreeted) return undefined;

    initialWaveTimeoutRef.current = window.setTimeout(() => {
      if (stateRef.current === 'idle' && requestWave('greeting')) {
        try {
          window.sessionStorage.setItem(WAVE_GREETING_STORAGE_KEY, 'true');
        } catch {
          // Greeting should still work when sessionStorage is unavailable.
        }
      }
    }, getRandomBetween(PET_BEHAVIOR_TIMING.initialGreetingDelay));

    return () => {
      clearTimer(initialWaveTimeoutRef);
    };
  }, [clearTimer, prefersReducedMotion, requestWave]);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const handlePetHappy = () => {
      noteUserInteraction({ immediate: true });
      requestHappy('customEvent');
    };

    window.addEventListener(PET_HAPPY_EVENT, handlePetHappy);

    return () => {
      window.removeEventListener(PET_HAPPY_EVENT, handlePetHappy);
    };
  }, [noteUserInteraction, prefersReducedMotion, requestHappy]);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const handleActivity = () => {
      noteUserInteraction();
    };

    window.addEventListener('pointermove', handleActivity, { passive: true });
    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [noteUserInteraction, prefersReducedMotion]);

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
  }, [clearPetTimers]);

  const handlePointerEnter = useCallback(() => {
    if (isDraggingRef.current) return;

    noteUserInteraction({ immediate: true });

    if (stateRef.current === 'quiet') {
      clearTimer(quietInteractionTimeoutRef);
      quietInteractionTimeoutRef.current = window.setTimeout(() => {
        if (stateRef.current === 'quiet') {
          finishQuiet();
        }
      }, getRandomBetween(QUIET_HOVER_WAKE_DELAY));
      return;
    }

    if (stateRef.current === 'sleep') {
      clearTimer(sleepInteractionTimeoutRef);
      sleepInteractionTimeoutRef.current = window.setTimeout(() => {
        if (stateRef.current === 'sleep') {
          finishSleep();
        }
      }, getRandomBetween(SLEEP_HOVER_WAKE_DELAY));
    }
  }, [clearTimer, finishQuiet, finishSleep, noteUserInteraction]);

  const handlePetClick = useCallback(() => {
    if (prefersReducedMotion || isDraggingRef.current) return;

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

    const preferredInteraction = nextClickInteractionRef.current;
    const alternateInteraction = preferredInteraction === 'wave' ? 'happy' : 'wave';
    const requestInteraction = (interaction: Exclude<PendingInteraction, null>) => (
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
    noteUserInteraction,
    prefersReducedMotion,
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

  const resetLayout = useCallback(() => {
    clearStoredPetLayout();
    clearTimer(scaleSaveTimeoutRef);
    settleWalkOffset();
    scaleRef.current = PET_SCALE.default;
    setScale(PET_SCALE.default);

    const nextPosition = getDefaultPetPosition(rootRef.current, PET_SCALE.default);
    positionRef.current = nextPosition;
    setPosition(nextPosition);
  }, [clearTimer, settleWalkOffset]);

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
    applyScale(nextPreset, { persist: true });
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
    isDraggingRef.current = true;
    setIsDragging(true);
    clearBehaviorTimers();
    pendingInteractionRef.current = null;
    setIdleState();
  }, [clearBehaviorTimers, setIdleState]);

  const endDrag = useCallback((nextPosition: PetPosition) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    positionRef.current = nextPosition;
    setPosition(nextPosition);
    writeStoredPosition(nextPosition);
    setIdleState();

    dragResumeTimeoutRef.current = window.setTimeout(() => {
      dragResumeTimeoutRef.current = null;
      scheduleBehaviorRef.current?.(PET_BEHAVIOR_TIMING.idleNextBehaviorDelay);
    }, getRandomBetween(PET_BEHAVIOR_TIMING.dragResumeDelay));
  }, [setIdleState]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    noteUserInteraction({ immediate: true });
    clearTimer(singleClickTimeoutRef);
    clearTimer(dragResumeTimeoutRef);
    clearTimer(behaviorTimeoutRef);
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

    event.currentTarget.setPointerCapture(event.pointerId);
  }, [clearTimer, noteUserInteraction, settleWalkOffset]);

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
    const wasDragging = dragSession.dragging || movedDistance > DRAG_CLICK_THRESHOLD;
    const finalPosition = clampPetPosition({
      x: dragSession.originPosition.x + distanceX,
      y: dragSession.originPosition.y + distanceY,
    }, scaleRef.current, rootRef.current);

    if (wasDragging) {
      pendingDragPositionRef.current = null;
      endDrag(finalPosition);
      return;
    }

    if (options.cancelled) {
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
  }, [endDrag, handleDoubleClick, scheduleSingleClick]);

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    finishPointerSession(event);
  }, [finishPointerSession]);

  const handlePointerCancel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    finishPointerSession(event, { cancelled: true });
  }, [finishPointerSession]);

  const handlePetWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();

    noteUserInteraction({ immediate: true });
    clearTimer(behaviorTimeoutRef);
    settleWalkOffset();

    const direction = event.deltaY < 0 ? 1 : -1;
    applyScale(scaleRef.current + direction * PET_SCALE.wheelStep, { persist: true });
  }, [applyScale, clearTimer, noteUserInteraction, settleWalkOffset]);

  useEffect(() => {
    const interactiveNode = interactiveRef.current;
    if (!interactiveNode) return undefined;

    interactiveNode.addEventListener('wheel', handlePetWheel, { passive: false });

    return () => {
      interactiveNode.removeEventListener('wheel', handlePetWheel);
    };
  }, [handlePetWheel]);

  const handleNativeClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    if (suppressNativeClickRef.current) {
      suppressNativeClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    handlePetClick();
  }, [handlePetClick]);

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
    >
      <div className={styles.walkOffsetLayer} style={walkStyle}>
        <div className={styles.scaleLayer} style={scaleStyle}>
          <div className={aliveClassName} data-state={petState}>
            <div className={styles.frameLayer}>
              <button
                ref={interactiveRef}
                type="button"
                className={styles.interactiveLayer}
                aria-label="Interact with the princess pet"
                onPointerEnter={handlePointerEnter}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onClick={handleNativeClick}
              >
                <img
                  className={imageClassName}
                  src={currentFrame}
                  alt=""
                  draggable="false"
                  decoding="async"
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
