import { redactN8nSecrets } from './n8nToolErrors.js';

const safeText = (value, limit) => redactN8nSecrets(value, limit) || null;
const safeDuration = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : null;
const safeCount = (value) => Number.isInteger(value) && value >= 0 ? value : null;

export function createN8nToolAuditRecord(value = {}) {
  return Object.freeze({
    auditType: 'tool_execution', runtime: 'n8n', contractVersion: 'n8n-tool.v1',
    requestId: safeText(value.requestId, 100), traceId: safeText(value.traceId, 100),
    agentId: safeText(value.agentId, 40), toolId: safeText(value.toolId, 80), taskType: safeText(value.taskType, 100),
    actorType: 'service', actorSource: 'nexaeon', status: safeText(value.status, 40),
    durationMs: safeDuration(value.durationMs), errorCode: safeText(value.errorCode, 100),
    resultCount: safeCount(value.resultCount),
    externalExecutionId: safeText(value.externalExecutionId, 200),
    timestamp: safeText(value.timestamp || new Date().toISOString(), 40),
  });
}

export function createN8nToolAuditCollector({ logger = console.info } = {}) {
  return Object.freeze({
    record(value) {
      const record = createN8nToolAuditRecord(value);
      try { logger(JSON.stringify(record)); } catch { /* audit logging must not alter the tool result */ }
      return record;
    },
  });
}
