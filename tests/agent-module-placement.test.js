import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENT_LANDING_COPY,
  SCAFFOLD_PROHIBITED_CAPABILITIES,
} from '../src/data/agentRegistry.js';
import { MODULE_AGENT_STATUS } from '../lib/agent/moduleAgentRegistry.js';
import {
  MODULE_AGENT_PLACEMENTS,
  getAllModuleAgentEntries,
  getModuleAgentCopy,
  getModuleAgentEntries,
} from '../src/data/agentModulePlacement.js';

test('agent system map copy identifies the Navigator landing overview as a global map', () => {
  for (const lang of ['zh', 'ko', 'en']) {
    assert.equal(AGENT_LANDING_COPY[lang].title, 'NexAeon Agent System Map');
    assert.ok(AGENT_LANDING_COPY[lang].intro);
  }
});

test('module agent placement is derived from the six Sprint 3 module agents', () => {
  assert.deepEqual(MODULE_AGENT_PLACEMENTS, {
    identity: ['identity'],
    research: ['research'],
    teaching: ['coaching'],
    'knowledge-lab': ['knowledge'],
    projects: ['prototype'],
    'field-lab': ['action'],
  });

  const entries = getAllModuleAgentEntries('en');
  assert.equal(entries.length, 6);
  assert.deepEqual(entries.map(({ agent }) => agent.name), [
    'Identity Agent',
    'Research Agent',
    'Coaching Agent',
    'Knowledge Agent',
    'Prototype Agent',
    'Action Agent',
  ]);
});

test('all module cards localize active status without changing agent ids', () => {
  const expectedNames = {
    zh: ['身份 Agent', '研究 Agent', '學習教練 Agent', '知識 Agent', '原型 Agent', '行動 Agent'],
    ko: ['정체성 에이전트', '연구 에이전트', '학습 코칭 에이전트', '지식 에이전트', '프로토타입 에이전트', '실행 에이전트'],
    en: ['Identity Agent', 'Research Agent', 'Coaching Agent', 'Knowledge Agent', 'Prototype Agent', 'Action Agent'],
  };
  const expectedStatus = { zh: '已啟用', ko: '활성화됨', en: 'Active' };

  for (const lang of ['zh', 'ko', 'en']) {
    const entries = getAllModuleAgentEntries(lang);
    assert.deepEqual(entries.map(({ agent }) => agent.id), ['identity', 'research', 'coaching', 'knowledge', 'prototype', 'action']);
    assert.deepEqual(entries.map(({ agent }) => agent.name), expectedNames[lang]);
    for (const { agent, status } of entries) {
      assert.equal(agent.status, MODULE_AGENT_STATUS.active);
      assert.equal(status.label, expectedStatus[lang]);
      assert.equal(status.tone, 'active');
    }
  }

  assert.ok(SCAFFOLD_PROHIBITED_CAPABILITIES.includes('openai_call'));
  assert.ok(SCAFFOLD_PROHIBITED_CAPABILITIES.includes('ai_chat'));
});

test('module agent entries expose localized labels, module names, routes, and CTA text', () => {
  for (const lang of ['zh', 'ko', 'en']) {
    const copy = getModuleAgentCopy(lang);
    assert.ok(copy.sectionLabel);
    assert.ok(copy.openActive);

    for (const moduleId of Object.keys(MODULE_AGENT_PLACEMENTS)) {
      const entries = getModuleAgentEntries(moduleId, lang);
      assert.ok(entries.length > 0, moduleId);
      for (const { agent, localized, status } of entries) {
        assert.ok(agent.route, agent.key);
        assert.ok(localized.subtitle, agent.key);
        assert.ok(localized.moduleLabel, agent.key);
        assert.ok(localized.description, agent.key);
        assert.ok(status.cta, agent.key);
      }
    }
  }
});
