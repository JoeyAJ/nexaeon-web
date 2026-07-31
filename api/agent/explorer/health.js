import { handleExplorerHealthRequest } from '../../../lib/agent/explorerHealth.js';

export default function handler(req, res) {
  handleExplorerHealthRequest(req, res);
}
