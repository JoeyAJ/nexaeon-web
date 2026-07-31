import { handleExplorerChatRequest } from '../../../lib/agent/explorerRuntime.js';

export default async function handler(req, res) {
  await handleExplorerChatRequest(req, res);
}
