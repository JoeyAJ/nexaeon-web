# ADR-0053: Shared Model Gateway Architecture Decision

Status: Accepted
Date: 2026-08-11

## Context

NexAeon is a Vite application deployed with Vercel Functions. Stage 5-3F introduces Xchange Course generation as the first controlled AI-agent integration that can produce a candidate for an existing Preview and confirmed-delivery workflow. The system already owns Admin authentication, CSRF, Preview confirmation, idempotency, an Airtable execution lock and Audit lifecycle, private Notion Draft creation, and delivery validation.

Direct browser-to-provider calls would expose credentials and let client input influence provider/model policy. Giving the model access to the write control plane would collapse proposal and execution authority. Moving the entire control plane into a provider-specific service would also couple authorization and delivery safety to one vendor.

## Decision

1. The Shared Model Gateway is deployed inside NexAeon Vercel Functions for Stage 5-3F.
2. Gateway Core remains isolated under `lib/model/` and depends on a small provider interface, so it can be extracted later without moving the control plane.
3. The browser never calls a model provider directly and cannot submit a provider, model, credential, system prompt, tool, rollout mode, or schema implementation.
4. Provider/model/fallback/timeout/token policy is server-owned.
5. Admin authentication, CSRF, Preview, confirmation, idempotency, Audit, and delivery validation remain in the NexAeon control plane.
6. The Gateway generates only a Draft or Proposal. It has no Notion client, Airtable repository, confirmation signer, execution lock, or publishing tool.
7. Formal writes require Controlled Execution after a validated Preview and explicit confirmation. The persistent execution lock must succeed before the single Notion writer call.
8. `MODEL_MODE` supports `rules`, `shadow`, `live`, and fail-closed `disabled`. Production promotion between modes is an operator action, never a browser action.
9. Model output must pass JSON parsing, strict schema validation, and content validation before it can participate in Preview creation.
10. Operational Audit and Model Usage Log are separate. Audit owns operation lifecycle; the usage log owns safe per-attempt telemetry. They correlate through request and trace IDs.
11. n8n, Hermes, and MCP may later use a controlled Service API. They do not receive provider credentials or bypass Preview/confirmation policy.
12. A Cloudflare Worker is not adopted for this stage. Adding another execution plane before workload or isolation evidence exists would increase operational and security complexity.

## Security invariants

- A model cannot authorize or execute an operation.
- A model cannot bypass confirmation, idempotency, the execution lock, or delivery validation.
- Provider keys and server environment values never reach the browser or model output.
- The model layer cannot directly write to Notion or Airtable.
- Tools remain disabled for Xchange generation.
- Every provider attempt has a request/trace identity and bounded safe usage metadata.
- Missing token usage and estimated cost remain `null`, never invented.
- Invalid JSON, schema, content, mode, authentication, confirmation, or lock state fails closed.
- Production can return to `shadow` or `rules` without changing client code.

## Consequences

### Positive

- Provider integration is reusable while authority stays centralized.
- Xchange inherits the established Preview and delivery controls.
- Rules and shadow modes support safe comparison and rapid provider rollback.
- Strict schema plus locale-aware content validation prevents raw provider output from becoming a Preview.
- Per-attempt telemetry distinguishes primary and fallback behavior without storing prompts or secrets.

### Negative

- Vercel Functions currently host both Gateway and control plane, so a deployment regression can affect both.
- The deterministic mock is the only configured fallback; there is no second paid provider.
- There is no automatic provider retry or schema-repair call.
- There is no distributed Xchange generation rate limiter or pricing ledger.
- Audit/lock availability depends on Airtable, and formal delivery depends on Notion.

### Operational trade-offs

- Zero automatic retries reduce retry amplification and cost, but transient provider failures may fall back sooner.
- Per-attempt timeouts and a two-attempt maximum give a finite request bound, while a custom non-cancellable adapter could continue work after the caller times out.
- Keeping cost as `null` avoids inaccurate accounting until a versioned pricing source exists.
- Commit/deployment rollback is used for prompt/schema versions rather than maintaining multiple runtime prompt bodies.

## Migration path and extraction conditions

Keep the Gateway in Vercel Functions until one or more of these conditions is demonstrated:

- sustained model traffic requires an independent scaling or concurrency policy;
- multiple NexAeon services need the same Gateway through service authentication;
- provider routing, budgets, or regional data controls require an isolated service;
- Vercel Function duration or deployment coupling materially affects reliability;
- a distributed usage/rate-limit store becomes necessary.

Extraction must preserve the provider interface, server-owned policy, strict schema boundary, per-attempt trace contract, and all security invariants. The extracted Gateway still returns proposals only. Auth, confirmation, execution lock, formal write, and Audit authority remain in a controlled service plane.

## Alternatives considered

- **Browser-to-provider:** rejected because it exposes policy and credential boundaries.
- **Model-owned tools or direct Notion/Airtable writes:** rejected because proposal would equal execution authority.
- **n8n/Hermes as the Stage 5-3F Gateway:** deferred until Stage 5-4 service authentication and tool contracts exist.
- **Cloudflare Worker now:** deferred; no current requirement justifies a second deployment/control surface.
- **New secondary paid provider:** out of scope; deterministic fallback provides the required safe degradation without new secrets.

## Related evidence

- `docs/STAGE_5_3F.md`
- `docs/STAGE_5_3F_I_HARDENING.md`
- `tests/model-gateway-hardening.test.js`
- `tests/model-gateway.test.js`
- `tests/xchange-model-modes.test.js`
- `tests/xchange-write-execution.test.js`
- `tests/xchange-draft-validation.test.js`
