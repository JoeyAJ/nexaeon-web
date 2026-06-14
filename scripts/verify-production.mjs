const DEFAULT_BASE_URL = 'https://nexaeon-web.vercel.app';
const BASE_URL = normalizeBaseUrl(process.argv[2] || process.env.NEXAEON_PRODUCTION_URL || DEFAULT_BASE_URL);
const TIMEOUT_MS = 12000;

const ENDPOINTS = [
  '/api/identity/profiles',
  '/api/research/literature',
  '/api/teaching/courses',
  '/api/knowledge/resources',
  '/api/modules/demos',
  '/api/action/projects',
  '/api/collaboration/options',
];

const ALLOWED_SOURCES = new Set(['notion', 'airtable', 'fallback']);
const ALLOWED_REASONS = new Set([null, 'missing_env', 'upstream_timeout', 'upstream_failed', 'partial_source_failure']);
const SENSITIVE_KEYS = new Set([
  'notes',
  'owner',
  'blockers',
  'visibility',
  'public status',
  '公開狀態',
  'email',
  'contact name',
  'need/request',
  'need',
  'request',
]);

const UNSAFE_INTERNAL_KEYS = new Set([
  'stack',
  'rawerror',
  'exception',
  'token',
  'baseid',
  'tableid',
  'databaseid',
]);

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('timeout')), TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/html' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function collectObjectKeys(value, keys = []) {
  if (!value || typeof value !== 'object') return keys;
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjectKeys(item, keys));
    return keys;
  }

  Object.keys(value).forEach((key) => {
    keys.push(key);
    collectObjectKeys(value[key], keys);
  });
  return keys;
}

export function normalizePublicKeyForSecurity(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function hasUnsafeInternalKey(keys) {
  return keys
    .map(normalizePublicKeyForSecurity)
    .some((key) => UNSAFE_INTERNAL_KEYS.has(key));
}

export function assertContract(endpoint, payload) {
  const failures = [];

  if (!ALLOWED_SOURCES.has(payload?.source)) failures.push('invalid source');
  if (!ALLOWED_REASONS.has(payload?.reason ?? null)) failures.push('invalid reason');
  if (!Array.isArray(payload?.items)) failures.push('items is not an array');
  if (!Array.isArray(payload?.data)) failures.push('data is not an array');
  if (payload?.count !== payload?.items?.length) failures.push('count mismatch');
  if (!(typeof payload?.updatedAt === 'string' || payload?.updatedAt === null)) failures.push('invalid updatedAt');

  const keys = collectObjectKeys(payload).map((key) => key.trim().toLowerCase());
  if (keys.some((key) => SENSITIVE_KEYS.has(key))) failures.push('sensitive public key present');
  if (hasUnsafeInternalKey(keys)) failures.push('unsafe internal key present');

  if (failures.length) {
    throw new Error(`${endpoint}: ${failures.join(', ')}`);
  }
}

async function verifyHome() {
  const response = await fetchWithTimeout(`${BASE_URL}/`);
  if (!response.ok) throw new Error(`home: HTTP ${response.status}`);
  const text = await response.text();
  if (!text.includes('<div id="root"></div>')) throw new Error('home: app root missing');
  return { path: '/', status: response.status };
}

async function verifyEndpoint(endpoint) {
  const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`);
  if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error(`${endpoint}: response is not JSON`);

  const payload = await response.json();
  assertContract(endpoint, payload);

  return {
    path: endpoint,
    status: response.status,
    source: payload.source,
    reason: payload.reason ?? null,
    count: payload.items.length,
  };
}

async function main() {
  const home = await verifyHome();
  const endpoints = [];
  for (const endpoint of ENDPOINTS) {
    endpoints.push(await verifyEndpoint(endpoint));
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl: BASE_URL,
    home,
    endpoints,
  }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await main();
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      baseUrl: BASE_URL,
      error: error.message,
    }, null, 2));
    process.exitCode = 1;
  }
}
