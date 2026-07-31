import { handleAgentChatRequest } from '../../lib/agent/chatRuntime.js';
import { handleXchangeChatRequest } from '../../lib/agent/xchangeRuntime.js';

export default async function handler(req, res) {
  if (req.query?.agent === 'xchange') {
    await handleXchangeChatRequest(req, res);
    return;
  }
  await handleAgentChatRequest(req, res);
}
