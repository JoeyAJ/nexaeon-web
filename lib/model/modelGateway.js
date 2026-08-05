/* global process */

import { randomUUID } from 'node:crypto';
import { getModelConfiguration } from './modelConfig.js';
import { ModelGatewayError, normalizeModelError } from './modelErrors.js';
import { createModelProviderRegistry } from './providerRegistry.js';
import { createMockModelProvider } from './providers/mockProvider.js';
import { createOpenAIModelProvider } from './providers/openaiProvider.js';
import { parseStructuredModelOutput, validateStrictSchema } from './schemaValidation.js';

function metadata({ requestedProvider, provider, model, fallbackUsed, requestId, startedAt, usage, fallbackReason = null }) {
  return Object.freeze({
    provider, requestedProvider, actualProvider: provider, model,
    generationMode: fallbackUsed ? 'fallback' : provider === 'mock' ? 'deterministic' : 'real',
    fallbackUsed, requestId, generatedAt: new Date().toISOString(), latencyMs: Math.max(0, Date.now() - startedAt),
    tokenUsage: usage || null, ...(fallbackReason ? { fallbackReason } : {}),
  });
}

export function createModelGateway({ env = process.env, registry, openaiClient } = {}) {
  const config = getModelConfiguration(env);
  const providers = registry || createModelProviderRegistry([
    createMockModelProvider(), createOpenAIModelProvider({ config, client: openaiClient }),
  ]);

  async function invoke(kind, request) {
    const requestId = request.requestId || randomUUID();
    const startedAt = Date.now();
    if (config.provider === 'disabled') throw new ModelGatewayError('MODEL_DISABLED', { status: 503 });
    let selected = config.provider;
    let fallbackReason = null;
    let result;
    try {
      result = await providers.get(selected)[kind]({ ...request, requestId });
      if (kind === 'structuredGenerate') result = { ...result, output: validateStrictSchema(parseStructuredModelOutput(result.output), request.schema) };
    } catch (error) {
      const normalized = normalizeModelError(error, selected);
      if (selected === 'mock' || config.fallbackProvider !== 'mock' || typeof request.mockResult !== 'function') throw normalized;
      fallbackReason = normalized.code;
      selected = 'mock';
      result = await providers.get(selected)[kind]({ ...request, requestId });
      if (kind === 'structuredGenerate') result = { ...result, output: validateStrictSchema(parseStructuredModelOutput(result.output), request.schema) };
    }
    return {
      output: result.output,
      metadata: metadata({ requestedProvider: config.provider, provider: selected, model: result.model, fallbackUsed: Boolean(fallbackReason), requestId, startedAt, usage: result.usage, fallbackReason }),
    };
  }

  return Object.freeze({
    structuredGenerate(request) { return invoke('structuredGenerate', request); },
    textGenerate(request) { return invoke('textGenerate', request); },
    health() { return { activeProvider: config.provider, fallbackProvider: config.fallbackProvider, providers: providers.health() }; },
  });
}
