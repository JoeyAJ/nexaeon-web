/* global process */

export const NAVIGATOR_DEFAULT_MAX_OUTPUT_TOKENS = 800;
export const NAVIGATOR_DEFAULT_TIMEOUT_MS = 25_000;
export const NAVIGATOR_DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini-2026-03-17';
export const NAVIGATOR_MIN_OUTPUT_TOKENS = 200;
export const NAVIGATOR_MAX_OUTPUT_TOKENS = 800;
export const NAVIGATOR_MIN_TIMEOUT_MS = 10_000;
export const NAVIGATOR_MAX_TIMEOUT_MS = 25_000;

function parseBoolean(value) {
  return value === 'true';
}

function hasOwn(env, key) {
  return Object.prototype.hasOwnProperty.call(env, key);
}

function parseIntegerInRange(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

export function getNavigatorProductionConfig(env = process.env) {
  const hasNewEnabled = hasOwn(env, 'NEXAEON_AGENT_ENABLED');
  const enabled = hasNewEnabled
    ? parseBoolean(env.NEXAEON_AGENT_ENABLED)
    : parseBoolean(env.NEXON_AGENT_ENABLED);

  return {
    enabled,
    forceSourcesOnly: parseBoolean(env.NEXAEON_AGENT_FORCE_SOURCES_ONLY),
    maxOutputTokens: parseIntegerInRange(
      env.NEXAEON_AGENT_MAX_OUTPUT_TOKENS,
      NAVIGATOR_MIN_OUTPUT_TOKENS,
      NAVIGATOR_MAX_OUTPUT_TOKENS,
      NAVIGATOR_DEFAULT_MAX_OUTPUT_TOKENS,
    ),
    timeoutMs: parseIntegerInRange(
      env.NEXAEON_AGENT_TIMEOUT_MS,
      NAVIGATOR_MIN_TIMEOUT_MS,
      NAVIGATOR_MAX_TIMEOUT_MS,
      NAVIGATOR_DEFAULT_TIMEOUT_MS,
    ),
    model: env.OPENAI_MODEL || NAVIGATOR_DEFAULT_OPENAI_MODEL,
    hasApiKey: Boolean(env.OPENAI_API_KEY),
  };
}

export function getExplorerProductionConfig(env = process.env) {
  const navigatorConfig = getNavigatorProductionConfig(env);
  const explorerEnabled = hasOwn(env, 'NEXAEON_EXPLORER_ENABLED')
    ? parseBoolean(env.NEXAEON_EXPLORER_ENABLED)
    : true;

  return {
    ...navigatorConfig,
    enabled: navigatorConfig.enabled && explorerEnabled,
    forceSourcesOnly: hasOwn(env, 'NEXAEON_EXPLORER_FORCE_SOURCES_ONLY')
      ? parseBoolean(env.NEXAEON_EXPLORER_FORCE_SOURCES_ONLY)
      : navigatorConfig.forceSourcesOnly,
  };
}

export function getXchangeProductionConfig(env = process.env) {
  const navigatorConfig = getNavigatorProductionConfig(env);
  const xchangeEnabled = hasOwn(env, 'NEXAEON_XCHANGE_ENABLED')
    ? parseBoolean(env.NEXAEON_XCHANGE_ENABLED)
    : true;

  return {
    ...navigatorConfig,
    enabled: navigatorConfig.enabled && xchangeEnabled,
    forceSourcesOnly: hasOwn(env, 'NEXAEON_XCHANGE_FORCE_SOURCES_ONLY')
      ? parseBoolean(env.NEXAEON_XCHANGE_FORCE_SOURCES_ONLY)
      : navigatorConfig.forceSourcesOnly,
  };
}

export function getArchivistProductionConfig(env = process.env) {
  const navigatorConfig = getNavigatorProductionConfig(env);
  const archivistEnabled = hasOwn(env, 'NEXAEON_ARCHIVIST_ENABLED')
    ? parseBoolean(env.NEXAEON_ARCHIVIST_ENABLED)
    : true;

  return {
    ...navigatorConfig,
    enabled: navigatorConfig.enabled && archivistEnabled,
    forceSourcesOnly: hasOwn(env, 'NEXAEON_ARCHIVIST_FORCE_SOURCES_ONLY')
      ? parseBoolean(env.NEXAEON_ARCHIVIST_FORCE_SOURCES_ONLY)
      : navigatorConfig.forceSourcesOnly,
  };
}

export function getEngineerProductionConfig(env = process.env) {
  const navigatorConfig = getNavigatorProductionConfig(env);
  const engineerEnabled = hasOwn(env, 'NEXAEON_ENGINEER_ENABLED')
    ? parseBoolean(env.NEXAEON_ENGINEER_ENABLED)
    : true;

  return {
    ...navigatorConfig,
    enabled: navigatorConfig.enabled && engineerEnabled,
    forceSourcesOnly: hasOwn(env, 'NEXAEON_ENGINEER_FORCE_SOURCES_ONLY')
      ? parseBoolean(env.NEXAEON_ENGINEER_FORCE_SOURCES_ONLY)
      : navigatorConfig.forceSourcesOnly,
  };
}

export function getOrchestratorProductionConfig(env = process.env) {
  const navigatorConfig = getNavigatorProductionConfig(env);
  const orchestratorEnabled = hasOwn(env, 'NEXAEON_ORCHESTRATOR_ENABLED')
    ? parseBoolean(env.NEXAEON_ORCHESTRATOR_ENABLED)
    : true;

  return {
    ...navigatorConfig,
    enabled: navigatorConfig.enabled && orchestratorEnabled,
    forceSourcesOnly: hasOwn(env, 'NEXAEON_ORCHESTRATOR_FORCE_SOURCES_ONLY')
      ? parseBoolean(env.NEXAEON_ORCHESTRATOR_FORCE_SOURCES_ONLY)
      : navigatorConfig.forceSourcesOnly,
  };
}

export function getNavigatorRuntimeMode(config = getNavigatorProductionConfig()) {
  if (!config.enabled) return 'disabled';
  if (config.forceSourcesOnly) return 'sources_only';
  return 'ai';
}
