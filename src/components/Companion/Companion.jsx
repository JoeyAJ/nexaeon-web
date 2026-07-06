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
  COMPANION_FRAME_INTERVAL_MS,
  SPRITESHEET_SIZE,
  getCompanionFrame,
  getCompanionFrames,
} from './companionSprite.js';
import { COMPANION_STATES } from './companion.types.js';

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

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(query.matches);

    updatePreference();
    query.addEventListener?.('change', updatePreference);

    return () => query.removeEventListener?.('change', updatePreference);
  }, []);

  return prefersReducedMotion;
}

export default function Companion({ lang = 'zh' }) {
  const [metadata, setMetadata] = useState(DEFAULT_PRINCESS_METADATA);
  const [position, setPosition] = useState(() => getInitialPosition());
  const [companionState, setCompanionState] = useState(COMPANION_STATES.idle);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const companionStateRef = useRef(companionState);
  const returnTimerRef = useRef(null);
  const sleepTimerRef = useRef(null);
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startPointerX: 0,
    startPointerY: 0,
    startPosition: { x: 0, y: 0 },
    moved: false,
  });

  const spritesheetUrl = useMemo(() => resolveSpritesheetUrl(metadata), [metadata]);
  const currentFrame = getCompanionFrame(companionState, frameIndex);
  const label = COMPANION_LABELS[lang] || COMPANION_LABELS.en;

  const transitionToState = useCallback((nextState) => {
    companionStateRef.current = nextState;
    setFrameIndex(0);
    setCompanionState(nextState);
  }, []);

  useEffect(() => {
    companionStateRef.current = companionState;
  }, [companionState]);

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

  const clearReturnTimer = useCallback(() => {
    if (returnTimerRef.current) {
      window.clearTimeout(returnTimerRef.current);
      returnTimerRef.current = null;
    }
  }, []);

  const resetSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      window.clearTimeout(sleepTimerRef.current);
    }

    sleepTimerRef.current = window.setTimeout(() => {
      if (!dragRef.current.active) {
        clearReturnTimer();
        transitionToState(COMPANION_STATES.sleep);
      }
    }, COMPANION_TIMING.sleepAfterMs);
  }, [clearReturnTimer, transitionToState]);

  const playTemporaryState = useCallback((nextState) => {
    clearReturnTimer();
    transitionToState(nextState);

    const duration = COMPANION_STATE_DURATION[nextState];
    if (duration) {
      returnTimerRef.current = window.setTimeout(() => {
        transitionToState(COMPANION_STATES.idle);
      }, duration);
    }
  }, [clearReturnTimer, transitionToState]);

  const playScheduledState = useCallback((nextState) => {
    if (dragRef.current.active || companionStateRef.current === COMPANION_STATES.sleep) return;
    playTemporaryState(nextState);
  }, [playTemporaryState]);

  const markInteraction = useCallback(() => {
    resetSleepTimer();

    if (companionStateRef.current === COMPANION_STATES.sleep) {
      playTemporaryState(COMPANION_STATES.wake);
    }
  }, [playTemporaryState, resetSleepTimer]);

  useEffect(() => {
    resetSleepTimer();
    return () => {
      if (sleepTimerRef.current) window.clearTimeout(sleepTimerRef.current);
    };
  }, [resetSleepTimer]);

  useEffect(() => {
    if (prefersReducedMotion) {
      const idlePulse = window.setInterval(() => {
        playScheduledState(COMPANION_STATES.blink);
      }, COMPANION_TIMING.reducedMotionIdlePulseMs);

      return () => window.clearInterval(idlePulse);
    }

    const blinkTimer = window.setInterval(() => {
      playScheduledState(COMPANION_STATES.blink);
    }, COMPANION_TIMING.blinkMs);
    const tiltTimer = window.setInterval(() => {
      playScheduledState(COMPANION_STATES.tilt);
    }, COMPANION_TIMING.tiltMs);
    const lookAroundTimer = window.setInterval(() => {
      playScheduledState(COMPANION_STATES.lookAround);
    }, COMPANION_TIMING.lookAroundMs);

    return () => {
      window.clearInterval(blinkTimer);
      window.clearInterval(tiltTimer);
      window.clearInterval(lookAroundTimer);
    };
  }, [playScheduledState, prefersReducedMotion]);

  useEffect(() => {
    const frames = getCompanionFrames(companionState);
    if (frames.length <= 1 || (prefersReducedMotion && companionState !== COMPANION_STATES.sleep)) return undefined;

    const frameTimer = window.setInterval(() => {
      setFrameIndex((currentIndex) => (currentIndex + 1) % frames.length);
    }, COMPANION_FRAME_INTERVAL_MS[companionState] || 220);

    return () => window.clearInterval(frameTimer);
  }, [companionState, prefersReducedMotion]);

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

  useEffect(() => () => clearReturnTimer(), [clearReturnTimer]);

  const getSafePosition = useCallback(() => {
    if (position) return position;
    return getInitialPosition();
  }, [position]);

  const handlePointerEnter = useCallback(() => {
    if (companionStateRef.current === COMPANION_STATES.sleep) {
      markInteraction();
    }
  }, [markInteraction]);

  const handlePointerDown = useCallback((event) => {
    if (!event.isPrimary) return;

    markInteraction();
    clearReturnTimer();

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
    setIsDragging(true);
    transitionToState(COMPANION_STATES.walk);
    event.preventDefault();
  }, [clearReturnTimer, getSafePosition, markInteraction, transitionToState]);

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
    setIsDragging(false);
    resetSleepTimer();

    if (position) {
      saveStoredPosition(position);
    }

    if (drag.moved) {
      transitionToState(COMPANION_STATES.idle);
    } else {
      playTemporaryState(COMPANION_STATES.tap);
    }

    event.preventDefault();
  }, [playTemporaryState, position, resetSleepTimer, transitionToState]);

  const handlePointerCancel = useCallback((event) => {
    if (dragRef.current.pointerId === event.pointerId) {
      dragRef.current.active = false;
      setIsDragging(false);
      transitionToState(COMPANION_STATES.idle);
      resetSleepTimer();
    }
  }, [resetSleepTimer, transitionToState]);

  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    markInteraction();
    playTemporaryState(COMPANION_STATES.tap);
  }, [markInteraction, playTemporaryState]);

  return (
    <button
      type="button"
      className={[
        styles.root,
        styles.ready,
        isDragging ? styles.dragging : '',
        companionState === COMPANION_STATES.sleep ? styles.sleeping : '',
      ].filter(Boolean).join(' ')}
      style={{
        '--companion-x': `${position.x}px`,
        '--companion-y': `${position.y}px`,
        '--companion-width': `${getCompanionSize(getViewport().width).width}px`,
        '--companion-height': `${getCompanionSize(getViewport().width).height}px`,
      }}
      aria-label={label}
      title={metadata.displayName}
      data-companion-state={companionState}
      onPointerEnter={handlePointerEnter}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.frameShell} aria-hidden="true">
        <span className={styles.floatMotion}>
          <svg
            className={styles.spriteSvg}
            viewBox={`${currentFrame.x} ${currentFrame.y} ${currentFrame.width} ${currentFrame.height}`}
            preserveAspectRatio="xMidYMid meet"
            focusable="false"
          >
            <image
              href={spritesheetUrl}
              x="0"
              y="0"
              width={SPRITESHEET_SIZE.width}
              height={SPRITESHEET_SIZE.height}
            />
          </svg>
        </span>
      </span>
    </button>
  );
}
