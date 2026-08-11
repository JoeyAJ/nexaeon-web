import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('production routes Xchange revise and validation requests to their handlers', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rewrite = config.rewrites.find(({ source }) => source === '/api/agent/xchange/actions/revise');
  assert.deepEqual(rewrite, {
    source: '/api/agent/xchange/actions/revise',
    destination: '/api/agent/chat?agent=xchange&operation=revise',
  });
  assert.deepEqual(config.rewrites.find(({ source }) => source === '/api/agent/xchange/actions/validate'), {
    source: '/api/agent/xchange/actions/validate',
    destination: '/api/agent/chat?agent=xchange&operation=validate',
  });
});

test('production routes the Explorer web.search canary through the existing shared server function', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.rewrites.find(({ source }) => source === '/api/agent/explorer/web-search'), {
    source: '/api/agent/explorer/web-search',
    destination: '/api/agent/chat?admin=explorer-web-search',
  });
});
