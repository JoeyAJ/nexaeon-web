import { Buffer } from 'node:buffer';
import { getAgentRuntimeContract } from './runtimeRegistry.js';
import { N8N_TOOL_CONTRACT_VERSION, getExecutionTool } from './toolExecutionRegistry.js';
import { N8N_TOOL_ERROR_CODES, N8nToolError, n8nToolFail, redactN8nSecrets } from './n8nToolErrors.js';

export const MAX_N8N_TOOL_REQUEST_BYTES = 32_768;
export const MAX_N8N_TOOL_RESPONSE_BYTES = 262_144;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,99}$/u;

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function invalid(code, path) {
  throw new N8nToolError(code, { details: { field: path } });
}

function validate(value, schema, path, code) {
  if (!schema || typeof schema !== 'object') invalid(code, path);
  const received = typeOf(value);
  if (schema.type && !(schema.type === 'integer' ? received === 'number' && Number.isInteger(value) : received === schema.type)) invalid(code, path);
  if (schema.enum && !schema.enum.includes(value)) invalid(code, path);
  if (schema.type === 'object') {
    const properties = schema.properties || {};
    for (const key of schema.required || []) if (!Object.prototype.hasOwnProperty.call(value, key)) invalid(code, `${path}.${key}`);
    if (schema.additionalProperties === false && Object.keys(value).some((key) => !Object.prototype.hasOwnProperty.call(properties, key))) invalid(code, path);
    for (const [key, item] of Object.entries(value)) if (properties[key]) validate(item, properties[key], `${path}.${key}`, code);
  }
  if (schema.type === 'array') {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) invalid(code, path);
    if (schema.minItems !== undefined && value.length < schema.minItems) invalid(code, path);
    value.forEach((item, index) => validate(item, schema.items, `${path}[${index}]`, code));
  }
  if (schema.type === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) invalid(code, path);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) invalid(code, path);
    if (schema.format === 'web-url') {
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) invalid(code, path);
      } catch { invalid(code, path); }
    }
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    if (schema.minimum !== undefined && value < schema.minimum) invalid(code, path);
    if (schema.maximum !== undefined && value > schema.maximum) invalid(code, path);
  }
  return value;
}

function exactKeys(value, required, optional, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(code, '$');
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) || Object.keys(value).some((key) => !allowed.has(key))) invalid(code, '$');
}

function getN8nTool(toolId) {
  const tool = getExecutionTool(toolId);
  if (!tool || tool.runtime !== 'n8n') n8nToolFail('N8N_TOOL_NOT_ALLOWED');
  return tool;
}

function validId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export function validateN8nToolRequest(request, { authority = null } = {}) {
  exactKeys(request, ['contractVersion', 'requestId', 'traceId', 'agentId', 'toolId', 'taskType', 'actor', 'input', 'execution'], ['idempotencyKey'], 'N8N_TOOL_INVALID_REQUEST');
  if (request.contractVersion !== N8N_TOOL_CONTRACT_VERSION || !validId(request.requestId) || !validId(request.traceId)) n8nToolFail('N8N_TOOL_INVALID_REQUEST');
  exactKeys(request.actor, ['type', 'source'], [], 'N8N_TOOL_INVALID_REQUEST');
  if (request.actor.type !== 'service' || request.actor.source !== 'nexaeon') n8nToolFail('N8N_TOOL_INVALID_REQUEST');
  exactKeys(request.execution, ['timeoutMs'], [], 'N8N_TOOL_INVALID_REQUEST');
  const agent = getAgentRuntimeContract(request.agentId);
  if (!agent || !agent.enabled) n8nToolFail('N8N_TOOL_NOT_ALLOWED');
  const tool = getN8nTool(request.toolId);
  if (!tool.allowedAgents.includes(request.agentId)) n8nToolFail('N8N_TOOL_FORBIDDEN');
  if (!tool.allowedTaskTypes.includes(request.taskType)) n8nToolFail('N8N_TOOL_NOT_ALLOWED');
  if (request.execution.timeoutMs !== tool.timeoutMs) n8nToolFail('N8N_TOOL_INVALID_REQUEST');
  validate(request.input, tool.inputSchema, '$.input', 'N8N_TOOL_INVALID_REQUEST');
  if (Buffer.byteLength(JSON.stringify(request), 'utf8') > MAX_N8N_TOOL_REQUEST_BYTES) n8nToolFail('N8N_TOOL_INVALID_REQUEST');
  if (tool.riskLevel === 'write') {
    if (!authority || authority.approved !== true || authority.source !== 'nexaeon_control_plane') n8nToolFail('N8N_TOOL_FORBIDDEN');
    if (!validId(request.idempotencyKey)) n8nToolFail('N8N_TOOL_INVALID_REQUEST');
  } else if (request.idempotencyKey !== undefined) n8nToolFail('N8N_TOOL_INVALID_REQUEST');
  if (!tool.enabled) n8nToolFail('N8N_TOOL_NOT_ALLOWED');
  return Object.freeze({ request, tool, agent });
}

export function createN8nToolRequest({ requestId, traceId, agentId, toolId, taskType, input, idempotencyKey, authority }) {
  const tool = getN8nTool(toolId);
  const request = {
    contractVersion: N8N_TOOL_CONTRACT_VERSION, requestId, traceId, agentId, toolId, taskType,
    actor: { type: 'service', source: 'nexaeon' }, input, execution: { timeoutMs: tool.timeoutMs },
    ...(idempotencyKey ? { idempotencyKey } : {}),
  };
  return validateN8nToolRequest(request, { authority }).request;
}

function validateExecutionMetadata(metadata, tool) {
  exactKeys(metadata, ['provider', 'workflow', 'durationMs', 'externalExecutionId'], [], 'N8N_TOOL_CONTRACT_MISMATCH');
  if (metadata.provider !== 'n8n' || metadata.workflow !== tool.workflowName) n8nToolFail('N8N_TOOL_CONTRACT_MISMATCH');
  if (!Number.isFinite(metadata.durationMs) || metadata.durationMs < 0 || metadata.durationMs > tool.timeoutMs + 5_000) n8nToolFail('N8N_TOOL_CONTRACT_MISMATCH');
  if (metadata.externalExecutionId !== null && (typeof metadata.externalExecutionId !== 'string' || metadata.externalExecutionId.length > 200)) n8nToolFail('N8N_TOOL_CONTRACT_MISMATCH');
}

export function validateN8nToolResponse(response, request) {
  const tool = getN8nTool(request.toolId);
  const common = ['ok', 'contractVersion', 'requestId', 'traceId', 'toolId'];
  exactKeys(response, common, response?.ok === true ? ['data', 'warnings', 'executionMetadata'] : ['error'], 'N8N_TOOL_CONTRACT_MISMATCH');
  if (response.contractVersion !== N8N_TOOL_CONTRACT_VERSION || response.requestId !== request.requestId || response.traceId !== request.traceId || response.toolId !== request.toolId) n8nToolFail('N8N_TOOL_CONTRACT_MISMATCH');
  if (response.ok === true) {
    if (!Array.isArray(response.warnings) || response.warnings.length > 20 || response.warnings.some((item) => typeof item !== 'string' || item.length > 500)) n8nToolFail('N8N_TOOL_CONTRACT_MISMATCH');
    response.warnings = response.warnings.map((item) => redactN8nSecrets(item, 500));
    validate(response.data, tool.responseSchema, '$.data', 'N8N_TOOL_CONTRACT_MISMATCH');
    validateExecutionMetadata(response.executionMetadata, tool);
  } else if (response.ok === false) {
    exactKeys(response.error, ['code', 'message'], [], 'N8N_TOOL_CONTRACT_MISMATCH');
    if (!N8N_TOOL_ERROR_CODES.includes(response.error.code) || typeof response.error.message !== 'string' || response.error.message.length > 240) n8nToolFail('N8N_TOOL_CONTRACT_MISMATCH');
    response.error.message = redactN8nSecrets(response.error.message, 240);
  } else n8nToolFail('N8N_TOOL_CONTRACT_MISMATCH');
  return Object.freeze(response);
}

export function parseN8nToolResponse(raw, request) {
  if (Buffer.byteLength(String(raw || ''), 'utf8') > MAX_N8N_TOOL_RESPONSE_BYTES) n8nToolFail('N8N_TOOL_BAD_RESPONSE');
  let response;
  try { response = JSON.parse(String(raw)); } catch { n8nToolFail('N8N_TOOL_BAD_RESPONSE'); }
  return validateN8nToolResponse(response, request);
}
