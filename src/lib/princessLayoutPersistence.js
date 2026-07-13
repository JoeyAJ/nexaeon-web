import {
  COMPANION_PREFERENCES_VERSION,
  COMPANION_SCALE_LIMITS,
  DEFAULT_COMPANION_PREFERENCES,
  LEGACY_COMPANION_STORAGE_KEYS,
  fromNormalizedPosition,
  getCompanionStorage,
  readCompanionPreferences,
  toNormalizedPosition,
  updateCompanionPreferences,
} from './companionPreferences.js';

export const PRINCESS_LAYOUT_STORAGE_VERSION = COMPANION_PREFERENCES_VERSION;
export const PRINCESS_POSITION_STORAGE_KEY = LEGACY_COMPANION_STORAGE_KEYS.position;
export const PRINCESS_SCALE_STORAGE_KEY = LEGACY_COMPANION_STORAGE_KEYS.scale;
export const PRINCESS_SETTINGS_STORAGE_KEY = LEGACY_COMPANION_STORAGE_KEYS.settings;
export const DEFAULT_PRINCESS_SETTINGS = Object.freeze({
  visible: DEFAULT_COMPANION_PREFERENCES.visible,
  autoBehaviorEnabled: DEFAULT_COMPANION_PREFERENCES.autoBehavior,
  interactionEnabled: DEFAULT_COMPANION_PREFERENCES.interactionEnabled,
});

function getViewport(viewport) {
  if (viewport) return viewport;
  if (typeof window === 'undefined') return { width: 1280, height: 800 };
  return {
    width: window.innerWidth || document.documentElement.clientWidth || 1280,
    height: window.innerHeight || document.documentElement.clientHeight || 800,
  };
}

export const getPrincessStorage = getCompanionStorage;

export function parseStoredPrincessPosition(rawValue) {
  try {
    const value = JSON.parse(rawValue);
    return value && Number.isFinite(value.x) && Number.isFinite(value.y)
      ? { x: Number(value.x), y: Number(value.y) }
      : null;
  } catch { return null; }
}

export function parseStoredPrincessScale(rawValue) {
  try {
    const value = JSON.parse(rawValue);
    return value && Number.isFinite(value.scale) ? Number(value.scale) : null;
  } catch { return null; }
}

export function parseStoredPrincessSettings(rawValue) {
  try {
    const value = JSON.parse(rawValue);
    if (!value || typeof value !== 'object' || (value.version !== undefined && value.version !== 1)) {
      return { ...DEFAULT_PRINCESS_SETTINGS };
    }
    return {
      visible: typeof value.visible === 'boolean' ? value.visible : true,
      autoBehaviorEnabled: typeof value.autoBehaviorEnabled === 'boolean' ? value.autoBehaviorEnabled : true,
      interactionEnabled: typeof value.interactionEnabled === 'boolean' ? value.interactionEnabled : true,
    };
  } catch { return { ...DEFAULT_PRINCESS_SETTINGS }; }
}

export function readPrincessPosition(storage, viewport) {
  return fromNormalizedPosition(readCompanionPreferences(storage, { viewport: getViewport(viewport) }).position, getViewport(viewport));
}

export function readPrincessScale(storage) {
  return readCompanionPreferences(storage).scale;
}

export function readPrincessSettings(storage) {
  const preferences = readCompanionPreferences(storage);
  return {
    visible: preferences.visible,
    autoBehaviorEnabled: preferences.autoBehavior,
    interactionEnabled: preferences.interactionEnabled,
  };
}

export function writePrincessPosition(storage, position, updatedAt = Date.now(), viewport) {
  const normalized = toNormalizedPosition(position, getViewport(viewport));
  if (!normalized) return false;
  updateCompanionPreferences(storage, { position: normalized }, { now: updatedAt, viewport: getViewport(viewport) });
  return Boolean(storage);
}

export function writePrincessScale(storage, scale, updatedAt = Date.now()) {
  const safeScale = Math.min(Math.max(Number(scale), COMPANION_SCALE_LIMITS.min), COMPANION_SCALE_LIMITS.max);
  if (!Number.isFinite(safeScale)) return false;
  updateCompanionPreferences(storage, { scale: safeScale }, { now: updatedAt });
  return Boolean(storage);
}

export function writePrincessSettings(storage, settings, updatedAt = Date.now()) {
  updateCompanionPreferences(storage, {
    visible: settings.visible,
    autoBehavior: settings.autoBehaviorEnabled,
    interactionEnabled: settings.interactionEnabled,
  }, { now: updatedAt });
  return Boolean(storage);
}

export function clearPrincessPosition(storage) {
  updateCompanionPreferences(storage, { position: null });
  return Boolean(storage);
}

export function clearPrincessScale(storage) {
  updateCompanionPreferences(storage, { scale: 1 });
  return Boolean(storage);
}

export function clearPrincessSettings(storage) {
  updateCompanionPreferences(storage, DEFAULT_PRINCESS_SETTINGS);
  return Boolean(storage);
}

export function clearPrincessLayout(storage) {
  updateCompanionPreferences(storage, { position: null, scale: 1 });
  return Boolean(storage);
}

export function clampPrincessPosition({ position, viewportWidth, viewportHeight, safeArea, size, scale, visualWidthMultiplier }) {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const visualWidth = size.width * visualWidthMultiplier * scale;
  const horizontalOverflow = Math.max(0, (visualWidth - size.width) / 2);
  const topOverflow = Math.max(0, size.height * scale - size.height);
  const settingsClearance = viewportWidth <= 520 ? 76 : 72;
  const minX = safeArea.left + horizontalOverflow;
  const maxX = viewportWidth - safeArea.right - size.width - horizontalOverflow;
  const minY = safeArea.top + topOverflow;
  const maxY = viewportHeight - Math.max(safeArea.bottom, settingsClearance) - size.height;
  return {
    x: maxX < minX ? Math.max(12, (viewportWidth - size.width) / 2) : clamp(position.x, minX, maxX),
    y: maxY < minY ? Math.max(12, (viewportHeight - size.height) / 2) : clamp(position.y, minY, maxY),
  };
}

export function subscribePrincessViewportChanges(windowTarget, callback) {
  if (!windowTarget?.addEventListener || !windowTarget?.removeEventListener) return () => {};
  const visualViewport = windowTarget.visualViewport;
  windowTarget.addEventListener('resize', callback);
  windowTarget.addEventListener('orientationchange', callback);
  visualViewport?.addEventListener?.('resize', callback);
  return () => {
    windowTarget.removeEventListener('resize', callback);
    windowTarget.removeEventListener('orientationchange', callback);
    visualViewport?.removeEventListener?.('resize', callback);
  };
}
