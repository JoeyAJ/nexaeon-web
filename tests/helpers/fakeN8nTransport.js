import { verifyN8nServiceToken } from '../../lib/agent/n8nServiceAuth.js';

const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { 'content-type': 'application/json' },
});

export function createFakeN8nFetch({
  env, mode = 'success', mutateResponse = (value) => value, delayMs = 0, calls = [],
} = {}) {
  return async (url, options = {}) => {
    calls.push({ url: String(url), options });
    verifyN8nServiceToken(options.headers?.Authorization, env);
    const request = JSON.parse(options.body);
    if (delayMs) await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, delayMs);
      options.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); }, { once: true });
    });
    if (mode === 'network') throw new TypeError('Authorization: Bearer fake-secret-must-redact');
    if (mode === 'malformed') return new Response('{bad-json', { status: 200 });
    if (mode === 'unauthorized') return jsonResponse({ error: 'unauthorized' }, 401);
    if (mode === 'rate_limited') return jsonResponse({ error: 'rate limited' }, 429);
    const tool = request.toolId;
    const data = tool === 'web.search'
      ? { results: [{ title: 'Result', url: 'https://example.test/result', snippet: 'Grounded result.', score: 0.9 }] }
      : { matches: [{ id: 'doc-1', content: 'Knowledge result.', score: 0.8, metadata: {} }] };
    return jsonResponse(mutateResponse({
      ok: true, contractVersion: request.contractVersion, requestId: request.requestId, traceId: request.traceId,
      toolId: request.toolId, data, warnings: [], executionMetadata: {
        provider: 'n8n', workflow: tool === 'web.search' ? 'explorer-web-search' : 'archivist-vector-search',
        durationMs: 12, externalExecutionId: null,
      },
    }, request));
  };
}
