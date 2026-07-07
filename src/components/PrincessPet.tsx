import { useEffect, useMemo, useRef, useState } from 'react';
import { princessAnimations } from '../lib/princessPetAnimations';
import styles from './PrincessPet.module.css';

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

export default function PrincessPet() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const animation = princessAnimations.idle;
  const normalFrames = animation.frames;
  const blinkFrame = animation.blinkFrames?.[0] || null;
  const [frameIndex, setFrameIndex] = useState(0);
  const [blinkSrc, setBlinkSrc] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const blinkTimeoutRef = useRef<number | null>(null);
  const blinkResetRef = useRef<number | null>(null);

  const currentFrame = useMemo(() => {
    if (prefersReducedMotion) return normalFrames[0];
    return blinkSrc || normalFrames[frameIndex % normalFrames.length];
  }, [blinkSrc, frameIndex, normalFrames, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setFrameIndex(0);
      return undefined;
    }

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

  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.breathMotion}>
        <div className={styles.swayMotion}>
          <img
            className={styles.image}
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
