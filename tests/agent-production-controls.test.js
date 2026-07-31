/* global process */

import assert from 'node:assert/strict';
import test from 'node:test';

import { AGENT_SOURCES } from '../lib/agent/sourceRegistry.js';
import {
  buildResponsesApiRequest,
  handleAgentChatRequest,
} from '../lib/agent/chatRuntime.js';
import {
  getArchivistProductionConfig,
  getEngineerProductionConfig,
  getExplorerProductionConfig,
  getNavigatorProductionConfig,
} from '../lib/agent/productionConfig.js';
import {
  createNavigatorRequestId,
  extractOpenAIUsage,
  logNavigatorEvent,
} from '../lib/agent/observability.js';
import {
  getNavigatorHealthPayload,
  handleNavigatorHealthRequest,
} from '../lib/agent/health.js';

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  for (const key of [
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'NEXAEON_AGENT_ENABLED',
    'NEXON_AGENT_ENABLED',
    'NEXAEON_AGENT_FORCE_SOURCES_ONLY',
    'NEXAEON_AGENT_MAX_OUTPUT_TOKENS',
    'NEXAEON_AGENT_TIMEOUT_MS',
    'NEXAEON_ARCHIVIST_ENABLED',
    'NEXAEON_ARCHIVIST_FORCE_SOURCES_ONLY',
    'NEXAEON_ENGINEER_ENABLED',
    'NEXAEON_ENGINEER_FORCE_SOURCES_ONLY',
  ]) {
    if (ORIGINAL_ENV[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL_ENV[key];
  }
}

function createReq({ method = 'POST', body = { query: 'Which demos are public?', lang: 'en' }, headers = {} } = {}) {
  return {
    method,
    body,
    headers: {
      origin: 'https://nexaeon-web.vercel.app',
      'user-agent': 'production-controls-test',
      ...headers,
    },
  };
}

function createRes() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    ended: false,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

function sampleRetrieval(overrides = {}) {
  return async () => ({
    results: [{
      score: 10,
      matchedFields: ['title'],
      excerpt: 'Learning Demo public source.',
      document: {
        id: 'demos:learning-demo',
        sourceId: 'demos',
        moduleKey: 'projects',
        itemType: 'AI Tutor',
        title: 'Learning Demo',
        summary: 'Public demo summary',
        content: 'Learning Demo source content.',
        tags: ['Demo'],
        sourceRoute: '/projects/module-demos',
        sourceUrl: '',
        updatedAt: '',
      },
    }],
    failedSources: [],
    partialSources: false,
    allSourcesFailed: false,
    queryIntent: { intent: 'list', sourceIntent: 'demos' },
    ...overrides,
  });
}

function createOpenAIMock() {
  const calls = [];
  return {
    calls,
    client: {
      moderations: {
        create: async () => {
          calls.push('moderation');
          return { results: [{ flagged: false }] };
        },
      },
      responses: {
        create: async () => {
          calls.push('response');
          return {
            output_text: JSON.stringify({
              answer: 'Learning Demo is public. [S1]',
              citedSourceIds: ['S1'],
              suggestedQuestions: [],
            }),
            usage: { input_tokens: 11, output_tokens: 7, total_tokens: 18 },
          };
        },
      },
    },
  };
}

async function callHandler(options = {}) {
  const res = createRes();
  await handleAgentChatRequest(options.req || createReq(), res, {
    skipCooldown: true,
    retrievePublicKnowledgeForChat: options.retrieval || sampleRetrieval(),
    openai: options.openai,
    config: options.config,
    logger: options.logger,
    requestId: options.requestId || '00000000-0000-4000-8000-000000000001',
  });
  return res;
}

test.afterEach(restoreEnv);

test('production config safely parses enabled flags, force mode, token, and timeout ceilings', () => {
  assert.equal(getNavigatorProductionConfig({ NEXAEON_AGENT_ENABLED: 'true' }).enabled, true);
  assert.equal(getNavigatorProductionConfig({ NEXON_AGENT_ENABLED: 'true' }).enabled, true);
  assert.equal(getNavigatorProductionConfig({ NEXAEON_AGENT_ENABLED: 'false', NEXON_AGENT_ENABLED: 'true' }).enabled, false);
  assert.equal(getNavigatorProductionConfig({ NEXAEON_AGENT_FORCE_SOURCES_ONLY: 'true' }).forceSourcesOnly, true);
  assert.equal(getNavigatorProductionConfig({}).maxOutputTokens, 800);
  assert.equal(getNavigatorProductionConfig({ NEXAEON_AGENT_MAX_OUTPUT_TOKENS: '801' }).maxOutputTokens, 800);
  assert.equal(getNavigatorProductionConfig({ NEXAEON_AGENT_MAX_OUTPUT_TOKENS: '199' }).maxOutputTokens, 800);
  assert.equal(getNavigatorProductionConfig({ NEXAEON_AGENT_MAX_OUTPUT_TOKENS: '200' }).maxOutputTokens, 200);
  assert.equal(getNavigatorProductionConfig({ NEXAEON_AGENT_MAX_OUTPUT_TOKENS: 'not-a-number' }).maxOutputTokens, 800);
  assert.equal(getNavigatorProductionConfig({ NEXAEON_AGENT_TIMEOUT_MS: '25001' }).timeoutMs, 25_000);
  assert.equal(getNavigatorProductionConfig({ NEXAEON_AGENT_TIMEOUT_MS: '9999' }).timeoutMs, 25_000);
  assert.equal(getNavigatorProductionConfig({ NEXAEON_AGENT_TIMEOUT_MS: '10000' }).timeoutMs, 10_000);
  assert.equal(getNavigatorProductionConfig({}).model, 'gpt-5.4-mini-2026-03-17');
  assert.equal(getNavigatorProductionConfig({ OPENAI_MODEL: 'server-model' }).model, 'server-model');
});

test('Explorer uses the shared production controls with independent kill-switch and force-source override', () => {
  assert.equal(getExplorerProductionConfig({ NEXAEON_AGENT_ENABLED: 'true' }).enabled, true);
  assert.equal(getExplorerProductionConfig({
    NEXAEON_AGENT_ENABLED: 'true',
    NEXAEON_EXPLORER_ENABLED: 'false',
  }).enabled, false);
  assert.equal(getExplorerProductionConfig({
    NEXAEON_AGENT_ENABLED: 'false',
    NEXAEON_EXPLORER_ENABLED: 'true',
  }).enabled, false);
  assert.equal(getExplorerProductionConfig({
    NEXAEON_AGENT_ENABLED: 'true',
    NEXAEON_EXPLORER_FORCE_SOURCES_ONLY: 'true',
  }).forceSourcesOnly, true);
});

test('Archivist uses shared production controls with its own kill-switch and force-source override', () => {
  assert.equal(getArchivistProductionConfig({ NEXAEON_AGENT_ENABLED: 'true' }).enabled, true);
  assert.equal(getArchivistProductionConfig({ NEXAEON_AGENT_ENABLED: 'true', NEXAEON_ARCHIVIST_ENABLED: 'false' }).enabled, false);
  assert.equal(getArchivistProductionConfig({ NEXAEON_AGENT_ENABLED: 'false', NEXAEON_ARCHIVIST_ENABLED: 'true' }).enabled, false);
  assert.equal(getArchivistProductionConfig({ NEXAEON_AGENT_ENABLED: 'true', NEXAEON_ARCHIVIST_FORCE_SOURCES_ONLY: 'true' }).forceSourcesOnly, true);
});

test('Engineer uses shared production controls with its own kill-switch and force-source override', () => {
  assert.equal(getEngineerProductionConfig({ NEXAEON_AGENT_ENABLED: 'true' }).enabled, true);
  assert.equal(getEngineerProductionConfig({ NEXAEON_AGENT_ENABLED: 'true', NEXAEON_ENGINEER_ENABLED: 'false' }).enabled, false);
  assert.equal(getEngineerProductionConfig({ NEXAEON_AGENT_ENABLED: 'false', NEXAEON_ENGINEER_ENABLED: 'true' }).enabled, false);
  assert.equal(getEngineerProductionConfig({ NEXAEON_AGENT_ENABLED: 'true', NEXAEON_ENGINEER_FORCE_SOURCES_ONLY: 'true' }).forceSourcesOnly, true);
});

test('client cannot override production config values', () => {
  assert.equal(buildResponsesApiRequest({
    query: 'hello',
    lang: 'en',
    history: [],
    numberedSources: [],
    model: 'server-model',
    maxOutputTokens: 9000,
  }).max_output_tokens, 800);
});

test('cost guard performs at most one model request and one input/output moderation', async () => {
  const openai = createOpenAIMock();
  const logs = [];
  const res = await callHandler({
    openai: openai.client,
    config: { enabled: true, forceSourcesOnly: false, hasApiKey: true, model: 'server-model', maxOutputTokens: 800, timeoutMs: 25_000 },
    logger: (event) => logs.push(event),
  });

  assert.equal(res.payload.mode, 'ai');
  assert.deepEqual(openai.calls, ['moderation', 'response', 'moderation']);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].totalTokens, 18);
});

test('invalid requests do not call OpenAI', async () => {
  const openai = createOpenAIMock();
  const res = await callHandler({
    req: createReq({ body: { query: 'x'.repeat(501), lang: 'en' } }),
    openai: openai.client,
    config: { enabled: true, forceSourcesOnly: false, hasApiKey: true, model: 'server-model', maxOutputTokens: 800, timeoutMs: 25_000 },
  });

  assert.equal(res.statusCode, 400);
  assert.equal(openai.calls.length, 0);
});

test('forced sources-only does not create or call OpenAI and preserves citations', async () => {
  let openaiCreated = false;
  const res = createRes();
  await handleAgentChatRequest(createReq(), res, {
    skipCooldown: true,
    retrievePublicKnowledgeForChat: sampleRetrieval(),
    createOpenAIClient: () => {
      openaiCreated = true;
    },
    config: { enabled: true, forceSourcesOnly: true, hasApiKey: true, model: 'server-model', maxOutputTokens: 800, timeoutMs: 25_000 },
  });

  assert.equal(openaiCreated, false);
  assert.equal(res.payload.reason, 'forced_sources_only');
  assert.equal(res.payload.citations.length, 1);
  assert.ok(res.payload.answer.includes('[S1]'));
});

test('safe observability omits query, answer, history, source content, API key, and raw errors', () => {
  const output = [];
  const event = logNavigatorEvent({
    requestId: 'request-id',
    category: 'request_completed',
    mode: 'ai',
    statusCode: 200,
    durationMs: 10,
    query: 'private query',
    answer: 'private answer',
    history: 'private history',
    sourceContent: 'private source',
    apiKey: 'secret-key',
    error: { message: 'raw error body' },
  }, (value) => output.push(value));

  const serialized = JSON.stringify(event);
  assert.equal(serialized.includes('private query'), false);
  assert.equal(serialized.includes('private answer'), false);
  assert.equal(serialized.includes('private history'), false);
  assert.equal(serialized.includes('private source'), false);
  assert.equal(serialized.includes('secret-key'), false);
  assert.equal(serialized.includes('raw error body'), false);
  assert.equal(output.length, 1);
});

test('usage extraction accepts multiple SDK shapes and missing usage', () => {
  assert.deepEqual(extractOpenAIUsage({ usage: { input_tokens: 5, output_tokens: 6, total_tokens: 11 } }), {
    inputTokens: 5,
    outputTokens: 6,
    totalTokens: 11,
  });
  assert.deepEqual(extractOpenAIUsage({ usage: { prompt_tokens: 2, completion_tokens: 3 } }), {
    inputTokens: 2,
    outputTokens: 3,
    totalTokens: 5,
  });
  assert.deepEqual(extractOpenAIUsage({}), {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
  });
});

test('request id is a uuid and returned as a response header', async () => {
  assert.match(createNavigatorRequestId(), /^[0-9a-f-]{36}$/);
  const res = await callHandler({
    config: { enabled: false, forceSourcesOnly: false, hasApiKey: false, model: 'server-model', maxOutputTokens: 800, timeoutMs: 25_000 },
  });
  assert.equal(res.headers['x-nexaeon-request-id'], '00000000-0000-4000-8000-000000000001');
});

test('health payload and handler avoid external calls and hide environment values', () => {
  const ready = getNavigatorHealthPayload({ config: { enabled: true, forceSourcesOnly: false, hasApiKey: true } });
  assert.equal(ready.service, 'NexAeon Navigator');
  assert.equal(ready.status, 'ready');
  assert.equal(ready.sourceRegistryCount, AGENT_SOURCES.length);

  const forced = getNavigatorHealthPayload({ config: { enabled: true, forceSourcesOnly: true, hasApiKey: true } });
  assert.equal(forced.status, 'sources_only');

  const disabled = getNavigatorHealthPayload({ config: { enabled: false, forceSourcesOnly: false, hasApiKey: false } });
  assert.equal(disabled.status, 'disabled');

  const serialized = JSON.stringify(ready);
  assert.equal(serialized.includes('OPENAI_API_KEY'), false);
  assert.equal(serialized.includes('secret'), false);
});

test('health HEAD has no body', () => {
  const res = createRes();
  handleNavigatorHealthRequest({ method: 'HEAD' }, res, {
    config: { enabled: true, forceSourcesOnly: false, hasApiKey: true },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload, null);
  assert.equal(res.ended, true);
});
