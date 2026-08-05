const SECRET_PATTERNS = [
  /(?:sk|key|token|secret)[-_][a-z0-9_-]{8,}/giu,
  /(?:authorization|api[-_ ]?key|cookie|session)\s*[:=]\s*[^\s,;]+/giu,
];

export function redactModelSecrets(value) {
  let text = String(value || '');
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, '[redacted]');
  return text.slice(0, 300);
}

export class ModelGatewayError extends Error {
  constructor(code, { status = 500, retryable = false, provider = '', details = {} } = {}) {
    super(code.toLowerCase());
    this.name = 'ModelGatewayError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.provider = provider;
    this.details = details;
  }
}

export function normalizeModelError(error, provider = '') {
  if (error instanceof ModelGatewayError) return error;
  const status = Number(error?.status || error?.statusCode || 0);
  const name = String(error?.name || '');
  const code = String(error?.code || '');
  if (name === 'AbortError' || name === 'TimeoutError' || /timeout|aborted/iu.test(code)) {
    return new ModelGatewayError('MODEL_TIMEOUT', { status: 504, retryable: true, provider });
  }
  if (status === 429) return new ModelGatewayError('MODEL_RATE_LIMITED', { status: 503, retryable: true, provider });
  if (status >= 500) return new ModelGatewayError('MODEL_PROVIDER_UNAVAILABLE', { status: 503, retryable: true, provider });
  if (status === 401 || status === 403) return new ModelGatewayError('MODEL_CONFIGURATION_INVALID', { status: 503, provider });
  return new ModelGatewayError('MODEL_PROVIDER_ERROR', { status: 503, retryable: true, provider });
}
