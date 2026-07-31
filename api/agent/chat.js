import { handleAgentChatRequest } from '../../lib/agent/chatRuntime.js';
import { handleXchangeChatRequest } from '../../lib/agent/xchangeRuntime.js';
import { handleArchivistChatRequest } from '../../lib/agent/archivistRuntime.js';
import { handleEngineerChatRequest } from '../../lib/agent/engineerRuntime.js';
import { handleOrchestratorChatRequest } from '../../lib/agent/orchestratorRuntime.js';
import { handleNetworkerChatRequest } from '../../lib/agent/networkerRuntime.js';
import { cancelOperation, createOperationPreview, executeConfirmedOperation } from '../../lib/agent/toolExecutionRuntime.js';

const OPERATION_ERROR_STATUS = Object.freeze({
  INVALID_INPUT: 400, MASS_ASSIGNMENT_REJECTED: 400, PAYLOAD_TOO_LARGE: 413,
  TOOL_NOT_ALLOWED: 403, AGENT_NOT_ALLOWED: 403, RESTRICTED_TOOL: 403, DATA_SOURCE_NOT_ALLOWED: 403,
  CONFIRMATION_REQUIRED: 403, CONFIRMATION_INVALID: 403, CONFIRMATION_MISMATCH: 409,
  CONFIRMATION_REQUESTER_MISMATCH: 403, CONFIRMATION_EXPIRED: 410, OPERATION_CANCELLED: 409,
  OPERATION_ALREADY_SUCCEEDED: 409, DATA_SOURCE_CONFIGURATION_MISSING: 503,
  DATA_SOURCE_TIMEOUT: 504, DATA_SOURCE_REQUEST_FAILED: 502, DATA_SOURCE_REJECTED: 502,
  DATA_SOURCE_INVALID_RESPONSE: 502, INVALID_TOOL_OUTPUT: 502,
});

function isAllowedWriteOrigin(req) {
  const origin = String(req.headers?.origin || '');
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.origin === 'https://nexaeon-web.vercel.app'
      || (['localhost', '127.0.0.1'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol));
  } catch {
    return false;
  }
}

async function handleOrchestratorOperationRequest(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('CDN-Cache-Control', 'private, no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'private, no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
  }
  if (!isAllowedWriteOrigin(req)) return res.status(403).json({ ok: false, errorCode: 'ORIGIN_NOT_ALLOWED' });
  try {
    let payload;
    if (req.query.operation === 'preview') payload = createOperationPreview({ payload: req.body?.payload, req });
    else if (req.query.operation === 'execute') payload = await executeConfirmedOperation({ body: req.body, req });
    else if (req.query.operation === 'cancel') payload = cancelOperation({ body: req.body });
    else return res.status(404).json({ ok: false, errorCode: 'OPERATION_NOT_FOUND' });
    return res.status(200).json(payload);
  } catch (error) {
    const errorCode = error?.code || 'EXECUTION_FAILED';
    return res.status(OPERATION_ERROR_STATUS[errorCode] || 500).json({ ok: false, errorCode });
  }
}

export default async function handler(req, res) {
  if (req.query?.agent === 'networker') {
    await handleNetworkerChatRequest(req, res);
    return;
  }
  if (req.query?.agent === 'orchestrator') {
    if (req.query?.operation) {
      await handleOrchestratorOperationRequest(req, res);
      return;
    }
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
