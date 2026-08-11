/* global process */

import { randomUUID } from 'node:crypto';
import { getModelConfiguration, MODEL_GATEWAY_LIMITS } from './modelConfig.js';
import { ModelGatewayError, normalizeModelError } from './modelErrors.js';
import { createModelUsageCollector } from './modelUsage.js';
import { createModelProviderRegistry } from './providerRegistry.js';
import { createMockModelProvider } from './providers/mockProvider.js';
import { createOpenAIModelProvider } from './providers/openaiProvider.js';
import { parseStructuredModelOutput, validateStrictSchema } from './schemaValidation.js';

function metadata({ requestedProvider, provider, model, fallbackUsed, requestId, traceId, startedAt, usage, attempts, request, fallbackReason = null }) {
  return Object.freeze({
    provider, requestedProvider, actualProvider: provider, model,
    generationMode: fallbackUsed ? 'fallback' : provider === 'mock' ? 'deterministic' : 'real',
    fallbackUsed, requestId, traceId, generatedAt: new Date().toISOString(), latencyMs: Math.max(0, Date.now() - startedAt),
    taskType: request.task || null, promptVersion: request.promptVersion || null, schemaVersion: request.schemaVersion || null,
    validatorVersion: request.validatorVersion || null, retryCount: 0, maxAttempts: MODEL_GATEWAY_LIMITS.maxTotalAttempts,
    attempts: Object.freeze(attempts), status: 'succeeded', errorCode: null, estimatedCost: null,
    tokenUsage: usage || null, ...(fallbackReason ? { fallbackReason } : {}),
  });
}

async function withTimeout(work, timeoutMs, provider) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(work),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new ModelGatewayError('MODEL_TIMEOUT', { status: 504, retryable: true, provider })), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}

export function createModelGateway({ env = process.env, registry, openaiClient, usageCollector } = {}) {
  const config = getModelConfiguration(env);
  const providers = registry || createModelProviderRegistry([
    createMockModelProvider(), createOpenAIModelProvider({ config, client: openaiClient }),
  ]);
  const collector = usageCollector || createModelUsageCollector();

  async function invoke(kind, request) {
    const requestId = request.requestId || randomUUID();
    const traceId = request.traceId || requestId;
    const startedAt = Date.now();
    if (config.provider === 'disabled') throw new ModelGatewayError('MODEL_DISABLED', { status: 503 });
    let selected = config.provider;
    let fallbackReason = null;
    const attempts = [];
    const attempt = async (provider, fallbackUsed) => {
      const attemptStartedAt = Date.now();
      const attemptNumber = attempts.length + 1;
      try {
        let result = await withTimeout(() => providers.get(provider)[kind]({ ...request, requestId, traceId }), config.timeoutMs, provider);
        if (kind === 'structuredGenerate') result = { ...result, output: validateStrictSchema(parseStructuredModelOutput(result.output), request.schema) };
        attempts.push(collector.record({
          requestId, traceId, previewId: request.previewId, agentId: request.agentId, taskType: request.task,
          provider, model: result.model, promptVersion: request.promptVersion, schemaVersion: request.schemaVersion,
          validatorVersion: request.validatorVersion, attempt: attemptNumber, retryCount: 0, fallbackUsed,
          status: 'succeeded', errorCode: null, tokenUsage: result.usage || null, latencyMs: Date.now() - attemptStartedAt,
        }));
        return result;
      } catch (error) {
        const normalized = normalizeModelError(error, provider);
        attempts.push(collector.record({
          requestId, traceId, previewId: request.previewId, agentId: request.agentId, taskType: request.task,
          provider, model: provider === 'mock' ? 'deterministic-v1' : config.model,
          promptVersion: request.promptVersion, schemaVersion: request.schemaVersion, validatorVersion: request.validatorVersion,
          attempt: attemptNumber, retryCount: 0, fallbackUsed, status: 'failed', errorCode: normalized.code,
          tokenUsage: null, latencyMs: Date.now() - attemptStartedAt,
        }));
        normalized.details = { ...normalized.details, requestId, traceId, retryCount: 0, attempts: [...attempts] };
        throw normalized;
      }
    };
    let result;
    try {
      result = await attempt(selected, false);
    } catch (error) {
      if (selected === 'mock' || config.fallbackProvider !== 'mock' || typeof request.mockResult !== 'function') throw error;
      fallbackReason = error.code;
      selected = 'mock';
      result = await attempt(selected, true);
    }
    return {
      output: result.output,
      metadata: metadata({ requestedProvider: config.provider, provider: selected, model: result.model, fallbackUsed: Boolean(fallbackReason), requestId, traceId, startedAt, usage: result.usage, attempts, request, fallbackReason }),
    };
  }

  return Object.freeze({
    structuredGenerate(request) { return invoke('structuredGenerate', request); },
    textGenerate(request) { return invoke('textGenerate', request); },
    health() { return { activeProvider: config.provider, fallbackProvider: config.fallbackProvider, providers: providers.health() }; },
  });
}
