/* global process */

import { randomUUID } from 'node:crypto';
import { readAdminSession, requireAdminCsrf } from './adminSession.js';
import { isAllowedBrowserOrigin } from './chatRuntime.js';
import { createN8nToolClient } from './n8nToolClient.js';

function privateJson(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('CDN-Cache-Control', 'private, no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'private, no-store');
}

const DIAGNOSTIC_ERROR_STATUS = Object.freeze({
  AUTH_CONFIGURATION_MISSING: 503,
  AUTH_REQUIRED: 401,
  AUTH_ROLE_FORBIDDEN: 403,
  AUTH_SESSION_EXPIRED: 401,
  CSRF_INVALID: 403,
});

export async function handleExplorerWebSearchDiagnostic(req, res, dependencies = {}) {
  privateJson(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, errorCode: 'METHOD_NOT_ALLOWED' });
  }
  if (!req.headers?.origin || !isAllowedBrowserOrigin(req)) {
    return res.status(403).json({ ok: false, errorCode: 'ORIGIN_NOT_ALLOWED' });
  }

  try {
    requireAdminCsrf(req, readAdminSession(req, { env: dependencies.env || process.env }));
    const requestId = `req_${randomUUID()}`;
    const traceId = `trace_${randomUUID()}`;
    const client = dependencies.client || createN8nToolClient({
      env: dependencies.env || process.env,
      ...(dependencies.fetchImpl ? { fetchImpl: dependencies.fetchImpl } : {}),
      ...(dependencies.auditCollector ? { auditCollector: dependencies.auditCollector } : {}),
    });
    const payload = await client.execute({
      requestId,
      traceId,
      agentId: 'explorer',
      toolId: 'web.search',
      taskType: 'research.search',
      input: req.body,
    });
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(Number(error?.status) || DIAGNOSTIC_ERROR_STATUS[error?.code] || 500).json({
      ok: false,
      errorCode: error?.code || 'N8N_TOOL_UPSTREAM_ERROR',
    });
  }
}
