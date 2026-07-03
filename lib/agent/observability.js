import { randomUUID } from 'node:crypto';

export const NAVIGATOR_SERVICE_ID = 'nexaeon-navigator';
export const NAVIGATOR_SERVICE_NAME = 'NexAeon Navigator';

const SAFE_CATEGORIES = new Set([
  'request_received',
  'request_completed',
  'invalid_request',
  'rate_limited',
  'source_unavailable',
  'no_sources',
  'input_moderated',
  'input_moderation_unavailable',
  'model_timeout',
  'model_request_failed',
  'model_output_invalid',
  'citation_validation_failed',
  'language_validation_failed',
  'output_moderated',
  'output_moderation_unavailable',
  'forced_sources_only',
  'disabled',
]);

function nowIso() {
  return new Date().toISOString();
}

function safeNumber(value) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
}

export function createNavigatorRequestId() {
  return randomUUID();
}

export function getDurationMs(startedAt, endedAt = Date.now()) {
  return safeNumber(endedAt - startedAt);
}

export function extractOpenAIUsage(response) {
  const usage = response?.usage || response?.response?.usage || null;
  if (!usage || typeof usage !== 'object') {
    return { inputTokens: null, outputTokens: null, totalTokens: null };
  }

  const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? usage.inputTokens ?? null;
  const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? usage.outputTokens ?? null;
  const totalTokens = usage.total_tokens ?? usage.totalTokens ?? (
    Number.isFinite(Number(inputTokens)) && Number.isFinite(Number(outputTokens))
      ? Number(inputTokens) + Number(outputTokens)
      : null
  );

  return {
    inputTokens: Number.isFinite(Number(inputTokens)) ? Number(inputTokens) : null,
    outputTokens: Number.isFinite(Number(outputTokens)) ? Number(outputTokens) : null,
    totalTokens: Number.isFinite(Number(totalTokens)) ? Number(totalTokens) : null,
  };
}

export function logNavigatorEvent(event = {}, logger = console.error) {
  const safeEvent = {
    service: NAVIGATOR_SERVICE_ID,
    endpoint: '/api/agent/chat',
    requestId: event.requestId || createNavigatorRequestId(),
    category: SAFE_CATEGORIES.has(event.category) ? event.category : 'model_request_failed',
    timestamp: event.timestamp || nowIso(),
  };

  const optionalFields = [
    'mode',
    'reasonCategory',
    'statusCode',
    'durationMs',
    'totalDurationMs',
    'retrievalDurationMs',
    'moderationDurationMs',
    'modelDurationMs',
    'retrievedSourceCount',
    'failedSourceCount',
    'inputTokens',
    'outputTokens',
    'totalTokens',
    'model',
  ];

  for (const field of optionalFields) {
    if (event[field] === undefined) continue;
    safeEvent[field] = typeof event[field] === 'number' ? safeNumber(event[field]) : event[field];
  }

  logger(JSON.stringify(safeEvent));
  return safeEvent;
}
