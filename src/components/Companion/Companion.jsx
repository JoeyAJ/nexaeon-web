import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './Companion.module.css';
import {
  COMPANION_ASSET_ROOT,
  COMPANION_LABELS,
  COMPANION_PET_MANIFEST,
  COMPANION_POSITION_KEY,
  DEFAULT_PRINCESS_METADATA,
  clampCompanionPosition,
  getCompanionSize,
  getDefaultCompanionPosition,
  parseSavedCompanionPosition,
  resolveSpritesheetUrl,
} from './companion.config.js';
import {
  SPRITESHEET_SIZE,
  getCompanionFrame,
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

export default function Companion({ lang = 'zh' }) {
  const [metadata, setMetadata] = useState(DEFAULT_PRINCESS_METADATA);
  const [position, setPosition] = useState(() => getInitialPosition());
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef({
    active: false,
    pointerId: null,
    startPointerX: 0,
    startPointerY: 0,
    startPosition: { x: 0, y: 0 },
    moved: false,
  });

  const spritesheetUrl = useMemo(() => resolveSpritesheetUrl(metadata), [metadata]);
  const currentFrame = getCompanionFrame(COMPANION_STATES.idle, 0);
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
    setIsDragging(true);
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
    setIsDragging(false);

    if (position) {
      saveStoredPosition(position);
    }

    event.preventDefault();
  }, [position]);

  const handlePointerCancel = useCallback((event) => {
    if (dragRef.current.pointerId === event.pointerId) {
      dragRef.current.active = false;
      setIsDragging(false);
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
      }}
      aria-label={label}
      title={metadata.displayName}
      data-companion-state={COMPANION_STATES.idle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
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
