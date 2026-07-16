export const SAFE_REASONS = new Set([
  null,
  'missing_env',
  'upstream_timeout',
  'upstream_failed',
  'partial_source_failure',
]);

export const SUCCESS_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
export const NO_STORE_CACHE_CONTROL = 'private, no-store';

export function getLatestUpdatedAt(items = [], fields = ['updatedAt']) {
  const latest = items
    .flatMap((item) => fields.map((field) => item?.[field]))
    .filter(Boolean)
    .map((value) => {
      const time = new Date(value).getTime();
      return Number.isFinite(time) ? { value, time } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.time - a.time)[0];

  return latest?.value || null;
}

export function normalizeReason(reason) {
  if (reason === undefined || reason === null) return null;
  return SAFE_REASONS.has(reason) ? reason : 'upstream_failed';
}

export function createApiResponse({
  source = 'fallback',
  reason = null,
  items = [],
  updatedAt,
  extra = {},
} = {}) {
  const publicItems = Array.isArray(items) ? items : [];
  const safeReason = normalizeReason(reason);

  const providedMeta = extra?.meta && typeof extra.meta === 'object' ? extra.meta : {};
  const responseMeta = {
    ...providedMeta,
    count: publicItems.length,
    module: providedMeta.module || extra?.moduleKey || null,
    locale: providedMeta.locale || null,
    sources: providedMeta.sources || extra?.sources || [source],
    generatedAt: new Date().toISOString(),
  };

  return {
    source,
    reason: safeReason,
    count: publicItems.length,
    updatedAt: updatedAt === undefined ? getLatestUpdatedAt(publicItems) : updatedAt,
    items: publicItems,
    data: publicItems,
    ...extra,
    meta: responseMeta,
  };
}

export function isHealthySource(payload) {
  return (payload?.source === 'notion' || payload?.source === 'airtable') && payload?.reason === null;
}

export function getCacheControlForPayload(payload) {
  return isHealthySource(payload) ? SUCCESS_CACHE_CONTROL : NO_STORE_CACHE_CONTROL;
}

export function getUpstreamFailureReason(error) {
  const name = String(error?.name || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();

  if (
    name.includes('timeout')
    || name.includes('abort')
    || code.includes('timeout')
    || code === 'etimedout'
  ) {
    return 'upstream_timeout';
  }

  return 'upstream_failed';
}

export function logSafeApiError(endpoint, category, upstream) {
  console.error(JSON.stringify({
    endpoint,
    category,
    upstream,
    timestamp: new Date().toISOString(),
  }));
}

export function sendJsonResponse(req, res, payload, status = 200) {
  if (req?.method !== 'GET') {
    sendMethodNotAllowed(res);
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  setCacheHeaders(res, getCacheControlForPayload(payload));
  res.status(status).json(payload);
}

export function setCacheHeaders(res, value) {
  res.setHeader('Cache-Control', value);
  res.setHeader('CDN-Cache-Control', value);
  res.setHeader('Vercel-CDN-Cache-Control', value);
}

export function sendMethodNotAllowed(res) {
  const methodPayload = createApiResponse({
    source: 'fallback',
    reason: 'upstream_failed',
    items: [],
    updatedAt: null,
  });

  res.setHeader('Allow', 'GET');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  setCacheHeaders(res, NO_STORE_CACHE_CONTROL);
  res.status(405).json(methodPayload);
}

export function rejectUnsupportedMethod(req, res) {
  if (req?.method === 'GET') return false;
  sendMethodNotAllowed(res);
  return true;
}
