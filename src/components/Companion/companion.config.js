export const COMPANION_ASSET_ROOT = '/companion/princess/';
export const COMPANION_POSITION_KEY = 'nexaeon-princess-companion-position';
export const COMPANION_PET_MANIFEST = 'pet.json';

export const DEFAULT_PRINCESS_METADATA = Object.freeze({
  id: 'princess-nexon',
  displayName: 'Princess Nexon',
  description: 'Princess companion',
  spritesheetPath: 'spritesheet.webp',
});

export const COMPANION_LABELS = Object.freeze({
  zh: 'Princess Companion。點擊互動，拖曳移動位置。',
  ko: 'Princess Companion. 클릭해 상호작용하고 드래그해 위치를 이동합니다.',
  en: 'Princess Companion. Click to interact and drag to move her position.',
});

export const COMPANION_TIMING = Object.freeze({
  blinkMs: 20_000,
  tiltMs: 40_000,
  lookAroundMs: 60_000,
  sleepAfterMs: 300_000,
  reducedMotionIdlePulseMs: 90_000,
});

export const COMPANION_STATE_DURATION = Object.freeze({
  blink: 900,
  tilt: 1_250,
  lookAround: 1_650,
  wake: 900,
  tap: 1_250,
});

export function getCompanionSize(viewportWidth = window.innerWidth) {
  if (viewportWidth <= 560) {
    return { width: 86, height: 112, edge: 14, bottomOffset: 82 };
  }

  if (viewportWidth <= 900) {
    return { width: 104, height: 136, edge: 18, bottomOffset: 92 };
  }

  return { width: 126, height: 164, edge: 24, bottomOffset: 96 };
}

export function getDefaultCompanionPosition(viewportWidth, viewportHeight, size) {
  return {
    x: viewportWidth - size.width - size.edge,
    y: viewportHeight - size.height - size.bottomOffset,
  };
}

export function clampCompanionPosition(position, viewportWidth, viewportHeight, size) {
  const maxX = Math.max(size.edge, viewportWidth - size.width - size.edge);
  const maxY = Math.max(size.edge, viewportHeight - size.height - size.edge);

  return {
    x: Math.min(Math.max(position.x, size.edge), maxX),
    y: Math.min(Math.max(position.y, size.edge), maxY),
  };
}

export function parseSavedCompanionPosition(rawValue) {
  if (!rawValue) return null;

  try {
    const value = JSON.parse(rawValue);
    if (!Number.isFinite(value?.x) || !Number.isFinite(value?.y)) return null;
    return { x: value.x, y: value.y };
  } catch {
    return null;
  }
}

export function resolveSpritesheetUrl(metadata) {
  const path = metadata?.spritesheetPath || DEFAULT_PRINCESS_METADATA.spritesheetPath;

  if (/^https?:\/\//i.test(path) || path.startsWith('/')) {
    return path;
  }

  return `${COMPANION_ASSET_ROOT}${path}`;
}
