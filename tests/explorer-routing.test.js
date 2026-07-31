import assert from 'node:assert/strict';
import test from 'node:test';

import { parseRoute } from '../src/utils/router.js';
import { getAgentByKey } from '../src/data/agentRegistry.js';

test('all six module agents have independent active routes', () => {
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

  assert.deepEqual(parseRoute('/field-lab/nexaeon-orchestrator'), {
    kind: 'detail',
    type: 'field-lab',
    id: 'nexaeon-orchestrator',
  });

  const networker = getAgentByKey('networker');
  assert.deepEqual(parseRoute(networker.route), {
    kind: 'detail',
    type: 'identity',
    id: 'nexaeon-networker',
  });
});
