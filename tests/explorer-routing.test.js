import assert from 'node:assert/strict';
import test from 'node:test';

import { parseRoute } from '../src/utils/router.js';
import { getAgentByKey } from '../src/data/agentRegistry.js';

test('Explorer, Xchange, Archivist, and Engineer have independent active routes while two agents stay scaffold routes', () => {
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

  assert.deepEqual(parseRoute('/projects/nexaeon-engineer'), {
    kind: 'detail',
    type: 'projects',
    id: 'nexaeon-engineer',
  });

  for (const key of ['orchestrator', 'networker']) {
    const agent = getAgentByKey(key);
    assert.deepEqual(parseRoute(agent.route), { kind: 'agentScaffold', key });
  }
});
