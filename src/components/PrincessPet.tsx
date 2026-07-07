import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { princessAnimations } from '../lib/princessPetAnimations';
import styles from './PrincessPet.module.css';

type PetState = keyof typeof princessAnimations;
type WalkState = 'walkLeft' | 'walkRight';
type PendingInteraction = 'wave' | null;

const PET_DEBUG = false;
const WAVE_GREETING_STORAGE_KEY = 'nexaeon-princess-wave-greeted';
const INITIAL_WAVE_DELAY = [2_000, 4_000] as const;
const INITIAL_ACTION_DELAY = [8_000, 16_000] as const;
const NEXT_ACTION_DELAY = [10_000, 18_000] as const;
const POST_WALK_SIT_DELAY = [3_000, 5_000] as const;
const SIT_DURATION = [6_000, 14_000] as const;
const SIT_COOLDOWN = [18_000, 28_000] as const;
const WAVE_COOLDOWN = 12_000;
const NATURAL_WAVE_IDLE_DELAY = [20_000, 35_000] as const;
const NATURAL_WAVE_PROBABILITY = 0.15;
const SIT_ACTION_PROBABILITY = 0.35;
const IDLE_PAUSE_PROBABILITY = 0.2;
const DESKTOP_WALK_DISTANCE = [24, 56] as const;
const MOBILE_WALK_DISTANCE = [12, 28] as const;
const WALK_DURATION = [1_200, 2_200] as const;
const MOBILE_BREAKPOINT = 520;
const WAVE_DURATION = Math.min(
  2_000,
  Math.max(1_200, Math.round((princessAnimations.wave.frames.length / princessAnimations.wave.fps) * 1000)),
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
  return viewportWidth <= MOBILE_BREAKPOINT ? 12 : 18;
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
  const waveEndTimeoutRef = useRef<number | null>(null);
  const initialWaveTimeoutRef = useRef<number | null>(null);
  const naturalWaveTimeoutRef = useRef<number | null>(null);
  const waveAllowedAtRef = useRef(0);
  const sitAllowedAtRef = useRef(0);
  const pendingInteractionRef = useRef<PendingInteraction>(null);
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

  const clearBehaviorTimeout = useCallback(() => {
    if (behaviorTimeoutRef.current !== null) {
      window.clearTimeout(behaviorTimeoutRef.current);
      behaviorTimeoutRef.current = null;
    }
  }, []);

  const playWave = useCallback(() => {
    if (prefersReducedMotion || stateRef.current !== 'idle') return false;

    clearBehaviorTimeout();
    setBlinkSrc(null);
    setMotionDuration(0);
    setFrameIndex(0);
    stateRef.current = 'wave';
    setPetState('wave');

    if (waveEndTimeoutRef.current !== null) {
      window.clearTimeout(waveEndTimeoutRef.current);
    }

    waveEndTimeoutRef.current = window.setTimeout(() => {
      stateRef.current = 'idle';
      setPetState('idle');
      setFrameIndex(0);
      scheduleBehaviorRef.current?.(NEXT_ACTION_DELAY);
    }, WAVE_DURATION);

    return true;
  }, [clearBehaviorTimeout, prefersReducedMotion]);

  const playPendingWave = useCallback(() => {
    if (pendingInteractionRef.current !== 'wave') return false;

    pendingInteractionRef.current = null;
    return playWave();
  }, [playWave]);

  const requestWave = useCallback((source: 'greeting' | 'interaction' | 'natural') => {
    if (prefersReducedMotion) return false;

    const currentState = stateRef.current;
    if (currentState === 'wave') return false;

    if (source === 'interaction') {
      const now = Date.now();
      if (now < waveAllowedAtRef.current) return false;

      waveAllowedAtRef.current = now + WAVE_COOLDOWN;
    }

    if (currentState === 'idle') {
      return playWave();
    }

    if (currentState === 'walkLeft' || currentState === 'walkRight' || currentState === 'sit') {
      pendingInteractionRef.current = 'wave';
      return true;
    }

    return false;
  }, [playWave, prefersReducedMotion]);

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
      clearBehaviorTimeout();
      behaviorTimeoutRef.current = window.setTimeout(() => {
        const root = rootRef.current;
        if (!root || stateRef.current !== 'idle') {
          scheduleBehavior(NEXT_ACTION_DELAY);
          return;
        }

        const now = Date.now();
        const canSit = now >= sitAllowedAtRef.current;

        if (canSit && Math.random() < SIT_ACTION_PROBABILITY) {
          const duration = Math.round(getRandomBetween(SIT_DURATION));

          setBlinkSrc(null);
          setMotionDuration(0);
          setPetState('sit');
          setFrameIndex(0);

          if (sitEndTimeoutRef.current !== null) {
            window.clearTimeout(sitEndTimeoutRef.current);
          }

          sitEndTimeoutRef.current = window.setTimeout(() => {
            stateRef.current = 'idle';
            setPetState('idle');
            setFrameIndex(0);
            sitAllowedAtRef.current = Date.now() + getRandomBetween(SIT_COOLDOWN);
            if (playPendingWave()) return;

            scheduleBehavior(NEXT_ACTION_DELAY);
          }, duration);
          return;
        }

        if (Math.random() < IDLE_PAUSE_PROBABILITY) {
          scheduleBehavior(NEXT_ACTION_DELAY);
          return;
        }

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
        setPetState(nextWalkState);
        setMotionDuration(duration);
        setOffsetX((current) => {
          const nextOffset = current + signedDistance;
          offsetXRef.current = nextOffset;
          return nextOffset;
        });

        if (walkEndTimeoutRef.current !== null) {
          window.clearTimeout(walkEndTimeoutRef.current);
        }

        walkEndTimeoutRef.current = window.setTimeout(() => {
          stateRef.current = 'idle';
          setPetState('idle');
          setFrameIndex(0);
          sitAllowedAtRef.current = Math.max(
            sitAllowedAtRef.current,
            Date.now() + getRandomBetween(POST_WALK_SIT_DELAY),
          );
          if (playPendingWave()) return;

          scheduleBehavior(NEXT_ACTION_DELAY);
        }, duration);
      }, getRandomBetween(delayRange));
    };

    scheduleBehaviorRef.current = scheduleBehavior;
    scheduleBehavior(INITIAL_ACTION_DELAY);
    window.addEventListener('resize', clampOffsetToViewport);

    return () => {
      scheduleBehaviorRef.current = null;
      clearBehaviorTimeout();
      window.removeEventListener('resize', clampOffsetToViewport);

      if (walkEndTimeoutRef.current !== null) {
        window.clearTimeout(walkEndTimeoutRef.current);
        walkEndTimeoutRef.current = null;
      }

      if (sitEndTimeoutRef.current !== null) {
        window.clearTimeout(sitEndTimeoutRef.current);
        sitEndTimeoutRef.current = null;
      }
    };
  }, [clearBehaviorTimeout, playPendingWave, prefersReducedMotion]);

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
    }, getRandomBetween(INITIAL_WAVE_DELAY));

    return () => {
      if (initialWaveTimeoutRef.current !== null) {
        window.clearTimeout(initialWaveTimeoutRef.current);
        initialWaveTimeoutRef.current = null;
      }
    };
  }, [prefersReducedMotion, requestWave]);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const scheduleNaturalWave = () => {
      if (naturalWaveTimeoutRef.current !== null) {
        window.clearTimeout(naturalWaveTimeoutRef.current);
      }

      naturalWaveTimeoutRef.current = window.setTimeout(() => {
        naturalWaveTimeoutRef.current = null;

        if (stateRef.current === 'idle' && Math.random() < NATURAL_WAVE_PROBABILITY) {
          requestWave('natural');
        }

        scheduleNaturalWave();
      }, getRandomBetween(NATURAL_WAVE_IDLE_DELAY));
    };

    scheduleNaturalWave();

    return () => {
      if (naturalWaveTimeoutRef.current !== null) {
        window.clearTimeout(naturalWaveTimeoutRef.current);
        naturalWaveTimeoutRef.current = null;
      }
    };
  }, [prefersReducedMotion, requestWave]);

  useEffect(() => {
    if (!prefersReducedMotion) return;

    pendingInteractionRef.current = null;
    clearBehaviorTimeout();
    setOffsetX(0);
    setMotionDuration(0);

    if (waveEndTimeoutRef.current !== null) {
      window.clearTimeout(waveEndTimeoutRef.current);
      waveEndTimeoutRef.current = null;
    }

    if (initialWaveTimeoutRef.current !== null) {
      window.clearTimeout(initialWaveTimeoutRef.current);
      initialWaveTimeoutRef.current = null;
    }

    if (naturalWaveTimeoutRef.current !== null) {
      window.clearTimeout(naturalWaveTimeoutRef.current);
      naturalWaveTimeoutRef.current = null;
    }
  }, [clearBehaviorTimeout, prefersReducedMotion]);

  useEffect(() => () => {
    if (waveEndTimeoutRef.current !== null) {
      window.clearTimeout(waveEndTimeoutRef.current);
      waveEndTimeoutRef.current = null;
    }
  }, []);

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
          : styles.walkAlive,
  ].join(' ');

  const imageClassName = [
    styles.image,
    petState === 'walkLeft' ? styles.flipped : '',
  ].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={styles.root} data-pet-state={petState}>
      <div className={styles.motionLayer} style={motionStyle}>
        <div className={aliveClassName} data-state={petState}>
          <div className={styles.frameLayer}>
            <button
              type="button"
              className={styles.interactiveLayer}
              aria-label="Wave to the princess pet"
              onPointerEnter={() => requestWave('interaction')}
              onClick={() => requestWave('interaction')}
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
      {PET_DEBUG ? <div className={styles.debugLabel}>{petState}</div> : null}
    </div>
  );
}
