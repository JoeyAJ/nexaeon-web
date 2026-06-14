export const LAUNCH_MODES = Object.freeze({
  EXTERNAL: 'External',
  EMBEDDED: 'Embedded',
  INTERNAL: 'Internal',
});

const LAUNCH_MODE_ALIASES = new Map([
  ['external', LAUNCH_MODES.EXTERNAL],
  ['external url', LAUNCH_MODES.EXTERNAL],
  ['embedded', LAUNCH_MODES.EMBEDDED],
  ['embed', LAUNCH_MODES.EMBEDDED],
  ['iframe', LAUNCH_MODES.EMBEDDED],
  ['internal', LAUNCH_MODES.INTERNAL],
  ['in-app', LAUNCH_MODES.INTERNAL],
  ['in app', LAUNCH_MODES.INTERNAL],
]);

export function normalizeLaunchMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return LAUNCH_MODE_ALIASES.get(normalized) || null;
}

function getCurrentHostname() {
  if (typeof window === 'undefined') return '';
  return window.location?.hostname || '';
}

function getDefaultUrlEnvironment() {
  const hostname = getCurrentHostname();
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
  return 'production';
}

export function getValidatedDemoUrl(value, options = {}) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    return null;
  }

  if (parsed.protocol === 'https:') return parsed.href;

  const environment = options.environment || getDefaultUrlEnvironment();
  const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (environment === 'development' && parsed.protocol === 'http:' && isLocalHost) {
    return parsed.href;
  }

  return null;
}

export function isSafeDemoUrl(value, options = {}) {
  return Boolean(getValidatedDemoUrl(value, options));
}

export function resolveDemoLaunch(item, options = {}) {
  const mode = normalizeLaunchMode(item?.launchMode);
  const safeDemoUrl = getValidatedDemoUrl(item?.demoUrl, options);

  if (mode === LAUNCH_MODES.INTERNAL) {
    return {
      mode,
      canLaunch: true,
      url: safeDemoUrl,
    };
  }

  if (mode === LAUNCH_MODES.EMBEDDED) {
    return {
      mode,
      canLaunch: Boolean(safeDemoUrl),
      url: safeDemoUrl,
    };
  }

  if (mode === LAUNCH_MODES.EXTERNAL || (!mode && safeDemoUrl)) {
    return {
      mode: LAUNCH_MODES.EXTERNAL,
      canLaunch: Boolean(safeDemoUrl),
      url: safeDemoUrl,
    };
  }

  return {
    mode: null,
    canLaunch: false,
    url: null,
  };
}

export function isSafeSlug(value) {
  return /^[a-z0-9][a-z0-9-]*$/i.test(String(value || '').trim());
}

export function getInternalDemoStatus(slug, registry = {}) {
  if (!isSafeSlug(slug)) return 'unregistered';
  return Object.prototype.hasOwnProperty.call(registry, slug) ? 'registered' : 'unregistered';
}
