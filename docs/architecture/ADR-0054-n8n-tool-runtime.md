# ADR-0054: n8n as a Controlled Tool Runtime

Status: Accepted

Date: 2026-08-11

## Context

NexAeon already owns browser authentication, CSRF, RBAC, Agent routing, Preview, confirmation, idempotency, execution locks, delivery validation, Operational Audit, and the Shared Model Gateway. Existing n8n concepts include an Orchestrator webhook, Explorer Tavily execution, and Archivist vector retrieval, but their current workflow details are not treated as a trusted contract.

Stage 5-4A needs a safe service boundary before any Agent migrates to n8n. Direct Agent-to-webhook fetches would scatter credentials and URLs, weaken allowlisting, and make response identity difficult to verify. Making n8n an independent AI brain would duplicate the Shared Model Gateway and blur execution authority.

## Decision

1. n8n is a controlled tool runtime, not an independent NexAeon AI brain.
2. Model reasoning and generation stay in the Shared Model Gateway.
3. Tool execution may use n8n only through the shared server-side n8n client.
4. NexAeon-to-n8n calls require a dedicated rotatable Bearer service token.
5. The existing NexAeon Tool Registry is the single server-side authority for tool, Agent, task, risk, approval, timeout, schema, and workflow binding.
6. A caller selects a logical tool ID, never a workflow URL or workflow ID.
7. Request/response contract `n8n-tool.v1` requires stable request ID, trace ID, tool ID, and version propagation.
8. Read and write risk are separate. Write tools require NexAeon confirmation authority and idempotency before any network call.
9. n8n cannot approve its own write or bypass Preview, confirmation, execution lock, Audit, or delivery validation.
10. The browser cannot directly access a private n8n workflow and n8n never receives the Admin cookie.
11. Future Orchestrator integration uses n8n in tool-runtime mode, not as an authoritative autonomous orchestrator.
12. A legacy n8n AI Agent may temporarily remain in n8n, but NexAeon does not trust it as reasoning or execution authority.

## Consequences

### Positive

- One adapter centralizes authentication, timeout, error mapping, trace propagation, and response validation.
- Workflow URLs and credentials remain server-only.
- Agent and task allowlists are explicit and testable.
- n8n can be replaced or reconfigured without changing browser contracts.
- Read-only migration can precede write-tool design.

### Negative

- n8n workflows must eventually adapt to the exact v1 envelope.
- There is not yet a live connectivity or workflow-compatibility canary.
- Tool Execution Audit persistence is deferred until the first controlled Agent integration.
- Service-token rotation remains an operator procedure rather than an automated secret manager workflow.

### Operational trade-offs

- Stage 5-4A performs no automatic retry, limiting amplification but exposing transient failures to the caller.
- Fixed per-tool timeouts favor bounded serverless duration over long-running n8n execution.
- A single current/previous token pair simplifies rotation without introducing HMAC timestamp synchronization.
- Disabled `vector.ingest` proves the authority boundary without enabling a new write path.

## Security invariants

- NexAeon remains the authority.
- Shared Model Gateway remains the reasoning layer.
- n8n remains the tool-execution layer.
- Browser cannot choose or call an n8n workflow.
- Provider and service secrets never reach the browser.
- Tool binding, timeout, input schema, response schema, and risk policy are server-owned.
- n8n cannot authorize execution or return trusted approval.
- Write tools require NexAeon confirmation and idempotency.
- Every attempt is bounded and traceable.
- Contract mismatch and missing configuration fail closed.

## Migration path

1. Ratify the v1 envelope with the n8n workflow owner.
2. Configure credentials and bindings in Preview only.
3. Add contract-compliant authentication/response nodes to one read-only workflow.
4. Verify read-only trace and failure behavior with a bounded canary.
5. Connect one Agent through a rollout control in Stage 5-4B only after human approval.
6. Design persistent write authority independently; do not enable `vector.ingest` by configuration alone.

## Alternatives considered

- **Direct browser-to-n8n:** rejected because it exposes the private workflow boundary and bypasses NexAeon controls.
- **Per-Agent webhook clients:** rejected because credentials, timeout, errors, and allowlists would diverge.
- **n8n as Model Gateway:** rejected because it duplicates the accepted Stage 5-3F architecture.
- **Admin cookie or CSRF as service authentication:** rejected because browser identity is not service identity.
- **HMAC timestamp protocol now:** deferred; a dedicated rotatable Bearer token is simpler and sufficient before live connectivity.
- **Enable vector ingestion now:** rejected because confirmation, persistent idempotency, and execution-lock integration are not part of Stage 5-4A.

## Related evidence

- `docs/STAGE_5_4A_N8N_TOOL_CONTRACT.md`
- `lib/agent/n8nServiceAuth.js`
- `lib/agent/n8nToolContracts.js`
- `lib/agent/n8nToolClient.js`
- `lib/agent/n8nToolAudit.js`
- `tests/n8n-tool-runtime.test.js`
