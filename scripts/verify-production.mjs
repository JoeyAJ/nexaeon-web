const DEFAULT_BASE_URL = 'https://nexaeon-web.vercel.app';
const BASE_URL = normalizeBaseUrl(process.argv[2] || process.env.NEXAEON_PRODUCTION_URL || DEFAULT_BASE_URL);
const TIMEOUT_MS = 12000;
const AGENT_TIMEOUT_MS = 30000;

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

async function fetchHeadWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('timeout')), TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: 'HEAD',
      headers: { Accept: 'application/json, text/html' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postJsonWithTimeout(url, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('agent timeout')), AGENT_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'nexaeon-production-verifier',
      },
      body: JSON.stringify(body),
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
  const assetPath = text.match(/\/assets\/index-[^"]+\.js/)?.[0] || '';
  let retiredBrandFound = false;
  if (assetPath) {
    const assetResponse = await fetchWithTimeout(`${BASE_URL}${assetPath}`);
    const assetText = await assetResponse.text();
    retiredBrandFound = /Nexōn|NEXŌN|Nexon AI Assistant|Nexōn AI Assistant/.test(assetText);
  }
  if (retiredBrandFound) throw new Error('home: retired Navigator brand found in public bundle');
  return { path: '/', status: response.status, retiredBrandFound };
}

async function verifySpaRoute(path) {
  const response = await fetchWithTimeout(`${BASE_URL}${path}`);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const text = await response.text();
  if (!text.includes('<div id="root"></div>')) throw new Error(`${path}: app root missing`);
  if (/Nexōn|NEXŌN|Nexon AI Assistant|Nexōn AI Assistant/.test(text)) {
    throw new Error(`${path}: retired public brand present`);
  }
  return { path, status: response.status };
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

async function verifyXchangeChat() {
  const response = await postJsonWithTimeout(`${BASE_URL}/api/agent/xchange/chat`, {
    message: 'Summarize the public learning material named test.',
    locale: 'en',
  });
  if (response.status !== 200) throw new Error(`/api/agent/xchange/chat: expected 200, got HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.agentId !== 'xchange' || !Array.isArray(payload?.executedTools) || !Array.isArray(payload?.citations)) {
    throw new Error('/api/agent/xchange/chat: unsafe or misrouted success contract');
  }
  return {
    path: '/api/agent/xchange/chat',
    status: response.status,
    agentId: payload.agentId,
    mode: payload.mode,
    executedTools: payload.executedTools,
    citationCount: payload.citations.length,
  };
}

async function verifyArchivistChat() {
  const response = await postJsonWithTimeout(`${BASE_URL}/api/agent/archivist/chat`, {
    message: 'Summarize the public knowledge related to AI Tutor.',
    locale: 'en',
  });
  if (response.status !== 200) throw new Error(`/api/agent/archivist/chat: expected 200, got HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.agentId !== 'archivist' || !Array.isArray(payload?.executedTools) || !Array.isArray(payload?.citations)) {
    throw new Error('/api/agent/archivist/chat: unsafe or misrouted success contract');
  }
  if (!payload?.conceptMap || !Array.isArray(payload.conceptMap.nodes) || !Array.isArray(payload.conceptMap.relationships)) {
    throw new Error('/api/agent/archivist/chat: missing concept-map contract');
  }
  return {
    path: '/api/agent/archivist/chat', status: response.status, agentId: payload.agentId,
    mode: payload.mode, executedTools: payload.executedTools, citationCount: payload.citations.length,
    conceptNodeCount: payload.conceptMap.nodes.length,
  };
}

async function verifyEngineerChat() {
  const response = await postJsonWithTimeout(`${BASE_URL}/api/agent/engineer/chat`, {
    message: 'Create a planned MVP sprint and acceptance test outline from the public Demos.',
    locale: 'en',
  });
  if (response.status !== 200) throw new Error(`/api/agent/engineer/chat: expected 200, got HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.agentId !== 'engineer' || !Array.isArray(payload?.executedTools) || !Array.isArray(payload?.citations)) {
    throw new Error('/api/agent/engineer/chat: unsafe or misrouted success contract');
  }
  if (!payload?.factClassification || !Array.isArray(payload.factClassification.verified)
    || !Array.isArray(payload.factClassification.inferred) || !Array.isArray(payload.factClassification.recommended)
    || !Array.isArray(payload.factClassification.unknown)) {
    throw new Error('/api/agent/engineer/chat: missing technical fact classification');
  }
  if (!payload?.developmentPlan || payload.developmentPlan.verificationStatus !== 'unverified'
    || !Array.isArray(payload.developmentPlan.tasks)
    || payload.developmentPlan.tasks.some((task) => task.status !== 'planned')) {
    throw new Error('/api/agent/engineer/chat: unsafe development-plan status');
  }
  const serialized = JSON.stringify(payload);
  if (/"status":"(?:completed|passed|deployed)"/iu.test(serialized) || /sk-[a-z0-9_-]{8,}/iu.test(serialized)) {
    throw new Error('/api/agent/engineer/chat: fabricated execution state or sensitive value');
  }
  return {
    path: '/api/agent/engineer/chat', status: response.status, agentId: payload.agentId,
    mode: payload.mode, executedTools: payload.executedTools, citationCount: payload.citations.length,
    verifiedCount: payload.factClassification.verified.length,
    planTaskCount: payload.developmentPlan.tasks.length,
    verificationStatus: payload.developmentPlan.verificationStatus,
  };
}

async function verifyOrchestratorChat() {
  const response = await postJsonWithTimeout(`${BASE_URL}/api/agent/orchestrator/chat`, {
    message: 'Create a proposed cross-module execution plan with priorities, blockers, milestones, and acceptance criteria from public Action Center data.',
    locale: 'en',
  });
  if (response.status !== 200) throw new Error(`/api/agent/orchestrator/chat: expected 200, got HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.agentId !== 'orchestrator' || !Array.isArray(payload?.executedTools) || !Array.isArray(payload?.citations)) {
    throw new Error('/api/agent/orchestrator/chat: unsafe or misrouted success contract');
  }
  if (!payload?.factClassification || !Array.isArray(payload.factClassification.verified)
    || !Array.isArray(payload.factClassification.inferred) || !Array.isArray(payload.factClassification.recommended)
    || !Array.isArray(payload.factClassification.unknown)) {
    throw new Error('/api/agent/orchestrator/chat: missing task fact classification');
  }
  if (!payload?.executionPlan || payload.executionPlan.verificationStatus !== 'unverified'
    || !Array.isArray(payload.executionPlan.tasks)
    || payload.executionPlan.tasks.some((task) => !['proposed', 'planned'].includes(task.status))
    || !Array.isArray(payload.executionPlan.crossModulePlan)
    || payload.executionPlan.crossModulePlan.some((item) => item.status !== 'proposed')) {
    throw new Error('/api/agent/orchestrator/chat: unsafe execution-plan status');
  }
  const serialized = JSON.stringify(payload);
  if (/"status":"(?:completed|in progress|assigned|notified)"/iu.test(serialized)
    || /sk-[a-z0-9_-]{8,}/iu.test(serialized)
    || /(?:email|calendar|deploy|write)(?:Task|Event|Action)/u.test(serialized)) {
    throw new Error('/api/agent/orchestrator/chat: fabricated execution state or sensitive operation');
  }
  return {
    path: '/api/agent/orchestrator/chat', status: response.status, agentId: payload.agentId,
    mode: payload.mode, executedTools: payload.executedTools, citationCount: payload.citations.length,
    verifiedCount: payload.factClassification.verified.length,
    planTaskCount: payload.executionPlan.tasks.length,
    crossModuleCount: payload.executionPlan.crossModulePlan.length,
    verificationStatus: payload.executionPlan.verificationStatus,
  };
}

async function verifyNetworkerChat() {
  const response = await postJsonWithTimeout(`${BASE_URL}/api/agent/networker/chat`, {
    message: 'Build a read-only collaboration map from all currently public Identity Profiles. Compare shared interests and complementary capabilities, and keep every possible relation inferred or recommended.',
    locale: 'en',
  });
  if (response.status !== 200) throw new Error(`/api/agent/networker/chat: expected 200, got HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.agentId !== 'networker' || !Array.isArray(payload?.executedTools) || !Array.isArray(payload?.citations)) {
    throw new Error('/api/agent/networker/chat: unsafe or misrouted success contract');
  }
  if (!payload?.factClassification || !Array.isArray(payload.factClassification.verified)
    || !Array.isArray(payload.factClassification.inferred) || !Array.isArray(payload.factClassification.recommended)
    || !Array.isArray(payload.factClassification.unknown)) {
    throw new Error('/api/agent/networker/chat: missing relationship fact classification');
  }
  if (!payload?.collaborationMap || payload.collaborationMap.verificationStatus !== 'unverified'
    || !Array.isArray(payload.collaborationMap.nodes)
    || !Array.isArray(payload.collaborationMap.proposedRelations)
    || payload.collaborationMap.proposedRelations.some((relation) => !['inferred', 'recommended'].includes(relation.status))) {
    throw new Error('/api/agent/networker/chat: unsafe collaboration-map contract');
  }
  const serialized = JSON.stringify(payload);
  const keys = collectObjectKeys(payload).map(normalizePublicKeyForSecurity);
  if (keys.some((key) => ['email', 'phone', 'address', 'internalnotes', 'privatenotes'].includes(key))
    || /sk-[a-z0-9_-]{8,}/iu.test(serialized)
    || /"(?:willing|contacted|introduced|matched|consented)":true/iu.test(serialized)
    || /(?:sendEmail|createContact|createCalendarEvent|scrapeProfile)/u.test(serialized)) {
    throw new Error('/api/agent/networker/chat: private data, fabricated relationship, or prohibited operation');
  }
  return {
    path: '/api/agent/networker/chat', status: response.status, agentId: payload.agentId,
    mode: payload.mode, executedTools: payload.executedTools, citationCount: payload.citations.length,
    verifiedCount: payload.factClassification.verified.length,
    nodeCount: payload.collaborationMap.nodes.length,
    proposedRelationCount: payload.collaborationMap.proposedRelations.length,
    verificationStatus: payload.collaborationMap.verificationStatus,
  };
}

async function verifyAgentHealth() {
  const head = await fetchHeadWithTimeout(`${BASE_URL}/api/agent/health`);
  if (head.status !== 200) throw new Error(`/api/agent/health HEAD: expected 200, got HTTP ${head.status}`);

  const response = await fetchWithTimeout(`${BASE_URL}/api/agent/health`);
  if (response.status !== 200) throw new Error(`/api/agent/health: expected 200, got HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('/api/agent/health: response is not JSON');
  const payload = await response.json();
  if (payload?.service !== 'NexAeon Navigator') throw new Error('/api/agent/health: invalid service');
  if (payload?.sourceRegistryCount !== 7) throw new Error('/api/agent/health: invalid source registry count');
  if (!['ready', 'sources_only', 'disabled', 'degraded'].includes(payload?.status)) throw new Error('/api/agent/health: invalid status');

  const serialized = JSON.stringify(payload);
  const leakedMarkers = [
    'OPENAI' + '_API_KEY',
    ['sk', 'proj', ''].join('-'),
    ['sk', ''].join('-'),
    'NEXAEON' + '_AGENT_',
    'NEXON' + '_AGENT_',
  ];
  if (leakedMarkers.some((marker) => serialized.includes(marker))) {
    throw new Error('/api/agent/health: leaked environment detail');
  }

  return {
    path: '/api/agent/health',
    status: response.status,
    headStatus: head.status,
    service: payload.service,
    healthStatus: payload.status,
    sourceRegistryCount: payload.sourceRegistryCount,
  };
}

async function main() {
  const home = await verifyHome();
  const navigatorRoute = await verifySpaRoute('/identity/nexaeon-navigator');
  const explorerRoute = await verifySpaRoute('/research/nexaeon-explorer');
  const xchangeRoute = await verifySpaRoute('/teaching/nexaeon-xchange');
  const archivistRoute = await verifySpaRoute('/knowledge-lab/nexaeon-archivist');
  const engineerRoute = await verifySpaRoute('/projects/nexaeon-engineer');
  const orchestratorRoute = await verifySpaRoute('/field-lab/nexaeon-orchestrator');
  const networkerRoute = await verifySpaRoute('/identity/nexaeon-networker');
  const legacyNavigatorRoute = await verifySpaRoute('/identity/nexon-ai-assistant');
  const demoRuntime = await verifySpaRoute('/projects/module-demos/nexaeon-ai-tutoring-mvp');
  const health = await verifyAgentHealth();
  const endpoints = [];
  for (const endpoint of ENDPOINTS) {
    endpoints.push(await verifyEndpoint(endpoint));
  }
  const xchangeChat = await verifyXchangeChat();
  const archivistChat = await verifyArchivistChat();
  const engineerChat = await verifyEngineerChat();
  const orchestratorChat = await verifyOrchestratorChat();
  const networkerChat = await verifyNetworkerChat();

  console.log(JSON.stringify({
    ok: true,
    baseUrl: BASE_URL,
    home,
    navigatorRoute,
    explorerRoute,
    xchangeRoute,
    archivistRoute,
    engineerRoute,
    orchestratorRoute,
    networkerRoute,
    legacyNavigatorRoute,
    demoRuntime,
    health,
    endpoints,
    xchangeChat,
    archivistChat,
    engineerChat,
    orchestratorChat,
    networkerChat,
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
