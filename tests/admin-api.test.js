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

function request({ method = 'GET', query = {}, body = {}, cookie = '', csrf = '', origin = 'https://nexaeon-web.vercel.app' } = {}) {
  return { method, query, body, headers: { origin, cookie, 'x-nexaeon-csrf': csrf, 'user-agent': 'admin-api-test', 'x-forwarded-for': '203.0.113.12' } };
}

test('Xchange preview route enforces origin, admin session, CSRF, allowlists, and zero writes', async () => {
  Object.assign(process.env, {
    AIRTABLE_API_KEY: 'api-test-key', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_PROJECTS_TABLE_ID: 'tbl-test', AIRTABLE_AUDIT_TABLE_ID: 'tbl-audit',
    NEXAEON_ADMIN_ACTOR_ID: 'xchange-admin', NEXAEON_ADMIN_ACCESS_SECRET: 'xchange-access', NEXAEON_ADMIN_SESSION_SECRET: 'xchange-session-secret',
  });
  const route = { agent: 'xchange', operation: 'preview' };
  const body = {
    agentId: 'xchange', toolId: 'createCourseDraft', actionType: 'create', targetDataSource: 'notion-teaching-materials',
    draftType: 'course', language: 'en', payload: { title: 'AI course', summary: 'A safe preview.', targetAudience: ['University students'], format: ['Workshop'], difficulty: 'Beginner', language: ['en'], durationMinutes: 90 }, contractVersion: 'v1', schemaVersion: 'v1',
  };
  const invalidOrigin = response();
  await handler(request({ method: 'POST', query: route, body, origin: 'https://evil.example' }), invalidOrigin);
  assert.equal(invalidOrigin.statusCode, 403); assert.equal(invalidOrigin.body.errorCode, 'ORIGIN_NOT_ALLOWED');

  const anonymous = response();
  await handler(request({ method: 'POST', query: route, body }), anonymous);
  assert.equal(anonymous.statusCode, 401); assert.equal(anonymous.body.errorCode, 'AUTH_REQUIRED');

  const login = response();
  await handler(request({ method: 'POST', query: { admin: 'session' }, body: { actorId: 'xchange-admin', accessSecret: 'xchange-access' } }), login);
  const cookie = login.headers['set-cookie'].split(';')[0];
  const invalidCsrf = response();
  await handler(request({ method: 'POST', query: route, body, cookie, csrf: 'invalid' }), invalidCsrf);
  assert.equal(invalidCsrf.statusCode, 403); assert.equal(invalidCsrf.body.errorCode, 'CSRF_INVALID');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options = {}) => options.method === 'POST'
    ? { ok: true, json: async () => ({ records: [{ id: 'rec-xchange-preview-audit' }] }) }
    : { ok: true, json: async () => ({ records: [] }) };
  try {
    const preview = response();
    await handler(request({ method: 'POST', query: route, body, cookie, csrf: login.body.csrfToken }), preview);
    assert.equal(preview.statusCode, 200); assert.equal(preview.body.ok, true);
    assert.equal(preview.body.auditPreview.auditRecordId, 'rec-xchange-preview-audit');
    assert.equal(preview.body.writesPerformed, 0); assert.equal(preview.body.canExecute, true); assert.ok(preview.body.confirmationToken);

    const restricted = response();
    await handler(request({ method: 'POST', query: route, body: { ...body, toolId: 'deleteCourse' }, cookie, csrf: login.body.csrfToken }), restricted);
    assert.equal(restricted.statusCode, 403); assert.equal(restricted.body.errorCode, 'TOOL_NOT_ALLOWED'); assert.equal(restricted.body.writesPerformed, 0);

    const massAssignment = response();
    await handler(request({ method: 'POST', query: route, body: { ...body, payload: { ...body.payload, tableId: 'tbl-arbitrary' } }, cookie, csrf: login.body.csrfToken }), massAssignment);
    assert.equal(massAssignment.statusCode, 400); assert.equal(massAssignment.body.errorCode, 'MASS_ASSIGNMENT_REJECTED');
    assert.deepEqual(massAssignment.body.rejectedFields, ['tableId']); assert.equal(massAssignment.body.writesPerformed, 0);

    const executeRoute = { agent: 'xchange', operation: 'execute' };
    const executeNotFound = response();
    await handler(request({ method: 'POST', query: executeRoute, body: { operationId: 'missing-operation' }, cookie, csrf: login.body.csrfToken }), executeNotFound);
    assert.equal(executeNotFound.statusCode, 404); assert.deepEqual(executeNotFound.body, { ok: false, errorCode: 'PREVIEW_NOT_FOUND', writesPerformed: 0 });

    const executeBadOrigin = response();
    await handler(request({ method: 'POST', query: executeRoute, body: { operationId: 'missing-operation' }, cookie, csrf: login.body.csrfToken, origin: 'https://evil.example' }), executeBadOrigin);
    assert.equal(executeBadOrigin.statusCode, 403); assert.equal(executeBadOrigin.body.errorCode, 'ORIGIN_NOT_ALLOWED');

    const executeAnonymous = response();
    await handler(request({ method: 'POST', query: executeRoute, body: { operationId: 'missing-operation' } }), executeAnonymous);
    assert.equal(executeAnonymous.statusCode, 401); assert.equal(executeAnonymous.body.errorCode, 'AUTH_REQUIRED');

    const executeBadCsrf = response();
    await handler(request({ method: 'POST', query: executeRoute, body: { operationId: 'missing-operation' }, cookie, csrf: 'wrong' }), executeBadCsrf);
    assert.equal(executeBadCsrf.statusCode, 403); assert.equal(executeBadCsrf.body.errorCode, 'CSRF_INVALID');
  } finally { globalThis.fetch = originalFetch; }
});

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

test('migration, consistency, and repair admin routes reject visitors before data access', async () => {
  Object.assign(process.env, {
    AIRTABLE_API_KEY: 'api-test-key', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_PROJECTS_TABLE_ID: 'tbl-test', AIRTABLE_AUDIT_TABLE_ID: 'tbl-audit',
    NEXAEON_TOOL_EXECUTION_SECRET: 'tool-test-secret', NEXAEON_ADMIN_ACTOR_ID: 'api-admin',
    NEXAEON_ADMIN_ACCESS_SECRET: 'api-access-secret', NEXAEON_ADMIN_SESSION_SECRET: 'api-session-secret',
  });
  for (const admin of ['migration-preview', 'migration-execute', 'repair-preview', 'repair-execute']) {
    const res = response(); await handler(request({ method: 'POST', query: { admin } }), res);
    assert.equal(res.statusCode, 401); assert.equal(res.body.errorCode, 'AUTH_REQUIRED');
  }
  const consistency = response(); await handler(request({ method: 'GET', query: { admin: 'consistency' } }), consistency);
  assert.equal(consistency.statusCode, 401); assert.equal(consistency.body.errorCode, 'AUTH_REQUIRED');
  const preflight = response(); await handler(request({ method: 'GET', query: { admin: 'migration-preflight' } }), preflight);
  assert.equal(preflight.statusCode, 401); assert.equal(preflight.body.errorCode, 'AUTH_REQUIRED');
});

test('authenticated consistency failure returns a specific safe data-source error code', async () => {
  Object.assign(process.env, {
    AIRTABLE_API_KEY: 'api-test-key', AIRTABLE_BASE_ID: 'app-test', AIRTABLE_PROJECTS_TABLE_ID: 'tbl-test', AIRTABLE_AUDIT_TABLE_ID: 'tbl-audit',
    NEXAEON_TOOL_EXECUTION_SECRET: 'tool-test-secret', NEXAEON_ADMIN_ACTOR_ID: 'api-admin',
    NEXAEON_ADMIN_ACCESS_SECRET: 'api-access-secret', NEXAEON_ADMIN_SESSION_SECRET: 'api-session-secret',
  });
  const login = response();
  await handler(request({ method: 'POST', query: { admin: 'session' }, body: { actorId: 'api-admin', accessSecret: 'api-access-secret' } }), login);
  const cookie = login.headers['set-cookie'].split(';')[0];
  const originalFetch = globalThis.fetch; const originalError = console.error; const logged = [];
  globalThis.fetch = async () => { throw new TypeError('Authorization: Bearer should-never-leak'); };
  console.error = (message) => logged.push(message);
  try {
    const consistency = response(); await handler(request({ method: 'GET', query: { admin: 'consistency' }, cookie }), consistency);
    assert.equal(consistency.statusCode, 502); assert.deepEqual(consistency.body, { ok: false, errorCode: 'DATA_SOURCE_REQUEST_FAILED' });
    assert.equal(JSON.stringify(consistency.body).includes('should-never-leak'), false);
    assert.equal(logged.some((message) => message.includes('should-never-leak')), false);
  } finally { globalThis.fetch = originalFetch; console.error = originalError; }
});
