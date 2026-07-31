import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENT_LANDING_COPY,
  AGENT_STATUS,
  SCAFFOLD_PROHIBITED_CAPABILITIES,
  getPublicAgents,
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

test('agent system map keeps Navigator, Explorer, and Xchange active while the other four agents remain coming soon', () => {
  const agents = getPublicAgents();
  const navigator = agents.find((agent) => agent.key === 'navigator');
  const explorer = agents.find((agent) => agent.key === 'explorer');
  const xchange = agents.find((agent) => agent.key === 'xchange');
  const scaffoldAgents = agents.filter((agent) => !['navigator', 'explorer', 'xchange'].includes(agent.key));

  assert.equal(navigator.status, AGENT_STATUS.active);
  assert.equal(navigator.chatEnabled, true);
  assert.equal(navigator.comingSoon, false);
  assert.equal(explorer.status, AGENT_STATUS.active);
  assert.equal(explorer.chatEnabled, true);
  assert.equal(explorer.comingSoon, false);
  assert.equal(xchange.status, AGENT_STATUS.active);
  assert.equal(xchange.chatEnabled, true);
  assert.equal(xchange.comingSoon, false);
  assert.deepEqual(scaffoldAgents.map((agent) => agent.name), [
    'NexAeon Archivist',
    'NexAeon Engineer',
    'NexAeon Orchestrator',
    'NexAeon Networker',
  ]);
  for (const agent of scaffoldAgents) {
    assert.equal(agent.status, AGENT_STATUS.scaffold, agent.name);
    assert.equal(agent.chatEnabled, false, agent.name);
    assert.equal(agent.comingSoon, true, agent.name);
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
    'NexAeon Explorer',
    'NexAeon Xchange',
    'Knowledge Agent',
    'Prototype Agent',
    'Action Agent',
  ]);
});

test('Research uses Explorer, Teaching uses Xchange, and other module cards keep Navigator status', () => {
  const expectedNames = {
    zh: ['身份 Agent', 'NexAeon Explorer', 'NexAeon Xchange', '知識 Agent', '原型 Agent', '行動 Agent'],
    ko: ['정체성 에이전트', 'NexAeon Explorer', 'NexAeon Xchange', '지식 에이전트', '프로토타입 에이전트', '실행 에이전트'],
    en: ['Identity Agent', 'NexAeon Explorer', 'NexAeon Xchange', 'Knowledge Agent', 'Prototype Agent', 'Action Agent'],
  };
  const expectedStatus = {
    zh: '已接入 Navigator',
    ko: 'Navigator 연결됨',
    en: 'Connected to Navigator',
  };

  for (const lang of ['zh', 'ko', 'en']) {
    const entries = getAllModuleAgentEntries(lang);
    assert.deepEqual(entries.map(({ agent }) => agent.id), ['identity', 'explorer', 'xchange', 'knowledge', 'prototype', 'action']);
    assert.deepEqual(entries.map(({ agent }) => agent.name), expectedNames[lang]);
    for (const { agent, status } of entries) {
      assert.equal(agent.status, MODULE_AGENT_STATUS.active);
      const independentStatus = {
        explorer: { zh: 'Explorer 已啟用', ko: 'Explorer 활성화됨', en: 'Explorer Active' },
        xchange: { zh: 'Xchange 已啟用', ko: 'Xchange 활성화됨', en: 'Xchange Active' },
      };
      assert.equal(status.label, independentStatus[agent.key]?.[lang] || expectedStatus[lang]);
      assert.equal(status.tone, 'active');
    }
  }

  assert.ok(SCAFFOLD_PROHIBITED_CAPABILITIES.includes('openai_call'));
  assert.ok(SCAFFOLD_PROHIBITED_CAPABILITIES.includes('ai_chat'));
});

test('module agent entries expose localized labels, module names, routes, and CTA text', () => {
  const expectedCopy = {
    zh: {
      cta: '使用 Navigator',
      description: '此模組目前由 NexAeon Navigator 讀取公開資料並提供模組化問答。專屬 Agent 仍在建設中。',
    },
    ko: {
      cta: 'Navigator 사용',
      description: '이 모듈은 현재 NexAeon Navigator가 공개 데이터를 불러와 모듈 기반 답변을 제공합니다. 전용 Agent는 아직 구축 중입니다.',
    },
    en: {
      cta: 'Use Navigator',
      description: 'This module currently uses NexAeon Navigator to retrieve public data and provide module-specific responses. Its dedicated Agent is still under development.',
    },
  };

  for (const lang of ['zh', 'ko', 'en']) {
    const copy = getModuleAgentCopy(lang);
    assert.ok(copy.sectionLabel);
    assert.equal(copy.openActive, expectedCopy[lang].cta);
    assert.equal(copy.moduleDescription, expectedCopy[lang].description);
    assert.ok(copy.indicatorDescription);

    for (const moduleId of Object.keys(MODULE_AGENT_PLACEMENTS)) {
      const entries = getModuleAgentEntries(moduleId, lang);
      assert.ok(entries.length > 0, moduleId);
      for (const { agent, localized, status } of entries) {
        assert.ok(agent.route, agent.key);
        assert.ok(localized.subtitle, agent.key);
        assert.ok(localized.moduleLabel, agent.key);
        assert.ok(localized.description, agent.key);
        const independentCta = {
          explorer: { zh: '使用 Explorer', ko: 'Explorer 사용', en: 'Use Explorer' },
          xchange: { zh: '使用 Xchange', ko: 'Xchange 사용', en: 'Use Xchange' },
        };
        assert.equal(status.cta, independentCta[agent.key]?.[lang] || expectedCopy[lang].cta, agent.key);
      }
    }
  }
});
