import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENT_LANDING_COPY,
  AGENT_STATUS,
  SCAFFOLD_PROHIBITED_CAPABILITIES,
  getAgentByKey,
} from '../src/data/agentRegistry.js';
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

test('module agent placement maps all seven public agents to their aligned modules', () => {
  assert.deepEqual(MODULE_AGENT_PLACEMENTS, {
    identity: ['navigator'],
    research: ['explorer'],
    teaching: ['xchange'],
    'knowledge-lab': ['archivist'],
    projects: ['engineer'],
    'field-lab': ['orchestrator', 'networker'],
  });

  const entries = getAllModuleAgentEntries('en');
  assert.equal(entries.length, 7);
  assert.deepEqual(entries.map(({ agent }) => agent.name), [
    'NexAeon Navigator',
    'NexAeon Explorer',
    'NexAeon Xchange',
    'NexAeon Archivist',
    'NexAeon Engineer',
    'NexAeon Orchestrator',
    'NexAeon Networker',
  ]);
});

test('Navigator remains active and every non-Navigator module agent is scaffold only', () => {
  const entries = getAllModuleAgentEntries('en');
  const navigator = entries.find(({ agent }) => agent.key === 'navigator');
  assert.equal(navigator.agent.status, AGENT_STATUS.active);
  assert.equal(navigator.agent.chatEnabled, true);
  assert.equal(navigator.status.label, 'Active');
  assert.equal(navigator.agent.route, '/identity/nexaeon-navigator');

  for (const { agent, status } of entries.filter(({ agent }) => agent.key !== 'navigator')) {
    assert.equal(agent.status, AGENT_STATUS.scaffold, agent.key);
    assert.equal(agent.chatEnabled, false, agent.key);
    assert.equal(agent.enabled, false, agent.key);
    assert.equal(status.label, 'Scaffold / Coming Soon', agent.key);
    assert.ok(agent.prohibitedCapabilities.includes('openai_call'), agent.key);
    assert.ok(agent.prohibitedCapabilities.includes('ai_chat'), agent.key);
  }

  assert.ok(SCAFFOLD_PROHIBITED_CAPABILITIES.includes('openai_call'));
  assert.ok(SCAFFOLD_PROHIBITED_CAPABILITIES.includes('ai_chat'));
});

test('module agent entries expose localized labels, module names, routes, and CTA text', () => {
  for (const lang of ['zh', 'ko', 'en']) {
    const copy = getModuleAgentCopy(lang);
    assert.ok(copy.sectionLabel);
    assert.ok(copy.openActive);
    assert.ok(copy.openScaffold);

    for (const moduleId of Object.keys(MODULE_AGENT_PLACEMENTS)) {
      const entries = getModuleAgentEntries(moduleId, lang);
      assert.ok(entries.length > 0, moduleId);
      for (const { agent, localized, status } of entries) {
        assert.equal(getAgentByKey(agent.key).route, agent.route);
        assert.ok(agent.name.startsWith('NexAeon '), agent.key);
        assert.ok(localized.subtitle, agent.key);
        assert.ok(localized.moduleLabel, agent.key);
        assert.ok(localized.description, agent.key);
        assert.ok(status.cta, agent.key);
      }
    }
  }
});
