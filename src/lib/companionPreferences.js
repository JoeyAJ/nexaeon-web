export const COMPANION_PREFERENCES_VERSION = 1;
export const COMPANION_PREFERENCES_STORAGE_KEY = 'nexaeon-princess-companion-preferences';

export const LEGACY_COMPANION_STORAGE_KEYS = Object.freeze({
  position: 'nexaeon-princess-pet-position',
  scale: 'nexaeon-princess-pet-scale',
  settings: 'nexaeon-princess-companion-settings',
});

export const COMPANION_SCALE_LIMITS = Object.freeze({ min: 0.72, max: 1.32 });
export const COMPANION_MOTION_LEVELS = Object.freeze(['full', 'reduced', 'none']);

export const DEFAULT_COMPANION_PREFERENCES = Object.freeze({
  version: COMPANION_PREFERENCES_VERSION,
  visible: true,
  autoBehavior: true,
  proactiveBubbles: true,
  accessoriesEnabled: true,
  interactionEnabled: true,
  motionLevel: 'full',
  soundEnabled: false,
  position: null,
  scale: 1,
  dockMode: 'settings',
  lastModule: null,
  updatedAt: null,
});

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function safeParse(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return null;
  try {
    const value = JSON.parse(rawValue);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function normalizePosition(value) {
  if (!isRecord(value) || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
  const x = Number(value.x);
  const y = Number(value.y);
  if (x < -0.25 || x > 1.25 || y < -0.25 || y > 1.25) return null;
  return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
}

export function sanitizeCompanionPreferences(value, updatedAt = null) {
  const source = isRecord(value) ? value : {};
  const motionLevel = COMPANION_MOTION_LEVELS.includes(source.motionLevel)
    ? source.motionLevel
    : DEFAULT_COMPANION_PREFERENCES.motionLevel;
  const scale = Number.isFinite(source.scale)
    ? clamp(Number(source.scale), COMPANION_SCALE_LIMITS.min, COMPANION_SCALE_LIMITS.max)
    : DEFAULT_COMPANION_PREFERENCES.scale;

  return {
    version: COMPANION_PREFERENCES_VERSION,
    visible: typeof source.visible === 'boolean' ? source.visible : true,
    autoBehavior: typeof source.autoBehavior === 'boolean'
      ? source.autoBehavior
      : typeof source.autoBehaviorEnabled === 'boolean' ? source.autoBehaviorEnabled : true,
    proactiveBubbles: typeof source.proactiveBubbles === 'boolean' ? source.proactiveBubbles : true,
    accessoriesEnabled: typeof source.accessoriesEnabled === 'boolean' ? source.accessoriesEnabled : true,
    interactionEnabled: typeof source.interactionEnabled === 'boolean' ? source.interactionEnabled : true,
    motionLevel,
    soundEnabled: typeof source.soundEnabled === 'boolean' ? source.soundEnabled : false,
    position: normalizePosition(source.position),
    scale,
    dockMode: source.dockMode === 'settings' ? 'settings' : 'settings',
    lastModule: typeof source.lastModule === 'string' && source.lastModule.length <= 80
      ? source.lastModule
      : null,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : updatedAt,
  };
}

export function getCompanionStorage(windowTarget = typeof window === 'undefined' ? null : window) {
  try {
    return windowTarget?.localStorage || null;
  } catch {
    return null;
  }
}

function readLegacyPreferences(storage, viewport) {
  try {
    const settings = safeParse(storage?.getItem(LEGACY_COMPANION_STORAGE_KEYS.settings)) || {};
    const scaleRecord = safeParse(storage?.getItem(LEGACY_COMPANION_STORAGE_KEYS.scale));
    const positionRecord = safeParse(storage?.getItem(LEGACY_COMPANION_STORAGE_KEYS.position));
    const hasLegacyData = Boolean(
      storage?.getItem(LEGACY_COMPANION_STORAGE_KEYS.settings)
      || storage?.getItem(LEGACY_COMPANION_STORAGE_KEYS.scale)
      || storage?.getItem(LEGACY_COMPANION_STORAGE_KEYS.position)
    );
    if (!hasLegacyData) return null;

    const width = Math.max(1, Number(viewport?.width) || 1280);
    const height = Math.max(1, Number(viewport?.height) || 800);
    const position = positionRecord && Number.isFinite(positionRecord.x) && Number.isFinite(positionRecord.y)
      ? { x: Number(positionRecord.x) / width, y: Number(positionRecord.y) / height }
      : null;

    return sanitizeCompanionPreferences({
      ...settings,
      autoBehavior: settings.autoBehaviorEnabled,
      scale: scaleRecord?.scale,
      position,
    });
  } catch {
    return null;
  }
}

function writeRecord(storage, preferences, now = new Date()) {
  if (!storage) return false;
  try {
    const updatedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
    const next = sanitizeCompanionPreferences({ ...preferences, updatedAt }, updatedAt);
    storage.setItem(COMPANION_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function readCompanionPreferences(storage, options = {}) {
  try {
    const stored = safeParse(storage?.getItem(COMPANION_PREFERENCES_STORAGE_KEY));
    if (stored?.version === COMPANION_PREFERENCES_VERSION) {
      return sanitizeCompanionPreferences(stored);
    }

    const migrated = readLegacyPreferences(storage, options.viewport);
    const futureVersion = Number.isInteger(stored?.version) && stored.version > COMPANION_PREFERENCES_VERSION;
    const fallback = migrated || (futureVersion
      ? { ...DEFAULT_COMPANION_PREFERENCES }
      : sanitizeCompanionPreferences(stored));
    if (storage && writeRecord(storage, fallback, options.now)) {
      for (const key of Object.values(LEGACY_COMPANION_STORAGE_KEYS)) storage.removeItem(key);
    }
    return fallback;
  } catch {
    return { ...DEFAULT_COMPANION_PREFERENCES };
  }
}

export function writeCompanionPreferences(storage, preferences, now) {
  return writeRecord(storage, preferences, now);
}

export function updateCompanionPreferences(storage, patch, options = {}) {
  const current = readCompanionPreferences(storage, options);
  const next = sanitizeCompanionPreferences({ ...current, ...patch });
  writeRecord(storage, next, options.now);
  return next;
}

export function resetCompanionPreferences(storage, now) {
  const next = { ...DEFAULT_COMPANION_PREFERENCES };
  writeRecord(storage, next, now);
  return next;
}

export function resetCompanionLayout(storage, now) {
  return updateCompanionPreferences(storage, { position: null, scale: 1 }, { now });
}

export function toNormalizedPosition(position, viewport) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
  const width = Math.max(1, Number(viewport?.width) || 1280);
  const height = Math.max(1, Number(viewport?.height) || 800);
  return normalizePosition({ x: Number(position.x) / width, y: Number(position.y) / height });
}

export function fromNormalizedPosition(position, viewport) {
  const normalized = normalizePosition(position);
  if (!normalized) return null;
  const width = Math.max(1, Number(viewport?.width) || 1280);
  const height = Math.max(1, Number(viewport?.height) || 800);
  return { x: normalized.x * width, y: normalized.y * height };
}

export function resolveEffectiveMotionLevel(userLevel, systemPrefersReducedMotion = false) {
  if (userLevel === 'none') return 'none';
  if (userLevel === 'reduced' || systemPrefersReducedMotion) return 'reduced';
  return 'full';
}
