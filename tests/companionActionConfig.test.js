import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANION_NAVIGATOR_HANDOFF_KEY,
  consumeCompanionNavigatorHandoff,
  createCompanionNavigatorHandoff,
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
  assert.equal(handoff.selectedAction, 'ask-researchscript');
  assert.equal(handoff.source, 'princess-companion');
  assert.equal(getCompanionSuggestedPrompt('research', 'zh'), '請整理 NexAeon 目前公開的研究方向與相關資料。');
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
  assert.match(consumed.prompt, /prototypes and demos/i);
  assert.equal(target.history.state.nexaeonDepth, 2);
  assert.equal(target.history.state[COMPANION_NAVIGATOR_HANDOFF_KEY], undefined);
  assert.equal(consumeCompanionNavigatorHandoff(target), null);
});
