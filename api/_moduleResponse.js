import { getModuleData, getModuleEndpoint, getModuleStatus } from '../src/data/moduleData.js';

export function sendModuleData(res, moduleKey) {
  const items = getModuleData(moduleKey);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    moduleKey,
    endpoint: getModuleEndpoint(moduleKey),
    count: items.length,
    status: getModuleStatus(moduleKey),
    data: items,
  });
}
