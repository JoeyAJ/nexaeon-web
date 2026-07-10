export const PRINCESS_LAYOUT_STORAGE_VERSION = 1;
export const PRINCESS_POSITION_STORAGE_KEY = 'nexaeon-princess-pet-position';
export const PRINCESS_SCALE_STORAGE_KEY = 'nexaeon-princess-pet-scale';
export const PRINCESS_SETTINGS_STORAGE_KEY = 'nexaeon-princess-companion-settings';
export const DEFAULT_PRINCESS_SETTINGS = Object.freeze({
  visible: true,
  autoBehaviorEnabled: true,
  interactionEnabled: true,
});

export function getPrincessStorage(windowTarget) {
  try {
    return windowTarget?.localStorage || null;
  } catch {
    return null;
  }
}

function parseRecord(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (parsed.version !== undefined && parsed.version !== PRINCESS_LAYOUT_STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseStoredPrincessPosition(rawValue) {
  const parsed = parseRecord(rawValue);
  if (!parsed || !Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
  return { x: Number(parsed.x), y: Number(parsed.y) };
}

export function parseStoredPrincessScale(rawValue) {
  const parsed = parseRecord(rawValue);
  if (!parsed || !Number.isFinite(parsed.scale)) return null;
  return Number(parsed.scale);
}

export function parseStoredPrincessSettings(rawValue) {
  const parsed = parseRecord(rawValue);
  if (!parsed) return { ...DEFAULT_PRINCESS_SETTINGS };

  return {
    visible: typeof parsed.visible === 'boolean' ? parsed.visible : DEFAULT_PRINCESS_SETTINGS.visible,
    autoBehaviorEnabled: typeof parsed.autoBehaviorEnabled === 'boolean'
      ? parsed.autoBehaviorEnabled
      : DEFAULT_PRINCESS_SETTINGS.autoBehaviorEnabled,
    interactionEnabled: typeof parsed.interactionEnabled === 'boolean'
      ? parsed.interactionEnabled
      : DEFAULT_PRINCESS_SETTINGS.interactionEnabled,
  };
}

export function createPrincessPositionRecord(position, updatedAt = Date.now()) {
  return {
    version: PRINCESS_LAYOUT_STORAGE_VERSION,
    x: Number(position.x),
    y: Number(position.y),
    updatedAt,
  };
}

export function createPrincessScaleRecord(scale, updatedAt = Date.now()) {
  return {
    version: PRINCESS_LAYOUT_STORAGE_VERSION,
    scale: Number(scale),
    updatedAt,
  };
}

export function createPrincessSettingsRecord(settings, updatedAt = Date.now()) {
  return {
    version: PRINCESS_LAYOUT_STORAGE_VERSION,
    visible: Boolean(settings.visible),
    autoBehaviorEnabled: Boolean(settings.autoBehaviorEnabled),
    interactionEnabled: Boolean(settings.interactionEnabled),
    updatedAt,
  };
}

export function readPrincessPosition(storage) {
  try {
    return parseStoredPrincessPosition(storage?.getItem(PRINCESS_POSITION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function readPrincessScale(storage) {
  try {
    return parseStoredPrincessScale(storage?.getItem(PRINCESS_SCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function readPrincessSettings(storage) {
  try {
    return parseStoredPrincessSettings(storage?.getItem(PRINCESS_SETTINGS_STORAGE_KEY));
  } catch {
    return { ...DEFAULT_PRINCESS_SETTINGS };
  }
}

export function writePrincessPosition(storage, position, updatedAt = Date.now()) {
  try {
    storage?.setItem(
      PRINCESS_POSITION_STORAGE_KEY,
      JSON.stringify(createPrincessPositionRecord(position, updatedAt)),
    );
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function writePrincessScale(storage, scale, updatedAt = Date.now()) {
  try {
    storage?.setItem(
      PRINCESS_SCALE_STORAGE_KEY,
      JSON.stringify(createPrincessScaleRecord(scale, updatedAt)),
    );
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function writePrincessSettings(storage, settings, updatedAt = Date.now()) {
  try {
    storage?.setItem(
      PRINCESS_SETTINGS_STORAGE_KEY,
      JSON.stringify(createPrincessSettingsRecord(settings, updatedAt)),
    );
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function clearPrincessPosition(storage) {
  try {
    storage?.removeItem(PRINCESS_POSITION_STORAGE_KEY);
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function clearPrincessScale(storage) {
  try {
    storage?.removeItem(PRINCESS_SCALE_STORAGE_KEY);
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function clearPrincessSettings(storage) {
  try {
    storage?.removeItem(PRINCESS_SETTINGS_STORAGE_KEY);
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function clearPrincessLayout(storage) {
  try {
    storage?.removeItem(PRINCESS_POSITION_STORAGE_KEY);
    storage?.removeItem(PRINCESS_SCALE_STORAGE_KEY);
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function clampPrincessPosition({
  position,
  viewportWidth,
  viewportHeight,
  safeArea,
  size,
  scale,
  visualWidthMultiplier,
}) {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const visualWidth = size.width * visualWidthMultiplier * scale;
  const horizontalOverflow = Math.max(0, (visualWidth - size.width) / 2);
  const topOverflow = Math.max(0, size.height * scale - size.height);
  const minX = safeArea.left + horizontalOverflow;
  const maxX = viewportWidth - safeArea.right - size.width - horizontalOverflow;
  const minY = safeArea.top + topOverflow;
  const maxY = viewportHeight - safeArea.bottom - size.height;

  return {
    x: maxX < minX ? Math.max(12, (viewportWidth - size.width) / 2) : clamp(position.x, minX, maxX),
    y: maxY < minY ? Math.max(12, (viewportHeight - size.height) / 2) : clamp(position.y, minY, maxY),
  };
}

export function subscribePrincessViewportChanges(windowTarget, callback) {
  if (!windowTarget?.addEventListener || !windowTarget?.removeEventListener) {
    return () => {};
  }

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
