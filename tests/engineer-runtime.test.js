import assert from 'node:assert/strict';
import test from 'node:test';

import handler from '../api/agent/chat.js';
import {
  ENGINEER_SYSTEM_PROMPT,
  buildEngineerAnswerRequest,
  buildEngineerInstruction,
  buildEngineerToolSelectionRequest,
  extractEngineerToolCalls,
  handleEngineerChatRequest,
  validateEngineerRequestBody,
} from '../lib/agent/engineerRuntime.js';
import { ENGINEER_TOOL_NAMES } from '../lib/agent/engineerPrototypeTools.js';

function createReq(body = { message: 'Create an MVP sprint plan', locale: 'en' }, query = {}) {
  return { method: 'POST', body, query, headers: { origin: 'https://nexaeon-web.vercel.app', 'user-agent': `engineer-test-${Math.random()}` } };
}

function createRes() {
  return {
    statusCode: 200, headers: {}, payload: null,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

function prototypeData() {
  return { sourcePlatform: 'airtable', items: [{
    id: 'demo-ai-tutor', slug: 'ai-tutor',
    title: { zh: 'AI Tutor Demo', ko: 'AI Tutor Demo', en: 'AI Tutor Demo' }, displayTitle: 'AI Tutor Demo',
    summary: { zh: '公開原型。', ko: '공개 프로토타입.', en: 'A public prototype.' },
    problem: { zh: '', ko: '', en: '' }, solution: { zh: '', ko: '', en: '' },
    coreFeatures: { zh: '個人化提示', ko: '개인화 프롬프트', en: 'Adaptive prompts' },
    nextStep: { zh: '', ko: '', en: '' }, prototypeType: 'AI Tutor', developmentStatus: 'In Development',
    version: '0.3', techStack: ['React', 'OpenAI'], relatedModules: ['Learning Coaching'], targetUsers: [],
    platform: 'External', launchMode: 'External', launchReady: true, demoUrl: 'https://demo.example.com',
    githubUrl: 'https://github.com/JoeyAJ/ai-tutor', researchUrl: '', year: 2026,
    sourcePlatform: 'airtable', sourceDatabase: 'demos', sourceRoute: '/projects/module-demos',
    sourceUrl: 'https://demo.example.com', updatedAt: '2026-07-01',
  }] };
}

const config = { enabled: true, hasApiKey: true, forceSourcesOnly: false, model: 'test-model', maxOutputTokens: 800 };

async function callEngineer({
  body,
  loadPublicPrototypeItems = async () => prototypeData(),
  selectEngineerToolCalls = async () => ({ calls: [{ name: 'searchPrototypeItems', args: { query: 'AI Tutor' } }] }),
  createEngineerGroundedAnswer = async ({ lang }) => ({ parsed: {
    answer: lang === 'ko' ? '확인됨: 공개 Prototype입니다. [S1]' : 'Verified: this is a public Prototype. [S1]',
    citedSourceIds: ['S1'], suggestedQuestions: [lang === 'ko' ? 'MVP 작업을 분해해 주세요.' : 'Break down MVP tasks.'],
    localizedCitations: [{ sourceId: 'S1', title: 'AI Tutor Demo', summary: 'Public prototype', typeLabel: 'AI Tutor', moduleLabel: 'Prototype Lab' }],
  } }),
  moderateText = async () => false,
} = {}) {
  const res = createRes();
  await handleEngineerChatRequest(createReq(body), res, {
    skipCooldown: true, config, openai: {}, logger: () => {}, loadPublicPrototypeItems,
    selectEngineerToolCalls, createEngineerGroundedAnswer, moderateText,
  });
  return res;
}

test('Engineer has independent identity and strict read-only, no-execution planning policy', () => {
  const prompt = ENGINEER_SYSTEM_PROMPT.join('\n');
  assert.match(prompt, /NexAeon Engineer/);
  assert.match(prompt, /Verified, Inferred, Recommended, or Unknown/);
  assert.match(prompt, /Never invent repositories, commits, deployment status, test results/);
  assert.match(prompt, /Do not run code or shell commands/);
  assert.match(prompt, /Do not write, update, delete, commit, deploy/);
  assert.match(buildEngineerInstruction('ko'), /Korean/);
  assert.match(buildEngineerInstruction('zh'), /Traditional Chinese/);
});

test('Engineer requests are bounded by the Prototype allowlist with tools disabled during answering', () => {
  assert.equal(validateEngineerRequestBody({ message: 'MVP 계획', locale: 'ko', history: [] }).ok, true);
  assert.equal(validateEngineerRequestBody({ message: 'run shell', command: 'env' }).ok, false);
  const selection = buildEngineerToolSelectionRequest({ query: 'Compare demos', lang: 'en', history: [], model: 'test-model' });
  assert.deepEqual(selection.tools.map(({ name }) => name), ENGINEER_TOOL_NAMES);
  const calls = extractEngineerToolCalls({ output: [
    { type: 'function_call', name: 'runShell', arguments: '{"command":"env"}' },
    ...ENGINEER_TOOL_NAMES.map((name) => ({ type: 'function_call', name, arguments: '{}' })),
  ] });
  assert.deepEqual(calls.map(({ name }) => name), ENGINEER_TOOL_NAMES.slice(0, 4));
  const answer = buildEngineerAnswerRequest({ query: 'Plan MVP', lang: 'en', history: [], numberedSources: [], executedTools: [], factClassification: {}, developmentPlan: null, model: 'test-model' });
  assert.deepEqual(answer.tools, []);
  assert.equal(answer.tool_choice, 'none');
});

test('Engineer returns independent ID, citations, fact classification, and safe structured plan', async () => {
  const res = await callEngineer();
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.agentId, 'engineer');
  assert.equal(res.payload.mode, 'ai');
  assert.deepEqual(res.payload.executedTools, ['searchPrototypeItems']);
  assert.equal(res.payload.citations[0].sourceUrl, 'https://demo.example.com');
  assert.ok(res.payload.factClassification.verified.length);
  assert.ok(res.payload.factClassification.recommended.length);
  assert.ok(res.payload.factClassification.unknown.length);
  assert.equal(res.payload.developmentPlan.verificationStatus, 'unverified');
  assert.ok(res.payload.developmentPlan.tasks.every(({ status }) => status === 'planned'));
});

test('Engineer follows Korean and returns explicit empty and tool-error states', async () => {
  const ko = await callEngineer({ body: { message: 'MVP 계획을 만들어 주세요', locale: 'ko' } });
  assert.match(ko.payload.answer, /확인됨/);

  const empty = await callEngineer({ loadPublicPrototypeItems: async () => ({ sourcePlatform: 'airtable', items: [] }) });
  assert.equal(empty.payload.reason, 'no_sources');
  assert.deepEqual(empty.payload.citations, []);
  assert.ok(empty.payload.factClassification.unknown.length);

  const failed = await callEngineer({ loadPublicPrototypeItems: async () => { throw new Error('source failed'); } });
  assert.equal(failed.payload.reason, 'tool_unavailable');
  assert.deepEqual(failed.payload.executedTools, []);
});

test('shared API function routes Engineer without adding a Serverless Function', async () => {
  const res = createRes();
  await handler(createReq({ message: 'List public demos', locale: 'en' }, { agent: 'engineer' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.agentId, 'engineer');
  assert.ok(Array.isArray(res.payload.executedTools));
});
