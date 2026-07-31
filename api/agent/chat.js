import { handleAgentChatRequest } from '../../lib/agent/chatRuntime.js';
import { handleXchangeChatRequest } from '../../lib/agent/xchangeRuntime.js';
import { handleArchivistChatRequest } from '../../lib/agent/archivistRuntime.js';

export default async function handler(req, res) {
  if (req.query?.agent === 'archivist') {
    await handleArchivistChatRequest(req, res);
    return;
  }
  if (req.query?.agent === 'xchange') {
    await handleXchangeChatRequest(req, res);
    return;
  }
  await handleAgentChatRequest(req, res);
}
