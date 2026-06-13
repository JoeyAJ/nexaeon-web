export const PUBLIC_API_TIMEOUT_MS = 12000;

export const PUBLIC_API_SOURCES = new Set(['notion', 'airtable', 'fallback']);
export const PUBLIC_API_REASONS = new Set([
  null,
  'missing_env',
  'upstream_timeout',
  'upstream_failed',
  'partial_source_failure',
]);

export const PUBLIC_RESOURCE_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  EMPTY: 'empty',
  PARTIAL: 'partial',
  FALLBACK: 'fallback',
  ERROR: 'error',
};

export function isValidPublicApiSource(source) {
  return PUBLIC_API_SOURCES.has(source);
}

export function isValidPublicApiReason(reason) {
  return PUBLIC_API_REASONS.has(reason);
}

function isValidUpdatedAt(updatedAt) {
  return typeof updatedAt === 'string' || updatedAt === null;
}

function isReasonAllowedForSource(source, reason) {
  if (reason === null) return source === 'notion' || source === 'airtable';
  if (reason === 'partial_source_failure') return source === 'notion';
  return source === 'fallback';
}

export function normalizePublicApiPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errorType: 'invalid_contract' };
  }

  const { source, reason = null, count, updatedAt = null } = payload;
  const hasItems = Object.hasOwn(payload, 'items');
  const hasData = Object.hasOwn(payload, 'data');
  const selectedItems = hasItems ? payload.items : payload.data;

  if (!isValidPublicApiSource(source) || !isValidPublicApiReason(reason)) {
    return { ok: false, errorType: 'invalid_contract' };
  }

  if (!isReasonAllowedForSource(source, reason)) {
    return { ok: false, errorType: 'invalid_contract' };
  }

  if (!hasItems && !hasData) {
    return { ok: false, errorType: 'invalid_contract' };
  }

  if (!Array.isArray(selectedItems)) {
    return { ok: false, errorType: 'invalid_contract' };
  }

  if (hasData && !Array.isArray(payload.data)) {
    return { ok: false, errorType: 'invalid_contract' };
  }

  const numericCount = Number(count);
  if (!Number.isFinite(numericCount) || numericCount < 0) {
    return { ok: false, errorType: 'invalid_contract' };
  }

  if (!isValidUpdatedAt(updatedAt)) {
    return { ok: false, errorType: 'invalid_contract' };
  }

  const items = selectedItems;
  const normalized = {
    ...payload,
    source,
    reason,
    count: items.length,
    updatedAt,
    items,
    data: items,
  };

  return {
    ok: true,
    payload: normalized,
    items,
    status: derivePublicResourceStatus(normalized),
  };
}

export function derivePublicResourceStatus(payload) {
  if (!payload || !isValidPublicApiSource(payload.source) || !isValidPublicApiReason(payload.reason)) {
    return PUBLIC_RESOURCE_STATUS.ERROR;
  }

  const items = Array.isArray(payload.items) ? payload.items : [];

  if (payload.source === 'fallback') return PUBLIC_RESOURCE_STATUS.FALLBACK;
  if (payload.reason === 'partial_source_failure') return PUBLIC_RESOURCE_STATUS.PARTIAL;
  if (payload.reason === null && items.length === 0) return PUBLIC_RESOURCE_STATUS.EMPTY;
  if (payload.reason === null && items.length > 0) return PUBLIC_RESOURCE_STATUS.SUCCESS;

  return PUBLIC_RESOURCE_STATUS.ERROR;
}

export function classifyPublicApiError(error) {
  if (error?.name === 'AbortError') return 'aborted';
  if (error?.name === 'TimeoutError') return 'client_timeout';
  if (error?.message === 'invalid_contract') return 'invalid_contract';
  if (error?.message === 'http_error') return 'http_error';
  if (error?.message === 'json_parse_error') return 'json_parse_error';
  return 'network_error';
}

export function createTimeoutError() {
  const error = new Error('client timeout');
  error.name = 'TimeoutError';
  return error;
}

export async function fetchPublicApiResource(endpoint, { signal, timeoutMs = PUBLIC_API_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort(createTimeoutError());
  }, timeoutMs);

  function abortFromParent() {
    controller.abort(signal.reason || new DOMException('Request aborted', 'AbortError'));
  }

  if (signal?.aborted) abortFromParent();
  signal?.addEventListener('abort', abortFromParent, { once: true });

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error('json_parse_error');
    }

    const normalized = normalizePublicApiPayload(payload);
    if (!normalized.ok) throw new Error('invalid_contract');
    if (!response.ok) throw new Error('http_error');

    return normalized;
  } catch (error) {
    const reason = controller.signal.reason;
    if (reason?.name === 'TimeoutError') throw reason;
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromParent);
  }
}
