import { getModuleData, getModuleEndpoint, getModuleStatus } from '../src/data/moduleData.js';
import { getReservedModuleConnectorConfig } from '../lib/moduleDataConnectors.js';

export function sendModuleData(res, moduleKey) {
  const items = getModuleData(moduleKey);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    source: 'fallback',
    moduleKey,
    endpoint: getModuleEndpoint(moduleKey),
    count: items.length,
    status: getModuleStatus(moduleKey),
    connectors: getReservedModuleConnectorConfig(moduleKey),
    items,
    data: items,
    updatedAt: new Date().toISOString(),
  });
}
