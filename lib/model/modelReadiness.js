/* global process */

import { getModelConfiguration, getXchangeModelMode, MODEL_PROVIDERS } from './modelConfig.js';

export function getModelReadiness(env = process.env) {
  const mode = getXchangeModelMode(env);
  const config = getModelConfiguration(env);
  const providerValid = MODEL_PROVIDERS.includes(config.requestedProvider);
  const credentialsConfigured = config.provider === 'openai' && Boolean(config.apiKey);
  const providerReady = providerValid && config.provider !== 'disabled'
    && (config.provider === 'mock' || credentialsConfigured);
  const fallbackValid = ['mock', 'disabled'].includes(config.requestedFallbackProvider);
  return Object.freeze({
    ok: true,
    xchange: Object.freeze({
      mode,
      provider: config.provider,
      modelConfigured: Boolean(config.model),
      credentialsConfigured,
      fallback: config.fallbackProvider,
      readyForRules: true,
      readyForShadow: providerReady,
      readyForLive: providerReady && fallbackValid,
    }),
  });
}
