import { getAgentByKey } from '../../src/data/agentRegistry.js';
import { EXPLORER_TOOL_NAMES } from './explorerResearchTools.js';
import { getExplorerProductionConfig, getNavigatorRuntimeMode } from './productionConfig.js';

export function getExplorerHealthPayload({ now = new Date(), config = getExplorerProductionConfig() } = {}) {
  const explorer = getAgentByKey('explorer');
  const registryReady = Boolean(
    explorer?.enabled
    && explorer?.chatEnabled
    && explorer?.runtimeMode === 'explorer_tools'
    && EXPLORER_TOOL_NAMES.length === 4,
  );
  const mode = getNavigatorRuntimeMode(config);

  return {
    ok: registryReady,
    service: 'NexAeon Explorer',
    agentId: 'explorer',
    status: registryReady ? (mode === 'ai' ? 'ready' : mode) : 'degraded',
    mode,
    toolCount: EXPLORER_TOOL_NAMES.length,
    tools: EXPLORER_TOOL_NAMES,
    readOnly: true,
    sourceScope: ['research'],
    timestamp: now.toISOString(),
  };
}

export function handleExplorerHealthRequest(req, res, deps = {}) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('CDN-Cache-Control', 'private, no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'private, no-store');
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ ok: false, service: 'NexAeon Explorer', status: 'degraded' });
    return;
  }

  const payload = getExplorerHealthPayload({
    now: deps.now || new Date(),
    config: deps.config || getExplorerProductionConfig(deps.env),
  });
  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }
  res.status(200).json(payload);
}
