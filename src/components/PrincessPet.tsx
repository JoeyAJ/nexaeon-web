import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { princessAnimations } from '../lib/princessPetAnimations';
import styles from './PrincessPet.module.css';

type PetState = keyof typeof princessAnimations;
type WalkState = 'walkLeft' | 'walkRight';

const INITIAL_WALK_DELAY = [8_000, 16_000] as const;
const NEXT_WALK_DELAY = [10_000, 18_000] as const;
const DESKTOP_WALK_DISTANCE = [24, 56] as const;
const MOBILE_WALK_DISTANCE = [12, 28] as const;
const WALK_DURATION = [1_200, 2_200] as const;
const MOBILE_BREAKPOINT = 520;

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
  const walkTimeoutRef = useRef<number | null>(null);
  const walkEndTimeoutRef = useRef<number | null>(null);

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

  useEffect(() => {
    const frames = Object.values(princessAnimations).flatMap((item) => item.frames);
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
      setFrameIndex((current) => (current + 1) % normalFrames.length);
    }, frameDuration);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [animation.fps, normalFrames.length, prefersReducedMotion]);

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

    const clearWalkTimeout = () => {
      if (walkTimeoutRef.current !== null) {
        window.clearTimeout(walkTimeoutRef.current);
        walkTimeoutRef.current = null;
      }
    };

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

    const scheduleWalk = (delayRange: readonly [number, number]) => {
      clearWalkTimeout();
      walkTimeoutRef.current = window.setTimeout(() => {
        const root = rootRef.current;
        if (!root || stateRef.current !== 'idle') {
          scheduleWalk(NEXT_WALK_DELAY);
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
          scheduleWalk(NEXT_WALK_DELAY);
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
          setPetState('idle');
          setFrameIndex(0);
          scheduleWalk(NEXT_WALK_DELAY);
        }, duration);
      }, getRandomBetween(delayRange));
    };

    scheduleWalk(INITIAL_WALK_DELAY);
    window.addEventListener('resize', clampOffsetToViewport);

    return () => {
      clearWalkTimeout();
      window.removeEventListener('resize', clampOffsetToViewport);

      if (walkEndTimeoutRef.current !== null) {
        window.clearTimeout(walkEndTimeoutRef.current);
        walkEndTimeoutRef.current = null;
      }
    };
  }, [prefersReducedMotion]);

  const motionStyle = {
    '--princess-pet-motion-duration': `${motionDuration}ms`,
    transform: `translateX(${offsetX}px)`,
  } as CSSProperties;

  const aliveClassName = [
    styles.aliveLayer,
    petState === 'idle' ? styles.idleAlive : styles.walkAlive,
  ].join(' ');

  const imageClassName = [
    styles.image,
    petState === 'walkLeft' ? styles.flipped : '',
  ].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={styles.root} aria-hidden="true" data-pet-state={petState}>
      <div className={styles.motionLayer} style={motionStyle}>
        <div className={aliveClassName}>
          <img
            className={imageClassName}
            src={currentFrame}
            alt=""
            draggable="false"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}
