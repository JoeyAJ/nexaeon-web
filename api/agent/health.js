import { handleNavigatorHealthRequest } from '../../lib/agent/health.js';

export default async function handler(req, res) {
  handleNavigatorHealthRequest(req, res);
}
