import assert from 'node:assert/strict';
import test from 'node:test';

import { handleExplorerWebSearchDiagnostic } from '../api/agent/explorer/web-search.js';
import { createAdminSession } from '../lib/agent/adminSession.js';
import { createN8nToolAuditCollector } from '../lib/agent/n8nToolAudit.js';
import { createFakeN8nFetch } from './helpers/fakeN8nTransport.js';

const env = Object.freeze({
  NEXAEON_ADMIN_ACTOR_ID: 'joey',
  NEXAEON_ADMIN_ACCESS_SECRET: 'admin-access-secret-for-stage-54b',
  NEXAEON_ADMIN_SESSION_SECRET: 'admin-session-secret-for-stage-54b',
  NEXAEON_N8N_SERVICE_TOKEN: 'stage-54b-current-service-token',
  N8N_EXPLORER_WEBHOOK_URL: 'https://n8n.example.test/webhook/explorer-production',
});

function responseRecorder() {
  return {
    statusCode: 200, headers: {}, payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
  };
}

function authenticatedRequest(overrides = {}) {
  const session = createAdminSession({ actorId: 'joey', accessSecret: env.NEXAEON_ADMIN_ACCESS_SECRET }, { env });
  return {
    method: 'POST',
    headers: {
      host: 'localhost:5174', origin: 'http://localhost:5174',
      cookie: session.cookie.split(';')[0], 'x-nexaeon-csrf': session.claims.csrfToken,
    },
    body: { query: '  AI governance  ', maxResults: 5, language: 'zh-TW' },
    ...overrides,
  };
}

test('admin-only Explorer canary executes read-only web.search through the existing n8n client', async () => {
  const calls = [];
  const req = authenticatedRequest();
  const res = responseRecorder();
  await handleExplorerWebSearchDiagnostic(req, res, {
    env,
    fetchImpl: createFakeN8nFetch({ env, calls }),
    auditCollector: createN8nToolAuditCollector({ logger: () => {} }),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
  assert.equal(calls.length, 1);
  const sent = JSON.parse(calls[0].options.body);
  assert.deepEqual(sent.input, { query: 'AI governance', maxResults: 5, language: 'zh' });
  assert.equal(sent.agentId, 'explorer');
  assert.equal(sent.toolId, 'web.search');
  assert.equal(sent.taskType, 'research.search');
});

test('Explorer canary rejects GET, missing origin, missing admin auth, and invalid CSRF before n8n', async () => {
  const cases = [
    [authenticatedRequest({ method: 'GET' }), 405, 'METHOD_NOT_ALLOWED'],
    [authenticatedRequest({ headers: {} }), 403, 'ORIGIN_NOT_ALLOWED'],
    [{ method: 'POST', headers: { host: 'localhost:5174', origin: 'http://localhost:5174' }, body: { query: 'safe' } }, 401, 'AUTH_REQUIRED'],
    [authenticatedRequest({ headers: { ...authenticatedRequest().headers, 'x-nexaeon-csrf': 'wrong' } }), 403, 'CSRF_INVALID'],
  ];
  for (const [req, status, code] of cases) {
    let calls = 0;
    const res = responseRecorder();
    await handleExplorerWebSearchDiagnostic(req, res, { env, fetchImpl: async () => { calls += 1; } });
    assert.equal(res.statusCode, status);
    assert.equal(res.payload.errorCode, code);
    assert.equal(calls, 0);
  }
});

test('Explorer canary fails safely with N8N_TOOL_NOT_CONFIGURED when production binding is absent', async () => {
  const res = responseRecorder();
  await handleExplorerWebSearchDiagnostic(authenticatedRequest(), res, {
    env: { ...env, N8N_EXPLORER_WEBHOOK_URL: '' },
    fetchImpl: async () => { throw new Error('must not run'); },
    auditCollector: createN8nToolAuditCollector({ logger: () => {} }),
  });
  assert.equal(res.statusCode, 503);
  assert.equal(res.payload.errorCode, 'N8N_TOOL_NOT_CONFIGURED');
});
