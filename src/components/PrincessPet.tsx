import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PET_HAPPY_EVENT } from '../lib/petEvents.js';
import { princessAnimations } from '../lib/princessPetAnimations';
import styles from './PrincessPet.module.css';

type PetState = keyof typeof princessAnimations;
type WalkState = 'walkLeft' | 'walkRight';
type PendingInteraction = 'wave' | 'happy' | null;

const PET_DEBUG = false;
const WAVE_GREETING_STORAGE_KEY = 'nexaeon-princess-wave-greeted';
const INITIAL_WAVE_DELAY = [2_000, 4_000] as const;
const INITIAL_HAPPY_AFTER_WAVE_DELAY = [6_000, 10_000] as const;
const INITIAL_ACTION_DELAY = [8_000, 16_000] as const;
const NEXT_ACTION_DELAY = [10_000, 18_000] as const;
const POST_WALK_SIT_DELAY = [3_000, 5_000] as const;
const SIT_DURATION = [6_000, 14_000] as const;
const SIT_COOLDOWN = [18_000, 28_000] as const;
const REST_INITIAL_DELAY = [45_000, 75_000] as const;
const REST_DURATION = [10_000, 24_000] as const;
const REST_COOLDOWN = 60_000;
const SLEEP_MIN_PAGE_STAY = 120_000;
const SLEEP_USER_INACTIVE_THRESHOLD = 90_000;
const SLEEP_DURATION = [18_000, 38_000] as const;
const SLEEP_COOLDOWN = 120_000;
const SLEEP_PROBABILITY = 0.15;
const POST_PLAYFUL_SLEEP_GAP = 60_000;
const POST_REST_SLEEP_GAP = 45_000;
const POST_QUIET_SLEEP_GAP = 45_000;
const POST_SLEEP_REST_QUIET_GAP = 60_000;
const SLEEP_HOVER_WAKE_DELAY = [800, 1_200] as const;
const SLEEP_WAKE_INTERACTION_DELAY = 400;
const QUIET_INITIAL_DELAY = 90_000;
const QUIET_IDLE_THRESHOLD = [90_000, 150_000] as const;
const QUIET_DURATION = [8_000, 18_000] as const;
const QUIET_COOLDOWN = 90_000;
const QUIET_PROBABILITY = 0.2;
const REST_QUIET_GAP = 30_000;
const USER_ACTIVITY_THROTTLE = 1_500;
const QUIET_HOVER_WAKE_DELAY = [300, 600] as const;
const WAVE_COOLDOWN = 12_000;
const HAPPY_COOLDOWN = 10_000;
const CUSTOM_EVENT_COOLDOWN = 8_000;
const INITIAL_HAPPY_PROBABILITY = 0.28;
const SIT_ACTION_PROBABILITY = 0.35;
const IDLE_PAUSE_PROBABILITY = 0.2;
const REST_READY_PROBABILITY = 0.2;
const REST_READY_SIT_PROBABILITY = 0.4;
const REST_READY_WALK_PROBABILITY = 0.25;
const DESKTOP_WALK_DISTANCE = [24, 56] as const;
const MOBILE_WALK_DISTANCE = [12, 28] as const;
const WALK_DURATION = [1_200, 2_200] as const;
const MOBILE_BREAKPOINT = 520;
const WAVE_DURATION = Math.min(
  2_000,
  Math.max(1_200, Math.round((princessAnimations.wave.frames.length / princessAnimations.wave.fps) * 1000)),
);
const HAPPY_DURATION = Math.min(
  2_400,
  Math.max(1_400, Math.round((princessAnimations.happy.frames.length / princessAnimations.happy.fps) * 1000)),
);

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

function getRandomBlinkDelay() {
  return 12_000 + Math.random() * 8_000;
}

function getRandomBetween([min, max]: readonly [number, number]) {
  return min + Math.random() * (max - min);
}

function getViewportWidth() {
  return window.innerWidth || document.documentElement.clientWidth || 1280;
}

function getEdgeMargin(viewportWidth: number) {
  return viewportWidth <= MOBILE_BREAKPOINT ? 20 : 32;
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const offsetXRef = useRef(0);
  const stateRef = useRef<PetState>('idle');
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
  const initialHappyTimeoutRef = useRef<number | null>(null);
  const waveAllowedAtRef = useRef(0);
  const happyAllowedAtRef = useRef(0);
  const customEventAllowedAtRef = useRef(0);
  const sitAllowedAtRef = useRef(0);
  const restAllowedAtRef = useRef(Date.now() + getRandomBetween(REST_INITIAL_DELAY));
  const sleepAllowedAtRef = useRef(Date.now() + SLEEP_MIN_PAGE_STAY);
  const quietAllowedAtRef = useRef(Date.now() + QUIET_INITIAL_DELAY);
  const restEndedAtRef = useRef(0);
  const sleepEndedAtRef = useRef(0);
  const quietEndedAtRef = useRef(0);
  const lastPlayfulInteractionAtRef = useRef(0);
  const pageLoadedAtRef = useRef(Date.now());
  const lastUserInteractionAtRef = useRef(Date.now());
  const lastThrottledActivityAtRef = useRef(0);
  const quietIdleThresholdRef = useRef(getRandomBetween(QUIET_IDLE_THRESHOLD));
  const pendingInteractionRef = useRef<PendingInteraction>(null);
  const nextClickInteractionRef = useRef<Exclude<PendingInteraction, null>>('wave');
  const scheduleBehaviorRef = useRef<((delayRange: readonly [number, number]) => void) | null>(null);

  const currentFrame = useMemo(() => {
    if (prefersReducedMotion) return princessAnimations.idle.frames[0];
    return blinkSrc || normalFrames[frameIndex % normalFrames.length];
  }, [blinkSrc, frameIndex, normalFrames, prefersReducedMotion]);

  useEffect(() => {
    offsetXRef.current = offsetX;
  }, [offsetX]);

  useEffect(() => {
    stateRef.current = petState;
  }, [petState]);

  const clearTimer = useCallback((timerRef: { current: number | null }) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearPetTimers = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    clearTimer(blinkTimeoutRef);
    clearTimer(blinkResetRef);
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
    clearTimer(initialWaveTimeoutRef);
    clearTimer(initialHappyTimeoutRef);
  }, [clearTimer]);

  const noteUserInteraction = useCallback((options: { immediate?: boolean } = {}) => {
    const now = Date.now();

    if (!options.immediate && now - lastThrottledActivityAtRef.current < USER_ACTIVITY_THROTTLE) {
      return;
    }

    lastThrottledActivityAtRef.current = now;
    lastUserInteractionAtRef.current = now;
    quietIdleThresholdRef.current = getRandomBetween(QUIET_IDLE_THRESHOLD);
  }, []);

  const playWave = useCallback(() => {
    if (prefersReducedMotion || stateRef.current !== 'idle') return false;

    clearTimer(behaviorTimeoutRef);
    setBlinkSrc(null);
    setMotionDuration(0);
    setFrameIndex(0);
    stateRef.current = 'wave';
    setPetState('wave');
    lastPlayfulInteractionAtRef.current = Date.now();

    clearTimer(waveEndTimeoutRef);

    waveEndTimeoutRef.current = window.setTimeout(() => {
      stateRef.current = 'idle';
      setPetState('idle');
      setFrameIndex(0);
      scheduleBehaviorRef.current?.(NEXT_ACTION_DELAY);
    }, WAVE_DURATION);

    return true;
  }, [clearTimer, prefersReducedMotion]);

  const playHappy = useCallback(() => {
    if (prefersReducedMotion || stateRef.current !== 'idle') return false;

    clearTimer(behaviorTimeoutRef);
    setBlinkSrc(null);
    setMotionDuration(0);
    setFrameIndex(0);
    stateRef.current = 'happy';
    setPetState('happy');
    lastPlayfulInteractionAtRef.current = Date.now();

    clearTimer(happyEndTimeoutRef);

    happyEndTimeoutRef.current = window.setTimeout(() => {
      stateRef.current = 'idle';
      setPetState('idle');
      setFrameIndex(0);
      scheduleBehaviorRef.current?.(NEXT_ACTION_DELAY);
    }, HAPPY_DURATION);

    return true;
  }, [clearTimer, prefersReducedMotion]);

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
    stateRef.current = 'idle';
    setPetState('idle');
    setFrameIndex(0);
    sleepEndedAtRef.current = now;
    sleepAllowedAtRef.current = Math.max(sleepAllowedAtRef.current, now + SLEEP_COOLDOWN);
    restAllowedAtRef.current = Math.max(restAllowedAtRef.current, now + POST_SLEEP_REST_QUIET_GAP);
    quietAllowedAtRef.current = Math.max(quietAllowedAtRef.current, now + POST_SLEEP_REST_QUIET_GAP);

    if (options.playPending !== false && playPendingInteraction()) return;

    if (options.schedule !== false) {
      scheduleBehaviorRef.current?.(NEXT_ACTION_DELAY);
    }
  }, [clearTimer, playPendingInteraction]);

  const isPageStayedLongEnough = useCallback((now = Date.now()) => (
    now - pageLoadedAtRef.current >= SLEEP_MIN_PAGE_STAY
  ), []);

  const isUserInactiveLongEnough = useCallback((now = Date.now()) => (
    now - lastUserInteractionAtRef.current >= SLEEP_USER_INACTIVE_THRESHOLD
  ), []);

  const canConsiderSleep = useCallback((now = Date.now()) => (
    isPageStayedLongEnough(now)
    && isUserInactiveLongEnough(now)
    && now >= sleepAllowedAtRef.current
    && now - lastPlayfulInteractionAtRef.current >= POST_PLAYFUL_SLEEP_GAP
    && now - restEndedAtRef.current >= POST_REST_SLEEP_GAP
    && now - quietEndedAtRef.current >= POST_QUIET_SLEEP_GAP
  ), [isPageStayedLongEnough, isUserInactiveLongEnough]);

  const isIdleTooLong = useCallback((now = Date.now()) => (
    now - pageLoadedAtRef.current >= QUIET_INITIAL_DELAY
    && now - lastUserInteractionAtRef.current >= quietIdleThresholdRef.current
  ), []);

  const finishQuiet = useCallback((options: { schedule?: boolean; playPending?: boolean } = {}) => {
    clearTimer(quietEndTimeoutRef);
    clearTimer(quietInteractionTimeoutRef);

    const now = Date.now();
    stateRef.current = 'idle';
    setPetState('idle');
    setFrameIndex(0);
    quietEndedAtRef.current = now;
    quietAllowedAtRef.current = Math.max(quietAllowedAtRef.current, now + QUIET_COOLDOWN);
    restAllowedAtRef.current = Math.max(restAllowedAtRef.current, now + REST_QUIET_GAP);
    sleepAllowedAtRef.current = Math.max(sleepAllowedAtRef.current, now + POST_QUIET_SLEEP_GAP);

    if (options.playPending !== false && playPendingInteraction()) return;

    if (options.schedule !== false) {
      scheduleBehaviorRef.current?.(NEXT_ACTION_DELAY);
    }
  }, [clearTimer, playPendingInteraction]);

  const requestWave = useCallback((source: 'greeting' | 'interaction' | 'natural') => {
    if (prefersReducedMotion) return false;

    const currentState = stateRef.current;
    if (currentState === 'wave' || currentState === 'happy') return false;
    const canDefer = currentState === 'walkLeft' || currentState === 'walkRight' || currentState === 'sit' || currentState === 'rest';

    if (source === 'interaction') {
      const now = Date.now();
      if (now < waveAllowedAtRef.current) return false;

      waveAllowedAtRef.current = now + WAVE_COOLDOWN;
    }

    if (currentState === 'idle') {
      return playWave();
    }

    if (source === 'interaction' && canDefer) {
      pendingInteractionRef.current = 'wave';
      return true;
    }

    return false;
  }, [playWave, prefersReducedMotion]);

  const requestHappy = useCallback((source: 'interaction' | 'customEvent' | 'initial') => {
    if (prefersReducedMotion) return false;

    const currentState = stateRef.current;
    if (currentState === 'wave' || currentState === 'happy') return false;
    const canDefer = currentState === 'walkLeft' || currentState === 'walkRight' || currentState === 'sit' || currentState === 'rest';
    const now = Date.now();
    const isHappyCoolingDown = now < happyAllowedAtRef.current;
    const isCustomEventCoolingDown = source === 'customEvent' && now < customEventAllowedAtRef.current;

    if (currentState === 'quiet') {
      finishQuiet({ schedule: false, playPending: false });

      if (isHappyCoolingDown || isCustomEventCoolingDown) {
        scheduleBehaviorRef.current?.(NEXT_ACTION_DELAY);
        return false;
      }

      happyAllowedAtRef.current = now + HAPPY_COOLDOWN;

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
      finishSleep({ schedule: false, playPending: false });

      if (isHappyCoolingDown || isCustomEventCoolingDown) {
        scheduleBehaviorRef.current?.(NEXT_ACTION_DELAY);
        return false;
      }

      happyAllowedAtRef.current = now + HAPPY_COOLDOWN;

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

    happyAllowedAtRef.current = now + HAPPY_COOLDOWN;

    if (source === 'customEvent') {
      customEventAllowedAtRef.current = now + CUSTOM_EVENT_COOLDOWN;
    }

    if (currentState !== 'idle' && !canDefer) return false;

    if (currentState === 'idle') {
      return playHappy();
    }

    pendingInteractionRef.current = 'happy';
    return true;
  }, [clearTimer, finishQuiet, finishSleep, playHappy, prefersReducedMotion]);

  const finishRest = useCallback(() => {
    clearTimer(restEndTimeoutRef);
    clearTimer(restInteractionTimeoutRef);

    stateRef.current = 'idle';
    setPetState('idle');
    setFrameIndex(0);
    restEndedAtRef.current = Date.now();
    restAllowedAtRef.current = Math.max(restAllowedAtRef.current, restEndedAtRef.current + REST_COOLDOWN);
    sleepAllowedAtRef.current = Math.max(sleepAllowedAtRef.current, restEndedAtRef.current + POST_REST_SLEEP_GAP);

    if (playPendingInteraction()) return;

    scheduleBehaviorRef.current?.(NEXT_ACTION_DELAY);
  }, [clearTimer, playPendingInteraction]);

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
      if (blinkTimeoutRef.current !== null) {
        window.clearTimeout(blinkTimeoutRef.current);
        blinkTimeoutRef.current = null;
      }

      if (blinkResetRef.current !== null) {
        window.clearTimeout(blinkResetRef.current);
        blinkResetRef.current = null;
      }

      setBlinkSrc(null);
    };
  }, [blinkFrame, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const clampOffsetToViewport = () => {
      const root = rootRef.current;
      if (!root) return;

      const viewportWidth = getViewportWidth();
      const margin = getEdgeMargin(viewportWidth);
      const rect = root.getBoundingClientRect();
      let nextOffset = offsetXRef.current;

      if (rect.left < margin) {
        nextOffset += margin - rect.left;
      }

      if (rect.right > viewportWidth - margin) {
        nextOffset -= rect.right - (viewportWidth - margin);
      }

      if (nextOffset !== offsetXRef.current) {
        offsetXRef.current = nextOffset;
        setMotionDuration(180);
        setOffsetX(nextOffset);
      }
    };

    const scheduleBehavior = (delayRange: readonly [number, number]) => {
      clearTimer(behaviorTimeoutRef);
      behaviorTimeoutRef.current = window.setTimeout(() => {
        const root = rootRef.current;
        if (!root || document.hidden || stateRef.current !== 'idle') {
          scheduleBehavior(NEXT_ACTION_DELAY);
          return;
        }

        const now = Date.now();
        const canSit = now >= sitAllowedAtRef.current;
        const canSleep = canConsiderSleep(now);
        const quietReady = isIdleTooLong(now)
          && now >= quietAllowedAtRef.current
          && now - restEndedAtRef.current >= REST_QUIET_GAP
          && now - sleepEndedAtRef.current >= POST_SLEEP_REST_QUIET_GAP;
        const canRest = now >= restAllowedAtRef.current
          && now - quietEndedAtRef.current >= REST_QUIET_GAP
          && now - sleepEndedAtRef.current >= POST_SLEEP_REST_QUIET_GAP;

        const startSit = () => {
          const duration = Math.round(getRandomBetween(SIT_DURATION));

          setBlinkSrc(null);
          setMotionDuration(0);
          stateRef.current = 'sit';
          setPetState('sit');
          setFrameIndex(0);

          clearTimer(sitEndTimeoutRef);

          sitEndTimeoutRef.current = window.setTimeout(() => {
            stateRef.current = 'idle';
            setPetState('idle');
            setFrameIndex(0);
            sitAllowedAtRef.current = Date.now() + getRandomBetween(SIT_COOLDOWN);
            if (playPendingInteraction()) return;

            scheduleBehavior(NEXT_ACTION_DELAY);
          }, duration);
        };

        const startRest = () => {
          const duration = Math.round(getRandomBetween(REST_DURATION));

          setBlinkSrc(null);
          setMotionDuration(0);
          stateRef.current = 'rest';
          setPetState('rest');
          setFrameIndex(0);

          clearTimer(restEndTimeoutRef);

          restEndTimeoutRef.current = window.setTimeout(() => {
            finishRest();
          }, duration);
        };

        const startQuiet = () => {
          const duration = Math.round(getRandomBetween(QUIET_DURATION));

          setBlinkSrc(null);
          setMotionDuration(0);
          stateRef.current = 'quiet';
          setPetState('quiet');
          setFrameIndex(0);

          clearTimer(quietEndTimeoutRef);

          quietEndTimeoutRef.current = window.setTimeout(() => {
            finishQuiet();
          }, duration);
        };

        const startSleep = () => {
          const duration = Math.round(getRandomBetween(SLEEP_DURATION));

          setBlinkSrc(null);
          setMotionDuration(0);
          stateRef.current = 'sleep';
          setPetState('sleep');
          setFrameIndex(0);

          clearTimer(sleepEndTimeoutRef);

          sleepEndTimeoutRef.current = window.setTimeout(() => {
            finishSleep();
          }, duration);
        };

        const startWalk = () => {
          const viewportWidth = getViewportWidth();
          const isMobile = viewportWidth <= MOBILE_BREAKPOINT;
          const margin = getEdgeMargin(viewportWidth);
          const [minDistance, maxDistance] = isMobile ? MOBILE_WALK_DISTANCE : DESKTOP_WALK_DISTANCE;
          const rect = root.getBoundingClientRect();
          const availableLeft = Math.max(0, rect.left - margin);
          const availableRight = Math.max(0, viewportWidth - margin - rect.right);
          const canWalkLeft = availableLeft >= minDistance;
          const canWalkRight = availableRight >= minDistance;

          if (!canWalkLeft && !canWalkRight) {
            scheduleBehavior(NEXT_ACTION_DELAY);
            return;
          }

          let nextWalkState: WalkState = Math.random() < 0.5 ? 'walkLeft' : 'walkRight';

          if (!canWalkLeft) nextWalkState = 'walkRight';
          if (!canWalkRight) nextWalkState = 'walkLeft';

          const availableDistance = nextWalkState === 'walkLeft' ? availableLeft : availableRight;
          const distance = Math.min(getRandomBetween([minDistance, maxDistance]), availableDistance);
          const signedDistance = nextWalkState === 'walkLeft' ? -distance : distance;
          const duration = Math.round(getRandomBetween(WALK_DURATION));

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
            stateRef.current = 'idle';
            setPetState('idle');
            setFrameIndex(0);
            sitAllowedAtRef.current = Math.max(
              sitAllowedAtRef.current,
              Date.now() + getRandomBetween(POST_WALK_SIT_DELAY),
            );
            if (playPendingInteraction()) return;

            scheduleBehavior(NEXT_ACTION_DELAY);
          }, duration);
        };

        if (playPendingInteraction()) return;

        if (canSleep && Math.random() < SLEEP_PROBABILITY) {
          startSleep();
          return;
        }

        if (canRest) {
          const roll = Math.random();

          if (roll < REST_READY_PROBABILITY) {
            startRest();
            return;
          }

          if (quietReady && Math.random() < QUIET_PROBABILITY) {
            startQuiet();
            return;
          }

          if (roll < REST_READY_PROBABILITY + REST_READY_SIT_PROBABILITY && canSit) {
            startSit();
            return;
          }

          if (roll < REST_READY_PROBABILITY + REST_READY_SIT_PROBABILITY + REST_READY_WALK_PROBABILITY) {
            startWalk();
            return;
          }

          scheduleBehavior(NEXT_ACTION_DELAY);
          return;
        }

        if (quietReady && Math.random() < QUIET_PROBABILITY) {
          startQuiet();
          return;
        }

        if (canSit && Math.random() < SIT_ACTION_PROBABILITY) {
          startSit();
          return;
        }

        if (Math.random() < IDLE_PAUSE_PROBABILITY) {
          scheduleBehavior(NEXT_ACTION_DELAY);
          return;
        }

        startWalk();
      }, getRandomBetween(delayRange));
    };

    scheduleBehaviorRef.current = scheduleBehavior;
    scheduleBehavior(INITIAL_ACTION_DELAY);
    window.addEventListener('resize', clampOffsetToViewport);

    return () => {
      scheduleBehaviorRef.current = null;
      clearTimer(behaviorTimeoutRef);
      window.removeEventListener('resize', clampOffsetToViewport);
      clearTimer(walkEndTimeoutRef);
      clearTimer(sitEndTimeoutRef);
      clearTimer(restEndTimeoutRef);
      clearTimer(restInteractionTimeoutRef);
      clearTimer(sleepEndTimeoutRef);
      clearTimer(sleepInteractionTimeoutRef);
      clearTimer(quietEndTimeoutRef);
      clearTimer(quietInteractionTimeoutRef);
    };
  }, [
    canConsiderSleep,
    clearTimer,
    finishQuiet,
    finishRest,
    finishSleep,
    isIdleTooLong,
    playPendingInteraction,
    prefersReducedMotion,
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

        clearTimer(initialHappyTimeoutRef);
        initialHappyTimeoutRef.current = window.setTimeout(() => {
          initialHappyTimeoutRef.current = null;

          if (stateRef.current === 'idle' && Math.random() < INITIAL_HAPPY_PROBABILITY) {
            requestHappy('initial');
          }
        }, WAVE_DURATION + getRandomBetween(INITIAL_HAPPY_AFTER_WAVE_DELAY));
      }
    }, getRandomBetween(INITIAL_WAVE_DELAY));

    return () => {
      if (initialWaveTimeoutRef.current !== null) {
        window.clearTimeout(initialWaveTimeoutRef.current);
        initialWaveTimeoutRef.current = null;
      }

      if (initialHappyTimeoutRef.current !== null) {
        window.clearTimeout(initialHappyTimeoutRef.current);
        initialHappyTimeoutRef.current = null;
      }
    };
  }, [clearTimer, prefersReducedMotion, requestHappy, requestWave]);

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
    setOffsetX(0);
    setMotionDuration(0);
  }, [clearPetTimers, prefersReducedMotion]);

  useEffect(() => () => {
    scheduleBehaviorRef.current = null;
    clearPetTimers();
  }, [clearPetTimers]);

  const handlePointerEnter = useCallback(() => {
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
      return;
    }

    if (stateRef.current === 'rest') return;

    requestWave('interaction');
  }, [clearTimer, finishQuiet, finishSleep, noteUserInteraction, requestWave]);

  const handleClick = useCallback(() => {
    if (prefersReducedMotion) return;

    noteUserInteraction({ immediate: true });

    if (stateRef.current === 'quiet') {
      finishQuiet({ schedule: false, playPending: false });
      clearTimer(interactionWakeTimeoutRef);
      interactionWakeTimeoutRef.current = window.setTimeout(() => {
        interactionWakeTimeoutRef.current = null;
        if (!requestHappy('interaction')) {
          scheduleBehaviorRef.current?.(NEXT_ACTION_DELAY);
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
          scheduleBehaviorRef.current?.(NEXT_ACTION_DELAY);
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
    }
  }, [
    clearTimer,
    finishQuiet,
    finishSleep,
    noteUserInteraction,
    prefersReducedMotion,
    requestHappy,
    requestWave,
  ]);

  const motionStyle = {
    '--princess-pet-motion-duration': `${motionDuration}ms`,
    transform: `translateX(${offsetX}px)`,
  } as CSSProperties;

  const aliveClassName = [
    styles.aliveLayer,
    petState === 'idle'
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
      `pageStayedLongEnough: ${isPageStayedLongEnough() ? 'true' : 'false'}`,
      `userInactiveLongEnough: ${isUserInactiveLongEnough() ? 'true' : 'false'}`,
      `idleTooLong: ${isIdleTooLong() ? 'true' : 'false'}`,
      `lastUserInteractionAt: ${new Date(lastUserInteractionAtRef.current).toISOString()}`,
      `frame: ${currentFrame.split('/').pop()?.replace('.png', '') || currentFrame}`,
    ].join(' | ')
    : null;

  return (
    <div ref={rootRef} className={styles.root} data-pet-state={petState}>
      <div className={styles.motionLayer} style={motionStyle}>
        <div className={aliveClassName} data-state={petState}>
          <div className={styles.frameLayer}>
            <button
              type="button"
              className={styles.interactiveLayer}
              aria-label="Wave to the princess pet"
              onPointerEnter={handlePointerEnter}
              onClick={handleClick}
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
      {debugInfo ? <div className={styles.debugLabel}>{debugInfo}</div> : null}
    </div>
  );
}
