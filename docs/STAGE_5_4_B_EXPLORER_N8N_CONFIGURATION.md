# Stage 5-4B Explorer n8n Configuration

This runbook configures the first real NexAeon n8n tool chain. It covers only `agentId=explorer`, `toolId=web.search`, and `taskType=research.search`. Do not add an AI Agent, OpenAI, Notion, Airtable, Archivist, or write-capable node to this workflow.

## Authority boundary

- NexAeon remains the control plane and creates the `n8n-tool.v1` request.
- The server-side Tool Registry selects `N8N_EXPLORER_WEBHOOK_URL`; neither the browser nor request body can choose a URL, workflow, method, headers, or credential.
- n8n only validates, calls Tavily, normalizes results, and returns the tool contract. It does not answer the user or approve an operation.
- Tavily is untrusted upstream data. A result URL is data only and must never become a later HTTP Request target.

## Required secrets and environment

Generate a service token locally; never commit or paste the output into source files:

```sh
openssl rand -base64 48
```

Configure Vercel Production with:

- `N8N_EXPLORER_WEBHOOK_URL`: the production URL copied from the active Explorer Webhook node. It must be HTTPS and must not contain credentials or a fragment.
- `NEXAEON_N8N_SERVICE_TOKEN`: the current service token. NexAeon always sends this current value.
- `NEXAEON_N8N_SERVICE_TOKEN_PREVIOUS`: optional previous token during a bounded rotation window. NexAeon never sends this value; the Stage 5-4A verifier accepts it only where inbound verification is used. Remove it after rotation.

Configure n8n with:

- A Header Auth credential named `NexAeon Explorer Service Auth` with header name `Authorization` and value `Bearer <the current service token>`.
- A Tavily credential containing the Tavily API key. Keep the key in n8n Credentials, not in NexAeon or workflow JSON.

Rotation order: add the new n8n Header Auth value, update Vercel `NEXAEON_N8N_SERVICE_TOKEN` to the same value, redeploy NexAeon, run the canary, and then retire the old value. Never place either token in a query string, request body, log, response, pinned node data, or exported workflow fixture.

## Workflow overview

Use these seven nodes in order:

1. `Tool Entry` — Webhook
2. `Service Auth Validation` — Code
3. `Input Contract Validation` — Code
4. `Tavily Search` — HTTP Request
5. `Normalize Results` — Code
6. `Build Contract Response` — Code
7. `Respond` — Respond to Webhook

Use explicit failure branches where described. Do not use an Error Trigger that returns n8n stack traces to NexAeon.

## Node 1 — Tool Entry

- Type: Webhook
- HTTP Method: `POST`
- Path: choose a non-guessable deployment path such as `nexaeon/explorer/web-search`; copy the generated production URL into Vercel as `N8N_EXPLORER_WEBHOOK_URL`.
- Authentication: Header Auth → `NexAeon Explorer Service Auth`.
- Respond: `Using Respond to Webhook Node`.
- Raw body: disabled; expect JSON.
- Allowed content type: `application/json`.

Do not enable GET or add a second webhook method. Header Auth rejection should return 401/403; NexAeon maps those to `N8N_TOOL_UNAUTHORIZED`/`N8N_TOOL_FORBIDDEN` without retry.

Expected headers:

- `Authorization: Bearer <current token>`
- `Content-Type: application/json`
- `X-NexAeon-Request-ID: <same value as body.requestId>`
- `X-NexAeon-Trace-ID: <same value as body.traceId>`
- `X-NexAeon-Contract-Version: n8n-tool.v1`

## Node 2 — Service Auth Validation

The Webhook credential performs the secret comparison before this node. This Code node verifies authenticated-request metadata and correlation; it must not log the Authorization header.

```js
const body = $json.body;
const headers = Object.fromEntries(
  Object.entries($json.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
);
const fail = (code) => [{ json: {
  responseStatus: code === 'N8N_TOOL_UNAUTHORIZED' ? 401 : 400,
  response: {
    ok: false,
    contractVersion: 'n8n-tool.v1',
    requestId: typeof body?.requestId === 'string' ? body.requestId : 'invalid-request',
    traceId: typeof body?.traceId === 'string' ? body.traceId : 'invalid-trace',
    toolId: 'web.search',
    error: { code, message: code.toLowerCase() },
  },
} }];

if (!body || headers['x-nexaeon-contract-version'] !== 'n8n-tool.v1') {
  return fail('N8N_TOOL_INVALID_REQUEST');
}
if (headers['x-nexaeon-request-id'] !== body.requestId || headers['x-nexaeon-trace-id'] !== body.traceId) {
  return fail('N8N_TOOL_INVALID_REQUEST');
}
return [{ json: { request: body, startedAt: Date.now() } }];
```

Route `response` items directly to `Respond`. Route items containing `request` to Node 3. Never return headers or the presented token.

## Node 3 — Input Contract Validation

Validate exact keys; reject mass assignment rather than deleting unknown fields. The expected normalized request is:

```json
{
  "contractVersion": "n8n-tool.v1",
  "requestId": "req_...",
  "traceId": "trace_...",
  "agentId": "explorer",
  "toolId": "web.search",
  "taskType": "research.search",
  "actor": { "type": "service", "source": "nexaeon" },
  "input": { "query": "...", "maxResults": 5, "language": "en" },
  "execution": { "timeoutMs": 15000 }
}
```

Validation rules:

- exact top-level request keys shown above; no `workflowUrl`, `workflowId`, callback, endpoint, or credential fields;
- exact input keys: `query`, `maxResults`, `language`;
- `query`: trimmed non-empty string, maximum 1,000 characters;
- `maxResults`: integer 1–10;
- `language`: exactly `zh`, `ko`, or `en` (NexAeon already normalizes regional tags);
- fixed agent/tool/task/actor values and `execution.timeoutMs=15000`.

Example Code node guard:

```js
const envelope = $json;
const r = envelope.request;
const exact = (value, allowed) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).every((key) => allowed.includes(key));
const ids = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{7,99}$/.test(value);
const valid = exact(r, ['contractVersion','requestId','traceId','agentId','toolId','taskType','actor','input','execution'])
  && r.contractVersion === 'n8n-tool.v1'
  && ids(r.requestId) && ids(r.traceId)
  && r.agentId === 'explorer' && r.toolId === 'web.search' && r.taskType === 'research.search'
  && exact(r.actor, ['type','source']) && r.actor.type === 'service' && r.actor.source === 'nexaeon'
  && exact(r.execution, ['timeoutMs']) && r.execution.timeoutMs === 15000
  && exact(r.input, ['query','maxResults','language'])
  && typeof r.input.query === 'string' && r.input.query === r.input.query.trim()
  && r.input.query.length >= 1 && r.input.query.length <= 1000
  && Number.isInteger(r.input.maxResults) && r.input.maxResults >= 1 && r.input.maxResults <= 10
  && ['zh','ko','en'].includes(r.input.language);

if (!valid) return [{ json: { responseStatus: 400, response: {
  ok: false, contractVersion: 'n8n-tool.v1',
  requestId: ids(r?.requestId) ? r.requestId : 'invalid-request',
  traceId: ids(r?.traceId) ? r.traceId : 'invalid-trace',
  toolId: 'web.search', error: { code: 'N8N_TOOL_INVALID_REQUEST', message: 'n8n_tool_invalid_request' },
} } }];
return [{ json: envelope }];
```

Route validation failures to `Respond`, and valid items to Tavily.

## Node 4 — Tavily Search

- Type: HTTP Request
- Method: `POST` (fixed in the node)
- URL: the fixed Tavily Search endpoint selected during credential setup; never read a URL from the request.
- Authentication: the n8n Tavily credential.
- Send Headers: `Content-Type: application/json` only; the credential supplies Tavily authorization.
- Response: JSON.
- Timeout: less than NexAeon's 15-second outer timeout (recommended 12,000 ms).
- Retry on fail: disabled for Stage 5-4B.

JSON body fields:

```text
query          = {{ $node["Input Contract Validation"].json.request.input.query }}
max_results    = {{ $node["Input Contract Validation"].json.request.input.maxResults }}
include_answer = false
include_images = false
include_raw_content = false
search_depth   = basic
```

Do not allow the request to control the Tavily URL, API key, method, headers, or search depth. Configure the node so a 429 or 5xx response is available to an explicit error branch; map 429 to `N8N_TOOL_RATE_LIMITED`, and 5xx to `N8N_TOOL_UPSTREAM_ERROR`.

## Node 5 — Normalize Results

Use the validated request from Node 3 and the Tavily response from Node 4. Do not forward the full Tavily object.

```js
const requestNode = $('Input Contract Validation').first().json;
const upstream = $json;
const warnings = [];
const results = [];
for (const [index, item] of (Array.isArray(upstream.results) ? upstream.results : []).entries()) {
  if (results.length >= requestNode.request.input.maxResults) break;
  try {
    const url = new URL(String(item.url ?? '').trim());
    const title = String(item.title ?? '').trim().slice(0, 500);
    const snippet = String(item.content ?? item.snippet ?? '').trim().slice(0, 5000);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !title || !snippet) throw new Error('malformed');
    const published = item.published_date ?? item.publishedAt ?? null;
    const publishedAt = published && Number.isFinite(Date.parse(published)) ? new Date(published).toISOString() : null;
    results.push({
      title,
      url: url.toString(),
      snippet,
      publishedAt,
      source: url.hostname,
      ...(Number.isFinite(item.score) && item.score >= 0 && item.score <= 1 ? { score: item.score } : {}),
    });
  } catch {
    warnings.push(`Dropped malformed Tavily result at index ${index}.`);
  }
}
return [{ json: { request: requestNode.request, startedAt: requestNode.startedAt, results, warnings: warnings.slice(0, 20) } }];
```

Keep `include_raw_content=false` for the first canary. If raw content is explicitly enabled later, cap each value to 20,000 characters and the complete response below 256 KiB; never write raw content to Audit.

## Node 6 — Build Contract Response

```js
const value = $json;
return [{ json: {
  responseStatus: 200,
  response: {
    ok: true,
    contractVersion: 'n8n-tool.v1',
    requestId: value.request.requestId,
    traceId: value.request.traceId,
    toolId: 'web.search',
    data: { results: value.results },
    warnings: value.warnings,
    executionMetadata: {
      provider: 'n8n',
      workflow: 'explorer-web-search',
      durationMs: Math.max(0, Date.now() - value.startedAt),
      externalExecutionId: typeof $execution?.id === 'string' ? $execution.id : null,
    },
  },
} }];
```

If `$execution.id` is unavailable in the installed n8n version, return `null`; do not invent an ID. Do not add `workflowUrl`, `callbackUrl`, `serviceUrl`, the Tavily payload, credentials, or authorization metadata.

## Node 7 — Respond

- Type: Respond to Webhook
- Respond With: JSON
- Response Body: `{{ $json.response }}`
- Response Code: `{{ $json.responseStatus }}`
- Response headers: `Content-Type: application/json`; do not echo request headers.

Every explicit failure branch must build the same `n8n-tool.v1` failure envelope with the original valid `requestId`, `traceId`, and `toolId=web.search`. Never return an n8n stack trace or credential text.

## NexAeon canary

The server-side diagnostic is `POST /api/agent/explorer/web-search`. It is not a public debug endpoint: it requires a valid NexAeon admin session cookie, the matching `X-NexAeon-CSRF` header, and an allowed non-empty browser `Origin`. It has read-only `web.search` authority and no client-selectable agent, task, workflow, method, URL, or headers.

Request body:

```json
{
  "query": "latest trustworthy AI research",
  "maxResults": 5,
  "language": "en-US"
}
```

Expected pre-configuration result: HTTP 503 with `N8N_TOOL_NOT_CONFIGURED`. Expected configured result: HTTP 200, `ok=true`, correlated IDs, normalized `data.results`, and no secrets.

## Canary checklist

1. Activate only the Explorer workflow and copy its production POST URL to Vercel.
2. Confirm Vercel and n8n use the same current service token.
3. Confirm Tavily credentials exist only in n8n.
4. Redeploy NexAeon after adding Vercel environment variables.
5. Sign in through the existing NexAeon admin session flow and call the diagnostic with its CSRF token.
6. Verify `requestId` and `traceId` match across NexAeon response, n8n execution, and Audit.
7. Verify Audit has `agentId=explorer`, `toolId=web.search`, `taskType=research.search`, duration, result count, status, and real n8n execution ID or `null`.
8. Test one invalid token (401/403), invalid input (400), Tavily failure, and an invalid result URL.
9. Search logs and responses for service token, Tavily key, Authorization values, webhook URL, and raw content; all must be absent.
10. Leave `vector.search` unconnected and `vector.ingest` disabled. Stop before Stage 5-4C.

## Deliberate remaining limits

- No automatic retry is added. This preserves Stage 5-4A behavior and avoids duplicate or amplified upstream traffic.
- Rate limiting remains process-local/serverless-instance-local; no distributed Redis/Upstash/Cloudflare limiter is introduced in this stage.
- The real n8n workflow, production webhook, service token, and Tavily credential require Joey's manual configuration. Code readiness does not imply a completed real canary.
