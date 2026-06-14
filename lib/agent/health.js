import { NAVIGATOR_AGENT } from '../../src/data/agentBrands.js';
import { AGENT_SOURCES } from './sourceRegistry.js';
import { getNavigatorProductionConfig, getNavigatorRuntimeMode } from './productionConfig.js';
import { NAVIGATOR_SERVICE_NAME } from './observability.js';

function setHealthHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('CDN-Cache-Control', 'private, no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'private, no-store');
}

export function getNavigatorHealthPayload({ now = new Date(), config = getNavigatorProductionConfig() } = {}) {
  const registryReady = AGENT_SOURCES.length === 7 && NAVIGATOR_AGENT?.name === NAVIGATOR_SERVICE_NAME;
  const mode = getNavigatorRuntimeMode(config);
  const status = registryReady
    ? mode === 'ai'
      ? 'ready'
      : mode
    : 'degraded';

  return {
    ok: registryReady,
    service: NAVIGATOR_SERVICE_NAME,
    status,
    mode,
    sourceRegistryCount: AGENT_SOURCES.length,
    timestamp: now.toISOString(),
  };
}

export function handleNavigatorHealthRequest(req, res, deps = {}) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    setHealthHeaders(res);
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ ok: false, service: NAVIGATOR_SERVICE_NAME, status: 'degraded' });
    return;
  }

  const payload = getNavigatorHealthPayload({
    now: deps.now || new Date(),
    config: deps.config || getNavigatorProductionConfig(deps.env),
  });
  setHealthHeaders(res);
  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }
  res.status(200).json(payload);
}
