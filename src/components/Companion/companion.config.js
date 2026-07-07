export const COMPANION_ASSET_ROOT = '/companion/princess/';
export const COMPANION_POSITION_KEY = 'nexaeon-princess-companion-position';
export const COMPANION_PET_MANIFEST = 'pet.json';

export const DEFAULT_PRINCESS_METADATA = Object.freeze({
  id: 'princess-nexon',
  displayName: 'Princess Nexon',
  description: 'Princess companion',
  imagePath: 'princess-full.webp',
});

export const COMPANION_LABELS = Object.freeze({
  zh: 'Princess Companion。點擊互動，拖曳移動位置。',
  ko: 'Princess Companion. 클릭해 상호작용하고 드래그해 위치를 이동합니다.',
  en: 'Princess Companion. Click to interact and drag to move her position.',
});

const PRINCESS_IMAGE_RATIO = 242 / 170;

export function getCompanionSize(viewportWidth = 1280) {
  const width = viewportWidth < 480
    ? Math.min(Math.max(viewportWidth * 0.21, 72), 96)
    : Math.min(Math.max(viewportWidth * 0.12, 96), 160);

  return {
    width: Math.round(width),
    height: Math.round(width * PRINCESS_IMAGE_RATIO),
    edge: viewportWidth < 480 ? 18 : 24,
    bottomOffset: viewportWidth < 480 ? 86 : 96,
  };
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

export function resolveCompanionImageUrl(metadata) {
  const path = metadata?.imagePath || DEFAULT_PRINCESS_METADATA.imagePath;

  if (/^https?:\/\//i.test(path) || path.startsWith('/')) {
    return path;
  }

  return `${COMPANION_ASSET_ROOT}${path}`;
}
