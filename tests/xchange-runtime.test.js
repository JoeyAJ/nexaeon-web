import assert from 'node:assert/strict';
import test from 'node:test';

import {
  XCHANGE_SYSTEM_PROMPT,
  buildXchangeAnswerRequest,
  buildXchangeInstruction,
  buildXchangeToolSelectionRequest,
  extractXchangeToolCalls,
  handleXchangeChatRequest,
  validateXchangeRequestBody,
} from '../lib/agent/xchangeRuntime.js';
import { XCHANGE_TOOL_NAMES } from '../lib/agent/xchangeLearningTools.js';

function createReq(body = { message: 'Design an AI literacy lesson', locale: 'en' }) {
  return {
    method: 'POST',
    body,
    headers: {
      origin: 'https://nexaeon-web.vercel.app',
      'user-agent': `xchange-test-${Math.random()}`,
    },
  };
}

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

function learningData() {
  return {
    sourcePlatform: 'notion',
    items: [{
      id: 'ai-literacy',
      title: { zh: 'AI 素養工作坊', ko: 'AI 리터러시 워크숍', en: 'AI Literacy Workshop' },
      displayTitle: 'AI Literacy Workshop',
      summary: { zh: '反思導向工作坊。', ko: '성찰 중심 워크숍.', en: 'A reflection-led workshop.' },
      contentType: 'Workshop',
      sourcePlatform: 'notion',
      courseType: 'Workshop',
      topic: 'AI literacy',
      targetAudience: ['University students'],
      difficulty: 'Beginner',
      language: ['English'],
      teachingMethods: ['Coaching', 'Reflection'],
      learningGoals: 'Evaluate AI output.',
      usage: 'Course design',
      tags: ['AI literacy'],
      durationMinutes: 90,
      sourceUrl: 'https://example.com/ai-literacy',
      sourceRoute: '/teaching/teaching-courses',
      updatedAt: '2026-07-01',
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

async function callXchange({
  body,
  loadPublicLearningMaterials = async () => learningData(),
  selectXchangeToolCalls = async () => ({
    calls: [{ name: 'searchLearningMaterials', args: { query: 'AI literacy' } }],
  }),
  createXchangeGroundedAnswer = async ({ lang }) => ({
    parsed: {
      answer: lang === 'ko'
        ? '90분 수업은 목표 설정, 연습, 성찰로 구성합니다. [S1]'
        : 'Structure the 90-minute lesson around goals, practice, and reflection. [S1]',
      citedSourceIds: ['S1'],
      suggestedQuestions: [lang === 'ko' ? '성찰 질문을 만들어 주세요.' : 'Create reflection questions.'],
      localizedCitations: [{
        sourceId: 'S1',
        title: lang === 'ko' ? 'AI 리터러시 워크숍' : 'AI Literacy Workshop',
        summary: lang === 'ko' ? '공개 워크숍 자료' : 'Public workshop material',
        typeLabel: lang === 'ko' ? '워크숍' : 'Workshop',
        moduleLabel: lang === 'ko' ? '학습 코칭' : 'Learning Coaching',
      }],
    },
  }),
  moderateText = async () => false,
} = {}) {
  const res = createRes();
  await handleXchangeChatRequest(createReq(body), res, {
    skipCooldown: true,
    config,
    openai: {},
    logger: () => {},
    loadPublicLearningMaterials,
    selectXchangeToolCalls,
    createXchangeGroundedAnswer,
    moderateText,
  });
  return res;
}

test('Xchange has an independent identity, coaching prompt, locale instruction, and no-write policy', () => {
  const prompt = XCHANGE_SYSTEM_PROMPT.join('\n');
  assert.match(prompt, /NexAeon Xchange/);
  assert.match(prompt, /coaching-oriented learning/);
  assert.match(prompt, /Never invent courses, teaching materials/);
  assert.match(prompt, /Do not write, update, delete/);
  assert.match(prompt, /Draft Preview form/);
  assert.match(prompt, /Never claim that draft content was saved/);
  assert.match(buildXchangeInstruction('ko'), /Korean/);
  assert.match(buildXchangeInstruction('zh'), /Traditional Chinese/);
});

test('Xchange request and model tool calls are bounded by the Learning allowlist', () => {
  assert.equal(validateXchangeRequestBody({
    message: '학습 활동을 설계해 주세요',
    locale: 'ko',
    history: [{ role: 'user', content: '이전 요구' }],
  }).ok, true);
  assert.equal(validateXchangeRequestBody({ message: 'hello', privateData: true }).ok, false);
  assert.equal(validateXchangeRequestBody({ message: 'x'.repeat(501) }).ok, false);

  const selection = buildXchangeToolSelectionRequest({
    query: 'Design a lesson',
    lang: 'en',
    history: [],
    model: 'test-model',
  });
  assert.deepEqual(selection.tools.map(({ name }) => name), XCHANGE_TOOL_NAMES);
  assert.equal(selection.tool_choice, 'required');

  const calls = extractXchangeToolCalls({
    output: [
      { type: 'function_call', name: 'deleteCourse', arguments: '{}' },
      ...XCHANGE_TOOL_NAMES.map((name) => ({ type: 'function_call', name, arguments: '{}' })),
    ],
  });
  assert.deepEqual(calls.map(({ name }) => name), XCHANGE_TOOL_NAMES.slice(0, 4));

  const answer = buildXchangeAnswerRequest({
    query: 'Design a lesson',
    lang: 'en',
    history: [],
    numberedSources: [],
    executedTools: ['searchLearningMaterials'],
    model: 'test-model',
  });
  assert.deepEqual(answer.tools, []);
  assert.equal(answer.tool_choice, 'none');
});

test('Xchange returns a grounded course-design answer with sources and agent identity', async () => {
  const res = await callXchange();
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.agentId, 'xchange');
  assert.equal(res.payload.mode, 'ai');
  assert.deepEqual(res.payload.executedTools, ['searchLearningMaterials']);
  assert.match(res.payload.answer, /\[S1\]/);
  assert.equal(res.payload.citations[0].sourceUrl, 'https://example.com/ai-literacy');
});

test('Xchange follows Korean and supports learning-activity answers', async () => {
  const res = await callXchange({ body: { message: '학습 활동을 설계해 주세요', locale: 'ko' } });
  assert.match(res.payload.answer, /90분 수업/);
  assert.equal(res.payload.citations[0].moduleLabel, '러닝 코칭');
});

test('Xchange returns explicit empty and tool-error states without fabricated content', async () => {
  const empty = await callXchange({
    loadPublicLearningMaterials: async () => ({ sourcePlatform: 'notion', items: [] }),
  });
  assert.equal(empty.payload.reason, 'no_sources');
  assert.equal(empty.payload.answer, '');
  assert.deepEqual(empty.payload.citations, []);

  const failed = await callXchange({
    loadPublicLearningMaterials: async () => { throw new Error('source failed'); },
  });
  assert.equal(failed.payload.reason, 'tool_unavailable');
  assert.deepEqual(failed.payload.executedTools, []);
});
