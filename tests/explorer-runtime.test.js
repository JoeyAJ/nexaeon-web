import assert from 'node:assert/strict';
import test from 'node:test';

import { buildResponsesApiRequest } from '../lib/agent/chatRuntime.js';
import {
  EXPLORER_SYSTEM_PROMPT,
  buildExplorerAnswerRequest,
  buildExplorerInstruction,
  buildExplorerToolSelectionRequest,
  extractExplorerToolCalls,
  handleExplorerChatRequest,
  validateExplorerRequestBody,
} from '../lib/agent/explorerRuntime.js';
import { getExplorerHealthPayload } from '../lib/agent/explorerHealth.js';
import { EXPLORER_TOOL_NAMES } from '../lib/agent/explorerResearchTools.js';

function createReq(body = { message: 'Compare UTAUT methods', locale: 'en' }) {
  return {
    method: 'POST',
    body,
    headers: {
      origin: 'https://nexaeon-web.vercel.app',
      'user-agent': `explorer-test-${Math.random()}`,
    },
  };
}

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

function publicResearchData() {
  return {
    sourcePlatform: 'notion',
    reason: null,
    items: [{
      id: 'utm-public',
      title: 'UTAUT and AI learning adoption',
      authors: ['Joey'],
      year: '2024',
      sourceType: 'Journal Article',
      sourcePlatform: 'notion',
      theoryModels: ['UTAUT'],
      researchMethod: 'SEM',
      variables: ['Behavioral intention'],
      topics: ['UTAUT', 'SEM', 'Behavioral intention'],
      summary: {
        zh: '公開的 AI 學習採用研究。',
        ko: '공개된 AI 학습 수용 연구입니다.',
        en: 'A public study of AI learning adoption.',
      },
      usage: 'Compare adoption variables.',
      sourceUrl: 'https://doi.org/10.1000/public',
      sourceRoute: '/research/research-literature-database',
      updatedAt: '2026-07-01T00:00:00.000Z',
    }],
  };
}

const config = {
  enabled: true,
  hasApiKey: true,
  forceSourcesOnly: false,
  model: 'test-model',
  maxOutputTokens: 800,
};

async function callExplorer({
  body,
  loadPublicResearchItems = async () => publicResearchData(),
  selectExplorerToolCalls = async () => ({
    calls: [{ name: 'searchResearchItems', args: { query: 'UTAUT' } }],
  }),
  createExplorerGroundedAnswer = async ({ lang }) => ({
    parsed: {
      answer: lang === 'ko' ? '공개 연구는 UTAUT를 사용합니다. [S1]' : 'The public study uses UTAUT. [S1]',
      citedSourceIds: ['S1'],
      suggestedQuestions: [lang === 'ko' ? '어떤 변수를 사용했나요?' : 'Which variables were used?'],
      localizedCitations: [{
        sourceId: 'S1',
        title: lang === 'ko' ? 'UTAUT와 AI 학습 수용' : 'UTAUT and AI learning adoption',
        summary: lang === 'ko' ? '공개 연구 요약' : 'Public research summary',
        typeLabel: lang === 'ko' ? '학술 논문' : 'Journal Article',
        moduleLabel: lang === 'ko' ? '연구' : 'Research',
      }],
    },
  }),
  moderateText = async () => false,
} = {}) {
  const res = createRes();
  await handleExplorerChatRequest(createReq(body), res, {
    skipCooldown: true,
    config,
    openai: {},
    logger: () => {},
    loadPublicResearchItems,
    selectExplorerToolCalls,
    createExplorerGroundedAnswer,
    moderateText,
  });
  return res;
}

test('Explorer has an independent identity, prompt, locale instruction, and no-write policy', () => {
  const prompt = EXPLORER_SYSTEM_PROMPT.join('\n');
  assert.match(prompt, /NexAeon Explorer/);
  assert.match(prompt, /Never invent literature, authors, DOI/);
  assert.match(prompt, /Do not write, update, delete/);
  assert.match(buildExplorerInstruction('ko'), /Korean/);
  assert.match(buildExplorerInstruction('zh'), /Traditional Chinese/);
});

test('Explorer request accepts only message, locale, and bounded conversation history', () => {
  const valid = validateExplorerRequestBody({
    message: '연구 방법을 비교해 주세요',
    locale: 'ko',
    history: [{ role: 'user', content: '이전 질문' }],
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.lang, 'ko');
  assert.equal(validateExplorerRequestBody({ message: 'hello', locale: 'en', currentModule: 'admin' }).ok, false);
  assert.equal(validateExplorerRequestBody({ message: 'x'.repeat(501), locale: 'en' }).ok, false);
});

test('tool selection exposes only the Explorer allowlist and final answer disables tools', () => {
  const selection = buildExplorerToolSelectionRequest({
    query: 'Find UTAUT research',
    lang: 'en',
    history: [],
    model: 'test-model',
  });
  assert.equal(selection.tool_choice, 'required');
  assert.equal(selection.parallel_tool_calls, false);
  assert.deepEqual(selection.tools.map(({ name }) => name), EXPLORER_TOOL_NAMES);

  const answer = buildExplorerAnswerRequest({
    query: 'Find UTAUT research',
    lang: 'en',
    history: [],
    numberedSources: [],
    executedTools: ['searchResearchItems'],
    model: 'test-model',
  });
  assert.deepEqual(answer.tools, []);
  assert.equal(answer.tool_choice, 'none');
});

test('unknown or excessive model tool calls never enter the execution allowlist', () => {
  const calls = extractExplorerToolCalls({
    output: [
      { type: 'function_call', name: 'deleteResearchItem', arguments: '{}' },
      ...EXPLORER_TOOL_NAMES.map((name, index) => ({
        type: 'function_call',
        name,
        call_id: `call-${index}`,
        arguments: '{}',
      })),
      { type: 'function_call', name: 'searchResearchItems', arguments: '{}' },
    ],
  });
  assert.deepEqual(calls.map(({ name }) => name), EXPLORER_TOOL_NAMES);
  assert.equal(calls.length, 4);
});

test('Explorer returns a grounded answer with source citations and executed tools', async () => {
  const res = await callExplorer();
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
  assert.equal(res.payload.mode, 'ai');
  assert.equal(res.payload.agentId, 'explorer');
  assert.deepEqual(res.payload.executedTools, ['searchResearchItems']);
  assert.match(res.payload.answer, /\[S1\]/);
  assert.equal(res.payload.citations[0].sourceId, 'S1');
  assert.equal(res.payload.citations[0].sourceUrl, 'https://doi.org/10.1000/public');
});

test('Explorer follows Korean UI language', async () => {
  const res = await callExplorer({ body: { message: 'UTAUT 연구를 찾아 주세요', locale: 'ko' } });
  assert.match(res.payload.answer, /공개 연구/);
  assert.equal(res.payload.citations[0].moduleLabel, '연구');
});

test('Explorer returns explicit empty and tool-error states', async () => {
  const empty = await callExplorer({
    loadPublicResearchItems: async () => ({ sourcePlatform: 'notion', items: [] }),
  });
  assert.equal(empty.payload.reason, 'no_sources');
  assert.deepEqual(empty.payload.citations, []);

  const failed = await callExplorer({
    loadPublicResearchItems: async () => {
      throw new Error('source failed');
    },
  });
  assert.equal(failed.payload.reason, 'tool_unavailable');
  assert.deepEqual(failed.payload.executedTools, []);
});

test('Explorer health reports independent active read-only execution state', () => {
  const health = getExplorerHealthPayload({
    now: new Date('2026-07-31T00:00:00.000Z'),
    config,
  });
  assert.equal(health.ok, true);
  assert.equal(health.agentId, 'explorer');
  assert.equal(health.mode, 'ai');
  assert.equal(health.readOnly, true);
  assert.deepEqual(health.tools, EXPLORER_TOOL_NAMES);
  assert.deepEqual(health.sourceScope, ['research']);
});

test('Navigator request construction remains tool-free and unchanged', () => {
  const request = buildResponsesApiRequest({
    query: 'Who is Joey?',
    lang: 'en',
    history: [],
    numberedSources: [],
    model: 'test-model',
  });
  assert.deepEqual(request.tools, []);
});
