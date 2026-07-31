/* global process */

import assert from 'node:assert/strict';
import test from 'node:test';

import handler from '../api/agent/chat.js';

function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function request({ method = 'GET', query = {}, body = {}, cookie = '', csrf = '' } = {}) {
  return { method, query, body, headers: { origin: 'https://nexaeon-web.vercel.app', cookie, 'x-nexaeon-csrf': csrf, 'user-agent': 'admin-api-test', 'x-forwarded-for': '203.0.113.12' } };
}

test('shared API keeps admin session and audit data private while authorized preview returns audit status', async () => {
  Object.assign(process.env, {
    AIRTABLE_API_KEY: 'api-test-key', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_PROJECTS_TABLE_ID: 'tbl-test', AIRTABLE_AUDIT_TABLE_ID: 'tbl-audit',
    NEXAEON_TOOL_EXECUTION_SECRET: 'tool-test-secret', NEXAEON_ADMIN_ACTOR_ID: 'api-admin',
    NEXAEON_ADMIN_ACCESS_SECRET: 'api-access-secret', NEXAEON_ADMIN_SESSION_SECRET: 'api-session-secret',
  });
  const anonymous = response();
  await handler(request({ method: 'POST', query: { agent: 'orchestrator', operation: 'preview' }, body: { payload: { title: 'No', description: 'Anonymous' } } }), anonymous);
  assert.equal(anonymous.statusCode, 401); assert.deepEqual(anonymous.body, { ok: false, errorCode: 'AUTH_REQUIRED' });

  const login = response();
  await handler(request({ method: 'POST', query: { admin: 'session' }, body: { actorId: 'api-admin', accessSecret: 'api-access-secret' } }), login);
  assert.equal(login.statusCode, 200); assert.equal(login.body.role, 'admin'); assert.ok(login.body.csrfToken);
  const cookie = login.headers['set-cookie'].split(';')[0];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ records: [{ id: 'rec-audit-preview' }] }) });
  try {
    const preview = response();
    await handler(request({ method: 'POST', query: { agent: 'orchestrator', operation: 'preview' }, cookie, csrf: login.body.csrfToken, body: { payload: { title: 'Authorized', description: 'Preview with persistent audit.' } } }), preview);
    assert.equal(preview.statusCode, 200); assert.equal(preview.body.auditRecordId, 'rec-audit-preview'); assert.equal(preview.body.auditPersistenceStatus, 'airtable-dedicated');
    assert.ok(preview.body.confirmationToken); assert.equal(JSON.stringify(preview.body).includes('api-access-secret'), false);
  } finally { globalThis.fetch = originalFetch; }

  const badCsrf = response();
  await handler(request({ method: 'POST', query: { admin: 'logout' }, cookie, csrf: 'wrong' }), badCsrf);
  assert.equal(badCsrf.statusCode, 403); assert.equal(badCsrf.body.errorCode, 'CSRF_INVALID');
});
