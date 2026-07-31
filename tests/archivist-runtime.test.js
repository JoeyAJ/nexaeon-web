import assert from 'node:assert/strict';
import test from 'node:test';

import handler from '../api/agent/chat.js';
import {
  ARCHIVIST_SYSTEM_PROMPT,
  buildArchivistAnswerRequest,
  buildArchivistInstruction,
  buildArchivistToolSelectionRequest,
  extractArchivistToolCalls,
  handleArchivistChatRequest,
  validateArchivistRequestBody,
} from '../lib/agent/archivistRuntime.js';
import { ARCHIVIST_TOOL_NAMES } from '../lib/agent/archivistKnowledgeTools.js';

function createReq(body = { message: 'Map AI Tutor knowledge', locale: 'en' }, query = {}) {
  return { method: 'POST', body, query, headers: { origin: 'https://nexaeon-web.vercel.app', 'user-agent': `archivist-test-${Math.random()}` } };
}

function createRes() {
  return {
    statusCode: 200, headers: {}, payload: null,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

function data() {
  return {
    sourcePlatform: 'notion',
    items: [{
      id: 'ai-tutor-note',
      title: { zh: 'AI Tutor 筆記', ko: 'AI Tutor 노트', en: 'AI Tutor Note' }, displayTitle: 'AI Tutor Note',
      summary: { zh: '個人化學習筆記。', ko: '개인화 학습 노트.', en: 'A personalization note.' },
      contentType: 'research_note', category: 'AI Education', topics: ['AI Education', 'AI Tutor'], tags: ['AI Tutor'],
      sourceDatabase: 'research', sourcePlatform: 'notion', sourceLabel: 'Literature', relatedModule: 'Research', year: 2026,
      explicitRelationIds: [], sourceUrl: 'https://example.com/note', sourceRoute: '/knowledge-lab/knowledge-resources', updatedAt: '2026-07-01',
    }],
  };
}

const config = { enabled: true, hasApiKey: true, forceSourcesOnly: false, model: 'test-model', maxOutputTokens: 800 };

async function callArchivist({
  body,
  loadPublicKnowledgeItems = async () => data(),
  selectArchivistToolCalls = async () => ({ calls: [{ name: 'searchKnowledgeItems', args: { query: 'AI Tutor' } }] }),
  createArchivistGroundedAnswer = async ({ lang }) => ({ parsed: {
    answer: lang === 'ko' ? '공개 노트는 AI Tutor 개인화를 다룹니다. [S1]' : 'The public note covers AI Tutor personalization. [S1]',
    citedSourceIds: ['S1'], suggestedQuestions: [lang === 'ko' ? '가능한 관계를 찾아 주세요.' : 'Find possible relations.'],
    localizedCitations: [{ sourceId: 'S1', title: lang === 'ko' ? 'AI Tutor 노트' : 'AI Tutor Note', summary: lang === 'ko' ? '공개 노트' : 'Public note', typeLabel: 'Research note', moduleLabel: 'Knowledge Lab' }],
  } }),
  moderateText = async () => false,
} = {}) {
  const res = createRes();
  await handleArchivistChatRequest(createReq(body), res, {
    skipCooldown: true, config, openai: {}, logger: () => {}, loadPublicKnowledgeItems,
    selectArchivistToolCalls, createArchivistGroundedAnswer, moderateText,
  });
  return res;
}

test('Archivist has independent identity, curation prompt, locale instruction, and strict read-only relation policy', () => {
  const prompt = ARCHIVIST_SYSTEM_PROMPT.join('\n');
  assert.match(prompt, /NexAeon Archivist/);
  assert.match(prompt, /explicit database relations from inferred possible relations/);
  assert.match(prompt, /Never invent notes, cases, authors, URLs/);
  assert.match(prompt, /Do not write, update, delete/);
  assert.match(buildArchivistInstruction('ko'), /Korean/);
  assert.match(buildArchivistInstruction('zh'), /Traditional Chinese/);
});

test('Archivist requests and model calls are bounded by the Knowledge allowlist', () => {
  assert.equal(validateArchivistRequestBody({ message: '知識を整理', locale: 'zh', history: [] }).ok, true);
  assert.equal(validateArchivistRequestBody({ message: 'hello', privateData: true }).ok, false);
  const selection = buildArchivistToolSelectionRequest({ query: 'Map notes', lang: 'en', history: [], model: 'test-model' });
  assert.deepEqual(selection.tools.map(({ name }) => name), ARCHIVIST_TOOL_NAMES);
  assert.equal(selection.tool_choice, 'required');
  const calls = extractArchivistToolCalls({ output: [
    { type: 'function_call', name: 'deleteKnowledgeItem', arguments: '{}' },
    ...ARCHIVIST_TOOL_NAMES.map((name) => ({ type: 'function_call', name, arguments: '{}' })),
  ] });
  assert.deepEqual(calls.map(({ name }) => name), ARCHIVIST_TOOL_NAMES.slice(0, 4));
  const answer = buildArchivistAnswerRequest({ query: 'Map notes', lang: 'en', history: [], numberedSources: [], executedTools: [], conceptMap: { nodes: [], relationships: [], sourceIds: [] }, model: 'test-model' });
  assert.deepEqual(answer.tools, []);
  assert.equal(answer.tool_choice, 'none');
});

test('Archivist returns grounded sources, independent agent ID, and concept-map structure', async () => {
  const res = await callArchivist();
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.agentId, 'archivist');
  assert.equal(res.payload.mode, 'ai');
  assert.deepEqual(res.payload.executedTools, ['searchKnowledgeItems']);
  assert.match(res.payload.answer, /\[S1\]/);
  assert.equal(res.payload.citations[0].sourceUrl, 'https://example.com/note');
  assert.deepEqual(res.payload.conceptMap.sourceIds, ['ai-tutor-note']);
  assert.ok(Array.isArray(res.payload.conceptMap.relationships));
});

test('Archivist follows Korean and preserves source formatting', async () => {
  const res = await callArchivist({ body: { message: 'AI Tutor 지식을 정리해 주세요', locale: 'ko' } });
  assert.match(res.payload.answer, /공개 노트/);
  assert.equal(res.payload.citations[0].title, 'AI Tutor 노트');
});

test('Archivist returns explicit empty and tool-error states without fabricated content', async () => {
  const empty = await callArchivist({ loadPublicKnowledgeItems: async () => ({ sourcePlatform: 'notion', items: [] }) });
  assert.equal(empty.payload.reason, 'no_sources');
  assert.equal(empty.payload.answer, '');
  assert.deepEqual(empty.payload.citations, []);
  assert.deepEqual(empty.payload.conceptMap, { nodes: [], relationships: [], sourceIds: [] });

  const failed = await callArchivist({ loadPublicKnowledgeItems: async () => { throw new Error('source failed'); } });
  assert.equal(failed.payload.reason, 'tool_unavailable');
  assert.deepEqual(failed.payload.executedTools, []);
});

test('shared API function routes archivist without creating another Serverless Function', async () => {
  const res = createRes();
  await handler(createReq({ message: 'AI Tutor', locale: 'en' }, { agent: 'archivist' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.agentId, 'archivist');
  assert.ok(Array.isArray(res.payload.executedTools));
});
