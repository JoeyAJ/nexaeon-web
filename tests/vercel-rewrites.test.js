import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('production routes Xchange revise requests to the revision handler', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rewrite = config.rewrites.find(({ source }) => source === '/api/agent/xchange/actions/revise');
  assert.deepEqual(rewrite, {
    source: '/api/agent/xchange/actions/revise',
    destination: '/api/agent/chat?agent=xchange&operation=revise',
  });
});
