import { getDataSourceStatuses } from '../../lib/dataSourceRegistry';

export default function handler(req, res) {
  const statuses = getDataSourceStatuses();

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    source: 'backend-readiness-registry',
    status: 'backend-not-connected',
    count: statuses.length,
    items: statuses,
    data: statuses,
    updatedAt: new Date().toISOString(),
  });
}
