/* global process */

import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import { N8nToolError } from './n8nToolErrors.js';
import { N8N_TOOL_CONTRACT_VERSION } from './toolExecutionRegistry.js';

const clean = (value) => String(value || '').trim();

function equal(left, right) {
  const a = Buffer.from(clean(left));
  const b = Buffer.from(clean(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function getN8nServiceToken(env = process.env) {
  const token = clean(env.NEXAEON_N8N_SERVICE_TOKEN);
  if (token.length < 24) throw new N8nToolError('N8N_TOOL_NOT_CONFIGURED');
  return token;
}

export function buildN8nServiceHeaders({ requestId, traceId, env = process.env }) {
  return Object.freeze({
    Authorization: `Bearer ${getN8nServiceToken(env)}`,
    'Content-Type': 'application/json',
    'X-NexAeon-Request-ID': requestId,
    'X-NexAeon-Trace-ID': traceId,
    'X-NexAeon-Contract-Version': N8N_TOOL_CONTRACT_VERSION,
  });
}

export function verifyN8nServiceToken(authorization, env = process.env) {
  const configured = getN8nServiceToken(env);
  const presented = clean(authorization).match(/^Bearer\s+(.+)$/iu)?.[1] || '';
  if (!presented) throw new N8nToolError('N8N_TOOL_UNAUTHORIZED');
  const previousValue = clean(env.NEXAEON_N8N_SERVICE_TOKEN_PREVIOUS);
  const previous = previousValue.length >= 24 ? previousValue : '';
  if (!equal(presented, configured) && !(previous && equal(presented, previous))) {
    throw new N8nToolError('N8N_TOOL_UNAUTHORIZED');
  }
  return Object.freeze({ type: 'service', source: 'nexaeon' });
}
