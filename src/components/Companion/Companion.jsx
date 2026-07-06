import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './Companion.module.css';
import {
  COMPANION_ASSET_ROOT,
  COMPANION_LABELS,
  COMPANION_PET_MANIFEST,
  COMPANION_POSITION_KEY,
  COMPANION_STATE_DURATION,
  COMPANION_TIMING,
  DEFAULT_PRINCESS_METADATA,
  clampCompanionPosition,
  getCompanionSize,
  getDefaultCompanionPosition,
  parseSavedCompanionPosition,
  resolveSpritesheetUrl,
} from './companion.config.js';
import {
  getCompanionFrame,
} from './companionSprite.js';
import { COMPANION_STATES } from './companion.types.js';

const LOOK_LEFT_FRAME = 'lookLeft';
const LOOK_RIGHT_FRAME = 'lookRight';

const ANIMATION_INTERVALS = Object.freeze({
  [COMPANION_STATES.blink]: COMPANION_TIMING.blinkMs,
  [COMPANION_STATES.tilt]: COMPANION_TIMING.tiltMs,
  [COMPANION_STATES.lookAround]: COMPANION_TIMING.lookAroundMs,
});

const ANIMATION_PRIORITY = Object.freeze([
  COMPANION_STATES.lookAround,
  COMPANION_STATES.tilt,
  COMPANION_STATES.blink,
]);

const ANIMATION_SEQUENCES = Object.freeze({
  [COMPANION_STATES.blink]: Object.freeze([
    Object.freeze({ frame: COMPANION_STATES.blink, duration: COMPANION_STATE_DURATION.blink }),
    Object.freeze({ frame: COMPANION_STATES.idle, duration: COMPANION_STATE_DURATION.blinkGap }),
    Object.freeze({ frame: COMPANION_STATES.blink, duration: COMPANION_STATE_DURATION.blink }),
  ]),
  [COMPANION_STATES.tilt]: Object.freeze([
    Object.freeze({ frame: COMPANION_STATES.tilt, duration: COMPANION_STATE_DURATION.tilt }),
  ]),
  [COMPANION_STATES.lookAround]: Object.freeze([
    Object.freeze({ frame: LOOK_LEFT_FRAME, duration: COMPANION_STATE_DURATION.lookAroundFrame }),
    Object.freeze({ frame: COMPANION_STATES.idle, duration: COMPANION_STATE_DURATION.lookAroundIdleGap }),
    Object.freeze({ frame: LOOK_RIGHT_FRAME, duration: COMPANION_STATE_DURATION.lookAroundFrame }),
  ]),
});

function readStoredPosition() {
  try {
    return parseSavedCompanionPosition(window.localStorage.getItem(COMPANION_POSITION_KEY));
  } catch {
    return null;
  }
}

function saveStoredPosition(position) {
  try {
    window.localStorage.setItem(COMPANION_POSITION_KEY, JSON.stringify(position));
  } catch {
    // Companion position should never block the page if storage is unavailable.
  }
}

function getViewport() {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

function getInitialPosition() {
  const viewport = getViewport();
  const size = getCompanionSize(viewport.width);
  const savedPosition = readStoredPosition();
  const basePosition = savedPosition || getDefaultCompanionPosition(viewport.width, viewport.height, size);

  return clampCompanionPosition(basePosition, viewport.width, viewport.height, size);
}

export default function Companion({ lang = 'zh' }) {
  const [metadata, setMetadata] = useState(DEFAULT_PRINCESS_METADATA);
  const [position, setPosition] = useState(() => getInitialPosition());
  const [isDragging, setIsDragging] = useState(false);
  const [currentFrameName, setCurrentFrameName] = useState(COMPANION_STATES.idle);

  const animationRef = useRef({
    isDragging: false,
  });
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startPointerX: 0,
    startPointerY: 0,
    startPosition: { x: 0, y: 0 },
    moved: false,
  });

  const spritesheetUrl = useMemo(() => resolveSpritesheetUrl(metadata), [metadata]);
  const currentFrame = getCompanionFrame(currentFrameName);
  const label = COMPANION_LABELS[lang] || COMPANION_LABELS.en;

  useEffect(() => {
    let isMounted = true;

    fetch(`${COMPANION_ASSET_ROOT}${COMPANION_PET_MANIFEST}`, { cache: 'force-cache' })
      .then((response) => (response.ok ? response.json() : DEFAULT_PRINCESS_METADATA))
      .then((petMetadata) => {
        if (isMounted) {
          setMetadata({ ...DEFAULT_PRINCESS_METADATA, ...petMetadata });
        }
      })
      .catch(() => {
        if (isMounted) setMetadata(DEFAULT_PRINCESS_METADATA);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const timeoutIds = new Set();

    const wait = (duration) => new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        resolve();
      }, duration);
      timeoutIds.add(timeoutId);
    });

    const nextDueAt = new Map(ANIMATION_PRIORITY.map((animationName) => [
      animationName,
      Date.now() + ANIMATION_INTERVALS[animationName],
    ]));

    const playAnimation = async (animationName) => {
      const sequence = ANIMATION_SEQUENCES[animationName] || [];

      for (const step of sequence) {
        if (isCancelled || animationRef.current.isDragging) break;
        setCurrentFrameName(step.frame);
        await wait(step.duration);
      }

      if (!isCancelled) {
        setCurrentFrameName(COMPANION_STATES.idle);
      }
    };

    const runAnimationScheduler = async () => {
      while (!isCancelled) {
        if (animationRef.current.isDragging) {
          await wait(250);
          continue;
        }

        const now = Date.now();
        const nextAnimationName = ANIMATION_PRIORITY.find(
          (animationName) => nextDueAt.get(animationName) <= now,
        );

        if (!nextAnimationName) {
          const nextDelay = Math.min(
            ...Array.from(nextDueAt.values()).map((dueAt) => dueAt - now),
          );
          await wait(Math.max(100, nextDelay));
          continue;
        }

        await playAnimation(nextAnimationName);
        nextDueAt.set(nextAnimationName, Date.now() + ANIMATION_INTERVALS[nextAnimationName]);
      }
    };

    runAnimationScheduler();

    return () => {
      isCancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((currentPosition) => {
        const viewport = getViewport();
        const size = getCompanionSize(viewport.width);
        const basePosition = currentPosition || getDefaultCompanionPosition(viewport.width, viewport.height, size);
        const nextPosition = clampCompanionPosition(basePosition, viewport.width, viewport.height, size);

        saveStoredPosition(nextPosition);
        return nextPosition;
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const getSafePosition = useCallback(() => {
    if (position) return position;
    return getInitialPosition();
  }, [position]);

  const handlePointerDown = useCallback((event) => {
    if (!event.isPrimary) return;

    const safePosition = getSafePosition();
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startPosition: safePosition,
      moved: false,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    animationRef.current.isDragging = true;
    setIsDragging(true);
    setCurrentFrameName(COMPANION_STATES.idle);
    event.preventDefault();
  }, [getSafePosition]);

  const handlePointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startPointerX;
    const deltaY = event.clientY - drag.startPointerY;
    const viewport = getViewport();
    const size = getCompanionSize(viewport.width);
    const nextPosition = clampCompanionPosition(
      {
        x: drag.startPosition.x + deltaX,
        y: drag.startPosition.y + deltaY,
      },
      viewport.width,
      viewport.height,
      size,
    );

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      dragRef.current.moved = true;
    }

    setPosition(nextPosition);
    event.preventDefault();
  }, []);

  const handlePointerUp = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current.active = false;
    animationRef.current.isDragging = false;
    setIsDragging(false);

    if (position) {
      saveStoredPosition(position);
    }

    event.preventDefault();
  }, [position]);

  const handlePointerCancel = useCallback((event) => {
    if (dragRef.current.pointerId === event.pointerId) {
      dragRef.current.active = false;
      animationRef.current.isDragging = false;
      setIsDragging(false);
      setCurrentFrameName(COMPANION_STATES.idle);
    }
  }, []);

  return (
    <button
      type="button"
      className={[
        styles.root,
        isDragging ? styles.dragging : '',
      ].filter(Boolean).join(' ')}
      style={{
        '--companion-x': `${position.x}px`,
        '--companion-y': `${position.y}px`,
        '--companion-width': `${getCompanionSize(getViewport().width).width}px`,
        '--companion-height': `${getCompanionSize(getViewport().width).height}px`,
        '--companion-sprite-url': `url("${spritesheetUrl}")`,
        '--companion-frame-x': `-${currentFrame.x}px`,
        '--companion-frame-y': `-${currentFrame.y}px`,
        '--companion-frame-width': `${currentFrame.width}px`,
        '--companion-frame-height': `${currentFrame.height}px`,
      }}
      aria-label={label}
      title={metadata.displayName}
      data-companion-state={currentFrameName}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <span className={styles.frameShell} aria-hidden="true">
        <span className={styles.floatMotion}>
          <span className={styles.companionFrame} />
        </span>
      </span>
    </button>
  );
}
