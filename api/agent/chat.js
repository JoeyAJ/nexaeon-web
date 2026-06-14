import { handleAgentChatRequest } from '../../lib/agent/chatRuntime.js';

export default async function handler(req, res) {
  await handleAgentChatRequest(req, res);
}
