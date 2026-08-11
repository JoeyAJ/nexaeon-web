import { redactModelSecrets } from './modelErrors.js';

const safeText = (value, limit = 100) => redactModelSecrets(value).replace(/\s+/gu, ' ').trim().slice(0, limit) || null;
const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : null;

export function createModelUsageRecord(value = {}) {
  const usage = value.tokenUsage && typeof value.tokenUsage === 'object' ? value.tokenUsage : {};
  return Object.freeze({
    event: 'model_usage_attempt',
    requestId: safeText(value.requestId),
    traceId: safeText(value.traceId),
    previewId: safeText(value.previewId),
    agentId: safeText(value.agentId),
    taskType: safeText(value.taskType),
    provider: safeText(value.provider),
    model: safeText(value.model),
    promptVersion: safeText(value.promptVersion),
    schemaVersion: safeText(value.schemaVersion),
    validatorVersion: safeText(value.validatorVersion),
    attempt: safeNumber(value.attempt),
    retryCount: safeNumber(value.retryCount) ?? 0,
    fallbackUsed: value.fallbackUsed === true,
    status: safeText(value.status),
    errorCode: safeText(value.errorCode),
    inputTokens: safeNumber(usage.inputTokens),
    outputTokens: safeNumber(usage.outputTokens),
    totalTokens: safeNumber(usage.totalTokens),
    latencyMs: safeNumber(value.latencyMs),
    estimatedCost: null,
  });
}

export function createModelUsageCollector({ logger = console.info } = {}) {
  return Object.freeze({
    record(value) {
      const record = createModelUsageRecord(value);
      try { logger(JSON.stringify(record)); } catch { /* usage telemetry must not affect generation */ }
      return record;
    },
  });
}
