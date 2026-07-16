import assert from 'node:assert/strict';
import test from 'node:test';

import { createAgentExecutionPlan, integrateAgentResults } from '../lib/agent/agentOrchestrator.js';
import { getRoutingSourceScopes, routeAgentRequest } from '../lib/agent/agentRouter.js';
import { getModuleAgent, getModuleAgents, MODULE_AGENT_IDS } from '../lib/agent/moduleAgentRegistry.js';

const routingCases = [
  ['Identity zh', '介紹 Joey 的研究者身份', 'identity'],
  ['Research zh', '幫我設計研究假設與研究方法', 'research'],
  ['Coaching zh', '把這個主題設計成一堂課', 'coaching'],
  ['Knowledge zh', '幫我建立知識圖譜與筆記結構', 'knowledge'],
  ['Prototype zh', '幫我做成 Dashboard MVP', 'prototype'],
  ['Action zh', '幫我排下一週完成順序與驗收清單', 'action'],
  ['Identity ko', 'Joey의 연구자 정체성을 소개해 주세요', 'identity'],
  ['Research ko', '연구 가설과 방법론을 설계해 주세요', 'research'],
  ['Coaching ko', '이 주제로 커리큘럼과 학습 활동을 설계해 주세요', 'coaching'],
  ['Knowledge ko', '문헌을 분류하고 지식 그래프를 만들어 주세요', 'knowledge'],
  ['Prototype ko', '이 아이디어를 대시보드 프로토타입으로 설계해 주세요', 'prototype'],
  ['Action ko', '다음 단계와 작업 우선순위를 정리해 주세요', 'action'],
  ['Identity en', 'Who is Joey and what is his researcher positioning?', 'identity'],
  ['Research en', 'Help formulate a research question and methodology', 'research'],
  ['Coaching en', 'Turn this topic into a curriculum with learning activities', 'coaching'],
  ['Knowledge en', 'Design a second-brain note structure and knowledge graph', 'knowledge'],
  ['Prototype en', 'Turn this into a deployable dashboard MVP', 'prototype'],
  ['Action en', 'Break this work into prioritized next steps and deadlines', 'action'],
];

for (const [name, query, expected] of routingCases) {
  test(`${name} routes to ${expected}`, () => {
    assert.equal(routeAgentRequest({ query }).primaryAgent, expected);
  });
}

test('registry contains exactly six stable module agent ids', () => {
  assert.deepEqual(MODULE_AGENT_IDS, ['identity', 'research', 'coaching', 'knowledge', 'prototype', 'action']);
  assert.equal(getModuleAgents().length, 6);
  for (const id of MODULE_AGENT_IDS) {
    const agent = getModuleAgent(id);
    assert.equal(agent.id, id);
    assert.ok(agent.systemPrompt.length);
    assert.ok(agent.contextPolicy.sourceScopes.length);
  }
});

test('explicit agent selection has priority over route context', () => {
  const result = routeAgentRequest({
    query: '請交給 Prototype Agent 說明怎麼部署這個 Demo',
    currentRoute: '/research/research-literature-database',
  });
  assert.equal(result.primaryAgent, 'prototype');
  assert.equal(result.reasonCode, 'explicit_agent');
  assert.equal(result.confidence, 0.99);
});

test('task intent has priority over conflicting route context', () => {
  assert.equal(routeAgentRequest({
    query: 'How should I deploy this demo to Vercel?',
    currentRoute: '/research/research-literature-database',
  }).primaryAgent, 'prototype');
});

test('ambiguous request uses Navigator fallback without throwing', () => {
  const result = routeAgentRequest({ query: '可以幫我看看嗎？' });
  assert.equal(result.primaryAgent, null);
  assert.equal(result.reasonCode, 'navigator_fallback');
  assert.ok(result.confidence < 0.5);
  assert.equal(result.requiresClarification, false);
});

test('route context alone remains a safe low-confidence fallback', () => {
  const result = routeAgentRequest({ query: 'What about this?', currentRoute: '/research/topic' });
  assert.equal(result.primaryAgent, null);
  assert.equal(result.reasonCode, 'navigator_fallback');
});

test('recent conversation provides secondary context without overriding explicit intent', () => {
  const result = routeAgentRequest({
    query: 'Use the Action Agent and give me the next steps',
    history: [{ role: 'user', content: 'We were discussing research methodology.' }],
  });
  assert.equal(result.primaryAgent, 'action');
});

const collaborationCases = [
  ['把這份研究設計成一堂課', 'coaching', 'research'],
  ['把文獻理論整理成 Notion 分類', 'knowledge', 'research'],
  ['把知識資料做成 Dashboard 介面', 'prototype', 'knowledge'],
  ['把 MVP 開發部署拆成任務與順序', 'action', 'prototype'],
  ['整合 Joey 的研究身份與研究方向', 'research', 'identity'],
];

for (const [query, primary, support] of collaborationCases) {
  test(`cross-module routing selects ${primary} with ${support}`, () => {
    const result = routeAgentRequest({ query });
    assert.equal(result.primaryAgent, primary);
    assert.deepEqual(result.supportingAgents, [support]);
    assert.ok(result.supportingAgents.length <= 1);
  });
}

test('execution plan never includes more than one supporting agent', () => {
  const plan = createAgentExecutionPlan({ query: '把研究文獻整理成知識 Dashboard，再拆成開發任務與部署順序' });
  assert.ok(plan.supporting.length <= 1);
  assert.ok(plan.routing.supportingAgents.length <= 1);
  assert.ok(plan.sourceScopes.length <= 4);
});

test('supporting failure preserves the primary result', () => {
  assert.equal(integrateAgentResults({ primaryResult: 'Primary answer', supportingResult: '' }), 'Primary answer');
  assert.equal(integrateAgentResults({ primaryResult: 'Primary answer', supportingResult: null }), 'Primary answer');
});

test('primary failure uses Navigator fallback', () => {
  assert.equal(integrateAgentResults({ primaryResult: '', fallbackResult: 'Navigator fallback' }), 'Navigator fallback');
});

test('routing scopes contain only selected module sources', () => {
  const routing = routeAgentRequest({ query: '把文獻理論整理成 Notion 分類' });
  assert.deepEqual(getRoutingSourceScopes(routing).sort(), ['knowledge', 'research']);
});

