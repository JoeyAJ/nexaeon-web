const SECRET_PATTERNS = [
  /Bearer\s+[^\s,;]+/giu,
  /(?:authorization|cookie|password|secret|token|api[-_ ]?key)\s*[:=]\s*[^\s,;]+/giu,
];

export const N8N_TOOL_ERROR_CODES = Object.freeze([
  'N8N_TOOL_NOT_CONFIGURED', 'N8N_TOOL_UNAUTHORIZED', 'N8N_TOOL_FORBIDDEN',
  'N8N_TOOL_INVALID_REQUEST', 'N8N_TOOL_NOT_ALLOWED', 'N8N_TOOL_TIMEOUT',
  'N8N_TOOL_NETWORK_ERROR', 'N8N_TOOL_BAD_RESPONSE', 'N8N_TOOL_RATE_LIMITED',
  'N8N_TOOL_UPSTREAM_ERROR', 'N8N_TOOL_CONTRACT_MISMATCH',
]);

const ERROR_STATUS = Object.freeze({
  N8N_TOOL_INVALID_REQUEST: 400,
  N8N_TOOL_UNAUTHORIZED: 401,
  N8N_TOOL_FORBIDDEN: 403,
  N8N_TOOL_NOT_ALLOWED: 403,
  N8N_TOOL_RATE_LIMITED: 429,
  N8N_TOOL_CONTRACT_MISMATCH: 502,
  N8N_TOOL_BAD_RESPONSE: 502,
  N8N_TOOL_NETWORK_ERROR: 502,
  N8N_TOOL_UPSTREAM_ERROR: 502,
  N8N_TOOL_NOT_CONFIGURED: 503,
  N8N_TOOL_TIMEOUT: 504,
});

export function redactN8nSecrets(value, limit = 300) {
  let text = String(value || '');
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, '[redacted]');
  return text.replace(/\s+/gu, ' ').trim().slice(0, limit);
}

export class N8nToolError extends Error {
  constructor(code, { status = ERROR_STATUS[code] || 500, retryable = false, details = {} } = {}) {
    super(String(code || 'N8N_TOOL_UPSTREAM_ERROR').toLowerCase());
    this.name = 'N8nToolError';
    this.code = N8N_TOOL_ERROR_CODES.includes(code) ? code : 'N8N_TOOL_UPSTREAM_ERROR';
    this.status = status;
    this.retryable = retryable;
    this.details = Object.freeze({
      requestId: redactN8nSecrets(details.requestId, 100) || null,
      traceId: redactN8nSecrets(details.traceId, 100) || null,
      toolId: redactN8nSecrets(details.toolId, 80) || null,
      field: redactN8nSecrets(details.field, 160) || null,
    });
  }
}

export function n8nToolFail(code, options) {
  throw new N8nToolError(code, options);
}

export function normalizeN8nToolError(error, details = {}) {
  if (error instanceof N8nToolError) return error;
  const name = String(error?.name || '');
  const code = String(error?.code || '');
  if (name === 'AbortError' || name === 'TimeoutError' || /abort|timeout/iu.test(code)) {
    return new N8nToolError('N8N_TOOL_TIMEOUT', { retryable: true, details });
  }
  return new N8nToolError('N8N_TOOL_NETWORK_ERROR', { retryable: true, details });
}
