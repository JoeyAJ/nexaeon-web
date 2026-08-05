/* global process */

export const DEFAULT_MODEL_PROVIDER = 'mock';
export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini-2026-03-17';
export const MODEL_PROVIDERS = Object.freeze(['mock', 'openai', 'disabled']);

function integer(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export function getModelConfiguration(env = process.env) {
  const requestedProvider = String(env.NEXAEON_MODEL_PROVIDER || DEFAULT_MODEL_PROVIDER).trim().toLowerCase();
  const provider = MODEL_PROVIDERS.includes(requestedProvider) ? requestedProvider : 'disabled';
  return Object.freeze({
    provider,
    requestedProvider,
    model: String(env.NEXAEON_MODEL_NAME || env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL).trim(),
    apiKey: String(env.OPENAI_API_KEY || '').trim(),
    fallbackProvider: String(env.NEXAEON_MODEL_FALLBACK || 'mock').trim().toLowerCase() === 'mock' ? 'mock' : 'disabled',
    timeoutMs: integer(env.NEXAEON_MODEL_TIMEOUT_MS || env.NEXAEON_AGENT_TIMEOUT_MS, 25_000, 1_000, 30_000),
    maxOutputTokens: integer(env.NEXAEON_MODEL_MAX_OUTPUT_TOKENS, 8_000, 500, 16_000),
  });
}

export function publicModelConfiguration(config = getModelConfiguration()) {
  return {
    provider: config.provider,
    model: config.provider === 'mock' ? 'deterministic-v1' : config.model,
    configured: config.provider === 'mock' || (config.provider === 'openai' && Boolean(config.apiKey)),
    fallbackProvider: config.fallbackProvider,
  };
}
