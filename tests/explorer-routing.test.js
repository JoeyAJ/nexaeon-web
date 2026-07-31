import assert from 'node:assert/strict';
import test from 'node:test';

import { parseRoute } from '../src/utils/router.js';
import { getAgentByKey } from '../src/data/agentRegistry.js';

test('Explorer, Xchange, and Archivist have independent active routes while the remaining module agents stay scaffold routes', () => {
  assert.deepEqual(parseRoute('/research/nexaeon-explorer'), {
    kind: 'detail',
    type: 'research',
    id: 'nexaeon-explorer',
  });

  assert.deepEqual(parseRoute('/teaching/nexaeon-xchange'), {
    kind: 'detail',
    type: 'teaching',
    id: 'nexaeon-xchange',
  });

  assert.deepEqual(parseRoute('/knowledge-lab/nexaeon-archivist'), {
    kind: 'detail',
    type: 'knowledge-lab',
    id: 'nexaeon-archivist',
  });

  for (const key of ['engineer', 'orchestrator', 'networker']) {
    const agent = getAgentByKey(key);
    assert.deepEqual(parseRoute(agent.route), { kind: 'agentScaffold', key });
  }
});
