import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANION_NAVIGATOR_HANDOFF_KEY,
  COMPANION_NAVIGATOR_CONTEXT_KEY,
  COMPANION_NAVIGATOR_SOURCE_ROUTE_KEY,
  consumeCompanionNavigatorHandoff,
  createCompanionNavigatorHandoff,
  createModuleAgentNavigatorHandoff,
  getNavigatorSourceRoute,
  getCompanionActions,
  getCompanionSuggestedPrompt,
} from '../src/lib/companionActionConfig.js';

test('module action profiles expose no more than three safe contextual actions', () => {
  for (const moduleKey of ['home', 'identity', 'research', 'coaching', 'knowledge', 'prototype', 'action', 'navigator']) {
    const actions = getCompanionActions(moduleKey, 'zh');
    assert.ok(actions.length > 0 && actions.length <= 3);
    assert.equal(new Set(actions.map(({ id }) => id)).size, actions.length);
    for (const action of actions) {
      if (action.route) assert.match(action.route, /^\/(?!\/)/);
    }
  }
});

test('Navigator handoff is allowlisted and localized without accepting unsafe routes', () => {
  const handoff = createCompanionNavigatorHandoff({
    currentModule: 'research',
    currentRoute: '//malicious.example',
    locale: 'zh',
    selectedAction: 'ask-research<script>',
    suggestedPromptKey: 'research',
  });
  assert.equal(handoff.currentRoute, '/');
  assert.equal(handoff.preferredAgent, 'research');
  assert.equal(handoff.sourceRoute, '/');
  assert.equal(handoff.selectedAction, 'ask-researchscript');
  assert.equal(handoff.source, 'princess-companion');
  assert.equal(getCompanionSuggestedPrompt('research', 'zh'), '請根據目前研究模塊，幫我判斷下一步最值得推進的研究工作。');
});

test('Navigator consumes route-state handoff once and preserves router state', () => {
  const historyState = {
    nexaeonEntry: true,
    nexaeonDepth: 2,
    [COMPANION_NAVIGATOR_HANDOFF_KEY]: createCompanionNavigatorHandoff({
      currentModule: 'prototype', currentRoute: '/projects/module-demos', locale: 'en',
      selectedAction: 'ask-prototype', suggestedPromptKey: 'prototype',
    }),
  };
  const target = {
    location: { pathname: '/identity/nexaeon-navigator', hash: '' },
    history: {
      state: historyState,
      replaceState(next) { this.state = next; },
    },
  };
  const consumed = consumeCompanionNavigatorHandoff(target);
  assert.match(consumed.prompt, /testable MVP/i);
  assert.equal(target.history.state.nexaeonDepth, 2);
  assert.equal(target.history.state[COMPANION_NAVIGATOR_HANDOFF_KEY], undefined);
  assert.equal(target.history.state[COMPANION_NAVIGATOR_CONTEXT_KEY].preferredAgent, 'prototype');
  assert.equal(target.history.state[COMPANION_NAVIGATOR_SOURCE_ROUTE_KEY], '/projects/module-demos');
  assert.equal(getNavigatorSourceRoute(target), '/projects/module-demos');
  const refreshed = consumeCompanionNavigatorHandoff(target);
  assert.equal(refreshed.preferredAgent, 'prototype');
  assert.equal(refreshed.prompt, '');
  assert.equal(refreshed.focusInput, false);
});

test('module Agent handoff uses Registry ids, focuses without prefill, and rejects unknown context', () => {
  const handoff = createModuleAgentNavigatorHandoff({
    currentModule: 'teaching',
    sourceRoute: '/#teaching',
    locale: 'ko',
  });
  assert.equal(handoff.currentModule, 'coaching');
  assert.equal(handoff.preferredAgent, 'coaching');
  assert.equal(handoff.sourceRoute, '/#teaching');
  assert.equal(handoff.focusInput, true);
  assert.equal(handoff.suggestedPromptKey, '');
  assert.equal(handoff.source, 'module-agent');

  const invalid = createModuleAgentNavigatorHandoff({
    currentModule: 'unknown',
    sourceRoute: '//malicious.example',
    locale: 'invalid',
  });
  assert.equal(invalid.currentModule, 'home');
  assert.equal(invalid.preferredAgent, '');
  assert.equal(invalid.sourceRoute, '/');
  assert.equal(invalid.locale, 'en');
});
