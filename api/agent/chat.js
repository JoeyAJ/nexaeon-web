import { handleAgentChatRequest } from '../../lib/agent/chatRuntime.js';
import { handleXchangeChatRequest } from '../../lib/agent/xchangeRuntime.js';
import { handleArchivistChatRequest } from '../../lib/agent/archivistRuntime.js';
import { handleEngineerChatRequest } from '../../lib/agent/engineerRuntime.js';
import { handleOrchestratorChatRequest } from '../../lib/agent/orchestratorRuntime.js';

export default async function handler(req, res) {
  if (req.query?.agent === 'orchestrator') {
    await handleOrchestratorChatRequest(req, res);
    return;
  }
  if (req.query?.agent === 'engineer') {
    await handleEngineerChatRequest(req, res);
    return;
  }
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
