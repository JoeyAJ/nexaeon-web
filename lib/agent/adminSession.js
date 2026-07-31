/* global process */

import { Buffer } from 'node:buffer';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = '__Host-nexaeon_admin';
export const ADMIN_SESSION_TTL_SECONDS = 15 * 60;

function fail(code) {
  throw Object.assign(new Error(code.toLowerCase()), { code });
}

function clean(value, limit = 160) {
  return String(value || '').trim().slice(0, limit);
}

function credentials(env = process.env) {
  const actorId = clean(env.NEXAEON_ADMIN_ACTOR_ID);
  const accessSecret = clean(env.NEXAEON_ADMIN_ACCESS_SECRET, 512);
  const sessionSecret = clean(env.NEXAEON_ADMIN_SESSION_SECRET || env.NEXAEON_TOOL_EXECUTION_SECRET || env.AIRTABLE_API_KEY, 512);
  if (!actorId || !accessSecret || !sessionSecret) fail('AUTH_CONFIGURATION_MISSING');
  return { actorId, accessSecret, sessionSecret };
}

function equal(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(encoded, secret) {
  return createHmac('sha256', secret).update(encoded).digest('base64url');
}

function parseCookies(header) {
  return Object.fromEntries(String(header || '').split(';').map((item) => item.trim()).filter(Boolean).map((item) => {
    const index = item.indexOf('=');
    return index < 0 ? [item, ''] : [item.slice(0, index), item.slice(index + 1)];
  }));
}

export function createAdminSession({ actorId, accessSecret }, { env = process.env, now = Date.now() } = {}) {
  const configured = credentials(env);
  if (!equal(actorId, configured.actorId) || !equal(accessSecret, configured.accessSecret)) fail('AUTH_INVALID_CREDENTIALS');
  const claims = {
    actorId: configured.actorId,
    role: 'admin',
    sessionId: randomUUID(),
    csrfToken: randomBytes(24).toString('base64url'),
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_TTL_SECONDS * 1000,
  };
  const encoded = encode(claims);
  return {
    claims,
    cookie: `${ADMIN_SESSION_COOKIE}=${encoded}.${sign(encoded, configured.sessionSecret)}; Path=/; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
  };
}

export function readAdminSession(req, { env = process.env, now = Date.now() } = {}) {
  const configured = credentials(env);
  const token = parseCookies(req?.headers?.cookie)[ADMIN_SESSION_COOKIE];
  const [encoded, signature, extra] = String(token || '').split('.');
  if (!encoded || !signature || extra || !equal(signature, sign(encoded, configured.sessionSecret))) fail('AUTH_REQUIRED');
  let claims;
  try { claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { fail('AUTH_REQUIRED'); }
  if (claims.role !== 'admin' || claims.actorId !== configured.actorId || !claims.sessionId || !claims.csrfToken) fail('AUTH_ROLE_FORBIDDEN');
  if (Number(claims.expiresAt) <= now) fail('AUTH_SESSION_EXPIRED');
  return Object.freeze({ actorId: claims.actorId, role: claims.role, sessionId: claims.sessionId, csrfToken: claims.csrfToken, expiresAt: claims.expiresAt });
}

export function requireAdminCsrf(req, session) {
  if (!equal(req?.headers?.['x-nexaeon-csrf'], session?.csrfToken)) fail('CSRF_INVALID');
  return session;
}

export function clearAdminSessionCookie() {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

