/* global process */

import { buildN8nServiceHeaders } from './n8nServiceAuth.js';
import { createN8nToolAuditCollector } from './n8nToolAudit.js';
import { createN8nToolRequest, parseN8nToolResponse } from './n8nToolContracts.js';
import { N8nToolError, normalizeN8nToolError } from './n8nToolErrors.js';
import { getExecutionTool } from './toolExecutionRegistry.js';

function resolveWorkflowUrl(tool, env) {
  const configured = String(env[tool.workflowBinding] || '').trim();
  if (!configured) throw new N8nToolError('N8N_TOOL_NOT_CONFIGURED');
  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('unsafe');
    return url.toString();
  } catch {
    throw new N8nToolError('N8N_TOOL_NOT_CONFIGURED');
  }
}

function upstreamError(status, details) {
  if (status === 401) return new N8nToolError('N8N_TOOL_UNAUTHORIZED', { details });
  if (status === 403) return new N8nToolError('N8N_TOOL_FORBIDDEN', { details });
  if (status === 429) return new N8nToolError('N8N_TOOL_RATE_LIMITED', { retryable: true, details });
  if (status >= 500) return new N8nToolError('N8N_TOOL_UPSTREAM_ERROR', { retryable: true, details });
  return new N8nToolError('N8N_TOOL_BAD_RESPONSE', { details });
}

export async function executeN8nHttpRequest({ fetchImpl, url, options, timeoutMs, details }) {
  const controller = new AbortController();
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new N8nToolError('N8N_TOOL_TIMEOUT', { retryable: true, details }));
      }, timeoutMs);
    });
    return await Promise.race([fetchImpl(url, { ...options, signal: controller.signal }), timeout]);
  } catch (error) {
    throw normalizeN8nToolError(error, details);
  } finally {
    clearTimeout(timer);
  }
}

export function createN8nToolClient({ env = process.env, fetchImpl = fetch, auditCollector = createN8nToolAuditCollector() } = {}) {
  return Object.freeze({
    async execute({ requestId, traceId, agentId, toolId, taskType, input, idempotencyKey, authority }) {
      const startedAt = Date.now();
      let request;
      try {
        request = createN8nToolRequest({ requestId, traceId, agentId, toolId, taskType, input, idempotencyKey, authority });
        const tool = getExecutionTool(toolId);
        const details = { requestId, traceId, toolId };
        const response = await executeN8nHttpRequest({ fetchImpl, url: resolveWorkflowUrl(tool, env), options: {
          method: 'POST', headers: buildN8nServiceHeaders({ requestId, traceId, env }), body: JSON.stringify(request),
        }, timeoutMs: tool.timeoutMs, details });
        if (!response || typeof response.text !== 'function') throw new N8nToolError('N8N_TOOL_BAD_RESPONSE', { details });
        if (!response.ok) throw upstreamError(Number(response.status) || 502, details);
        const payload = parseN8nToolResponse(await response.text(), request);
        if (!payload.ok) throw new N8nToolError(payload.error.code, { details });
        auditCollector.record({
          requestId, traceId, agentId, toolId, taskType, status: 'succeeded', durationMs: Date.now() - startedAt,
          resultCount: toolId === 'web.search' ? payload.data.results.length : null,
          errorCode: null, externalExecutionId: payload.executionMetadata.externalExecutionId,
        });
        return payload;
      } catch (error) {
        const normalized = error instanceof N8nToolError ? error : normalizeN8nToolError(error, { requestId, traceId, toolId });
        auditCollector.record({ requestId, traceId, agentId, toolId, taskType, status: 'failed', durationMs: Date.now() - startedAt, resultCount: null, errorCode: normalized.code, externalExecutionId: null });
        throw normalized;
      }
    },
  });
}

export async function executeN8nTool(options, dependencies) {
  return createN8nToolClient(dependencies).execute(options);
}
