# NexAeon n8n Tool Contract v1

Status: Accepted for Stage 5-4A

## Architecture

```text
Browser -> NexAeon API / Control Plane -> Shared Agent Runtime -> n8n Tool Client
                                                        |          |
                                                        |          -> allowlisted n8n workflow
                                                        -> Shared Model Gateway (reasoning only)
```

NexAeon remains the authority. The Shared Model Gateway reasons and generates proposals. n8n is a controlled tool-execution runtime. The browser does not call a private n8n webhook, and n8n cannot authorize NexAeon writes.

Stage 5-4A adds the server-side boundary only. No Agent calls it in Production, no n8n workflow is changed, and no n8n credential or workflow URL is configured by this change.

## Authentication

NexAeon sends `Authorization: Bearer <NEXAEON_N8N_SERVICE_TOKEN>` plus `X-NexAeon-Request-ID` and `X-NexAeon-Trace-ID`. The token is server-only and independent from the Admin cookie, browser session, CSRF token, user password, Model Gateway key, Notion key, and Airtable key.

`verifyN8nServiceToken` performs length-safe constant-time comparison. Missing configuration returns `N8N_TOOL_NOT_CONFIGURED`; a missing or invalid presented token returns `N8N_TOOL_UNAUTHORIZED`. `NEXAEON_N8N_SERVICE_TOKEN_PREVIOUS` permits a bounded operator-managed rotation window and should be removed after rotation.

## Request schema

```json
{
  "contractVersion": "n8n-tool.v1",
  "requestId": "req_stage54a_001",
  "traceId": "trace_stage54a_001",
  "agentId": "explorer",
  "toolId": "web.search",
  "taskType": "research.search",
  "actor": { "type": "service", "source": "nexaeon" },
  "input": { "query": "AI learning", "maxResults": 5, "locale": "en" },
  "execution": { "timeoutMs": 15000 }
}
```

The caller supplies a unique request ID and propagates its trace ID. The runtime verifies the Agent Registry, Tool Registry, task allowlist, exact input schema, fixed timeout, and a 32 KiB total request ceiling. Unknown fields are rejected. Workflow URL, workflow ID, credential, service URL, provider, and arbitrary timeout are not contract fields.

Write requests additionally require a unique `idempotencyKey` and a separate in-process NexAeon authority object. Authority is never accepted from the n8n response or browser-shaped request.

## Response schema

Success:

```json
{
  "ok": true,
  "contractVersion": "n8n-tool.v1",
  "requestId": "req_stage54a_001",
  "traceId": "trace_stage54a_001",
  "toolId": "web.search",
  "data": { "results": [] },
  "warnings": [],
  "executionMetadata": {
    "provider": "n8n",
    "workflow": "explorer-web-search",
    "durationMs": 1200,
    "externalExecutionId": null
  }
}
```

Failure:

```json
{
  "ok": false,
  "contractVersion": "n8n-tool.v1",
  "requestId": "req_stage54a_001",
  "traceId": "trace_stage54a_001",
  "toolId": "web.search",
  "error": { "code": "N8N_TOOL_TIMEOUT", "message": "Tool execution timed out." }
}
```

The response must preserve request ID, trace ID, tool ID, contract version, and fixed logical workflow name. Success data is validated against the registered response schema. Unknown outer/result fields, malformed JSON, oversized responses, and identifier mismatch return a contract error. `externalExecutionId` remains `null` when n8n does not supply one.

## Tool Registry and workflow allowlist

The existing `lib/agent/toolExecutionRegistry.js` is the single registry for internal and n8n tools. Workflow bindings are environment-variable names, never caller-provided URLs.

| Tool | Allowed Agent | Task | Risk | Approval | Timeout | Binding | Stage 5-4A |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| `web.search` | Explorer | `research.search` | read | none | 15 s | `N8N_EXPLORER_WEBHOOK_URL` | contract enabled, not connected |
| `vector.search` | Archivist | `knowledge.search` | read | none | 10 s | `N8N_ARCHIVIST_SEARCH_URL` | contract enabled, not connected |
| `vector.ingest` | Archivist | `knowledge.ingest` | write | confirm required | 20 s | `N8N_ARCHIVIST_INGEST_URL` | disabled/guarded |

If a binding or service token is absent or invalid as configuration, execution fails with `N8N_TOOL_NOT_CONFIGURED`. There is no public URL fallback. Only HTTPS bindings without embedded credentials or fragments are accepted.

## Error taxonomy

| Code | Meaning |
| --- | --- |
| `N8N_TOOL_NOT_CONFIGURED` | Server-owned token or binding is absent/unsafe |
| `N8N_TOOL_UNAUTHORIZED` | Service authentication or upstream authentication failed |
| `N8N_TOOL_FORBIDDEN` | Agent or NexAeon approval authority is insufficient |
| `N8N_TOOL_INVALID_REQUEST` | Request shape, input, ID, size, or timeout is invalid |
| `N8N_TOOL_NOT_ALLOWED` | Tool/task is unknown, disabled, or not allowlisted |
| `N8N_TOOL_TIMEOUT` | Bounded call expired |
| `N8N_TOOL_NETWORK_ERROR` | Network transport failed |
| `N8N_TOOL_BAD_RESPONSE` | HTTP/body/JSON response is unusable |
| `N8N_TOOL_RATE_LIMITED` | n8n returned 429 |
| `N8N_TOOL_UPSTREAM_ERROR` | n8n returned a server error |
| `N8N_TOOL_CONTRACT_MISMATCH` | Response identity or schema differs from v1 |

Raw n8n errors, response bodies, credentials, stack traces, and transport URLs do not enter the public error object. No automatic retry is performed in Stage 5-4A.

## Timeout and trace propagation

Every call uses an `AbortController` plus a timer race. The timeout comes from the server registry and cannot be overridden by the client. Request ID and trace ID are carried in body and headers, and the response must echo both exactly.

## Audit

Each attempted execution emits an allowlisted `tool_execution` Operational Audit event containing contract version, request/trace IDs, agent/tool/task, service actor, status, duration, error code, timestamp, and nullable external execution ID. Input, output, token, Authorization header, cookie, credential, URL, and raw error are not recorded.

Tool Execution Audit is separate from Model Usage Log. Stage 5-4A provides the collector boundary; persistent Audit repository wiring occurs when a controlled Agent integration is authorized.

## Approval and replay policy

Read tools preserve request/trace identity but do not require write idempotency. Write tools require a NexAeon-owned confirmation authority and idempotency key before configuration or network access. `vector.ingest` remains disabled even when a synthetic authority is present, so Stage 5-4A cannot write through n8n.

n8n response fields such as `approved: true` are invalid and cannot grant authority. Future persistent write integration must bind confirmation, actor, payload hash, expiry, idempotency, and execution lock in the NexAeon Control Plane.

## Security invariants

- Browser never calls private n8n directly.
- n8n never receives an Admin cookie, CSRF token, or user password.
- n8n cannot approve its own write.
- Tool and workflow binding are server-side.
- Client cannot choose a workflow URL, ID, service URL, credential, or timeout.
- Request ID, trace ID, tool ID, and contract version must be preserved.
- Write tools require NexAeon authority and idempotency.
- n8n does not become a second Model Gateway.
- n8n tool attempts use Operational Audit, not Model Usage Log.
- Missing configuration and malformed/mismatched responses fail closed.

## Future n8n migration steps

1. Review and configure a dedicated rotatable service token on both sides.
2. Update only the allowlisted Explorer/Archivist workflows to consume and return `n8n-tool.v1`.
3. Configure Preview environment bindings first and verify auth, trace, timeout, schema, and error mapping.
4. Connect one read-only Agent tool behind a server-side rollout control.
5. Persist Tool Execution Audit through the existing Operational Audit repository.
6. Run a read-only Production canary before broader rollout.
7. Design write confirmation/idempotency/lock persistence separately before considering `vector.ingest`.

Stage 5-4A does not perform these migration steps and does not start Stage 5-4B.
