# Stage 5-3F-I Shared Model Gateway Hardening

Status: Accepted for Stage 5-3F completion
Scope: server-side model generation, Xchange Course Preview, controlled delivery, and evidence required before Stage 5-4A

## Architecture map

| Concern | Implementation |
| --- | --- |
| Gateway core | `lib/model/modelGateway.js` |
| Provider registry and adapters | `lib/model/providerRegistry.js`, `lib/model/providers/openaiProvider.js`, `lib/model/providers/mockProvider.js` |
| Server-owned policy and ceilings | `lib/model/modelConfig.js`, `lib/model/modelReadiness.js` |
| Prompt registry | `lib/agent/xchangeCoursePrompt.js` (`xchange-course-v1`) |
| Strict schema registry | `lib/agent/xchangeCourseSchema.js`, `lib/model/schemaValidation.js` |
| Locale semantic registry | `lib/agent/xchangeSemanticRegistry.js` |
| Content validation and diagnostics | `lib/agent/xchangeStructuredContent.js`, `lib/agent/xchangeQualityDiagnostics.js` |
| Per-attempt usage trace | `lib/model/modelUsage.js` |
| Preview, confirmation, idempotency | `lib/agent/xchangeWriteContract.js` |
| Execution lock and operational Audit | `lib/agent/auditRepository.js` |
| Notion Draft delivery | `lib/agent/xchangeNotionWriter.js` |
| Post-delivery validation | `lib/agent/xchangeDraftValidation.js`, `lib/agent/xchangeValidationSnapshot.js` |
| Protected API control plane | `api/agent/chat.js`, `vercel.json` |
| Rollout modes | `rules`, `shadow`, `live`, and fail-closed `disabled` in `lib/model/modelConfig.js` |

The browser calls the protected Xchange operation route. It never imports a provider adapter or receives a provider credential. The Gateway can only return text or a structured proposal. Preview creation, confirmation authority, the persistent execution lock, Notion delivery, delivery validation, and Audit stay outside the model layer.

## Hardening matrix

| Scenario | Expected control | Error / fallback | Preview and writes | Regression evidence |
| --- | --- | --- | --- | --- |
| Provider 401/403 | Normalize without raw body or credential | `MODEL_CONFIGURATION_INVALID`; no retry; optional deterministic mock fallback | No provider candidate; no write. A configured fallback may create one separately validated rules-equivalent Preview | `model-gateway-hardening.test.js`, `model-gateway.test.js` |
| Provider 429 | One primary attempt only | `MODEL_RATE_LIMITED`; no retry; at most one mock fallback | Never two Previews; zero delivery writes | Same |
| Provider 5xx | One primary attempt only | `MODEL_PROVIDER_UNAVAILABLE`; no retry; at most one mock fallback | Same | Same |
| Provider timeout | SDK timeout plus Gateway attempt timeout | `MODEL_TIMEOUT`; no retry; optional fallback | No indefinite wait; no model-owned write | Same |
| Network disconnect | Normalize transient network failure | `MODEL_PROVIDER_ERROR`; no retry; optional fallback | No unvalidated Preview | Same |
| Malformed response / invalid JSON | Parse before schema | `MODEL_JSON_INVALID`; optional fallback | Malformed output never reaches Preview | `model-gateway-hardening.test.js`, `model-gateway.test.js` |
| Missing/wrong/extra schema field | Strict recursive schema, `additionalProperties:false` | `MODEL_SCHEMA_INVALID`; optional fallback | Model output never reaches Preview | Same |
| Hallucinated `publish`, `writeToNotion`, or `bypassConfirmation` | Strict schema plus separate control plane | `MODEL_SCHEMA_INVALID` | Failure Audit, zero writes | `model-gateway-hardening.test.js` |
| Content irrelevant / generic / structurally incomplete | Existing locale-aware content validator, unchanged thresholds | `CONTENT_VALIDATION_FAILED` | No live Preview; zero writes | `model-gateway-hardening.test.js`, `xchange-locale-semantic-regression.test.js` |
| Duplicate Preview | Five-minute server idempotency identity | Reuse existing Preview | One Preview Audit | `xchange-model-modes.test.js`, `xchange-write-contract.test.js` |
| Duplicate confirmation | Signed claims plus persistent execution state | Replay result or `EXECUTION_IN_PROGRESS` | One Notion page maximum | `xchange-write-execution.test.js` |
| Concurrent delivery | Atomic Airtable `performUpsert` execution claim | One lock winner | One writer call maximum | `xchange-write-execution.test.js`, `xchange-draft-revision.test.js` |
| Delivery mismatch | Canonical snapshot and Notion reread | Validation error / warning taxonomy | No hidden second write | `xchange-draft-validation.test.js` |
| Invalid rollout mode | Server-only enum validation | `MODEL_MODE_INVALID` | Failure Audit, zero writes | `xchange-model-modes.test.js` |

## Attempt, repair, retry, fallback, and timeout policy

| Operation | Ceiling | Retryable classification | Automatic retry | Fallback | Failure code |
| --- | ---: | --- | ---: | ---: | --- |
| Primary provider attempt | 1 | Timeout, 429, 5xx, and network errors are marked retryable for operators | 0 | At most one deterministic mock attempt when configured | Normalized model taxonomy |
| Fallback provider attempt | 1 | No retry | 0 | 0 further fallbacks | Normalized model taxonomy |
| Schema repair | 0 | Not applicable | 0 | A deterministic fallback may replace the invalid candidate; it does not repair provider output | `MODEL_JSON_INVALID` / `MODEL_SCHEMA_INVALID` |
| Per-provider attempt | `NEXAEON_MODEL_TIMEOUT_MS`, clamped to 1–30 seconds; default 25 seconds | Timeout is marked transient | 0 | Policy above | `MODEL_TIMEOUT` |
| Whole Gateway invocation | Maximum two bounded attempts, therefore at most 60 seconds under the maximum configuration | Not separately retried | 0 | Included in the two-attempt ceiling | Last attempt error |

No loop exists in the Gateway. `MODEL_GATEWAY_LIMITS` fixes primary=1, retry=0, fallback=1, repair=0, total=2. A schema repair call is deliberately disabled in Stage 5-3F: strict structured output followed by parse/schema validation and a safe deterministic fallback is easier to reason about and cannot amplify cost. The OpenAI adapter also enforces `max_output_tokens` (500–16,000, default 8,000). Input size remains bounded by the existing Xchange request schema and API payload limits.

The Gateway timeout releases the request even if a custom adapter ignores cancellation. The only real adapter in this stage is the OpenAI SDK adapter, which also receives the same timeout. A future provider adapter must support cancellation before registration.

## Retry and fallback decision

Stage 5-3F performs no automatic primary retry. Transient errors are classified as retryable for observability and operator decisions, but one request makes only one paid primary attempt. This is stricter than retrying 429/5xx/network/timeout and avoids retry amplification in serverless instances. Authentication, invalid request, schema, safety, billing/configuration, and unsupported provider failures are never retried.

When `NEXAEON_MODEL_FALLBACK=mock`, one deterministic fallback may run after a primary failure or invalid output. It receives the same `requestId` and `traceId`; attempt records distinguish primary from fallback. Only the final validated candidate can create one Preview. Fallback never invokes Notion or Airtable itself.

## Model usage trace versus Operational Audit

These remain separate concepts:

- Model Usage Log: one allowlisted server log event per attempt from `modelUsage.js`. It includes request/trace IDs, agent/task, provider/model, prompt/schema/validator versions, attempt number, retry count, fallback flag, status/error, nullable token usage, latency, and `estimatedCost:null`.
- Operational Audit: the existing protected Airtable lifecycle for Preview, confirmation, lock, delivery, and validation. A bounded copy of attempt metadata is included for correlation, but the Audit remains the authority for operation state.

No prompt, candidate, provider response body, Authorization header, cookie, IP address, API key, or secret is placed in a usage record. Missing usage stays `null`; cost stays `null` because Stage 5-3F has no pinned pricing registry and must not invent estimates.

## Rate-limit status

The Xchange generation endpoint has existing same-origin, Admin session, CSRF, input-size, Preview idempotency, provider token ceiling, timeout, and execution-lock controls. Admin login has an instance-local attempt limiter. There is no dedicated distributed generation rate limiter in Stage 5-3F. This is an accepted remaining risk: authenticated request bursts across serverless instances can reach the provider. Stage 5-3F does not add Redis, Upstash, or Cloudflare infrastructure. Before high-volume live rollout, add a distributed per-actor/per-operation limiter at the control plane and return a bounded `Retry-After` response.

## Rollback procedure (do not execute during acceptance)

1. **AI provider outage**: set the server-owned Xchange mode from `live` to `shadow`; if provider calls must stop, use `rules`. Redeploy, verify Model Readiness, then run a zero-write Preview. Never expose the mode switch to the browser.
2. **Validator regression**: immediately use `rules` or `disabled` according to severity, identify the last known good commit, revert only the validator/prompt commit, run multilingual positive and negative regressions, deploy, and perform one authenticated zero-write Preview.
3. **Deployment regression**: use Vercel deployment history to promote the previous stable deployment. Confirm the production alias, HTTP 200, static asset version, read-only health, and protected Preview behavior. Do not change Notion/Airtable schemas.
4. **Schema or prompt regression**: restore the previous versioned prompt/schema implementation (`xchange-course-v1` / Course schema `v1`) from the last known good commit. Because Stage 5-3F does not maintain multiple runtime prompt bodies, rollback is by commit and deployment rather than a client flag.

Rollback verification evidence is the server-owned mode/readiness regression, versioned prompt/schema constants, clean Git history, and Vercel deployment history. No Production rollback was performed for this stage.

## Threat model

| Threat | Existing control | Test evidence | Remaining risk |
| --- | --- | --- | --- |
| Prompt injection | Untrusted requirements are data; system instruction forbids role/tool/secret changes; tools disabled | `xchange-shadow-quality-diagnostics.test.js`, `model-gateway.test.js` | Novel semantic injection may reduce content quality, but cannot grant authority |
| Hallucinated action | Strict schema and proposal-only Gateway | `model-gateway-hardening.test.js` | None beyond content inside allowed fields |
| Schema abuse | Recursive strict schema, bounds, no additional properties | `model-gateway.test.js`, hardening test | Schema-v1 evolution requires deliberate migration |
| Oversized input | Request allowlists and field limits; content/body block ceilings | Xchange contract and structured-content tests | No distributed byte-budget ledger |
| Token exhaustion | Server-only max output token ceiling and attempt ceiling | Hardening/config tests | Provider-side input billing remains externally governed |
| Retry amplification | Zero automatic retries, maximum one fallback | Hardening fallback tests | User may submit distinct authenticated requests |
| Duplicate confirmation | Signed confirmation claims and persistent state | `xchange-write-execution.test.js` | Airtable availability is required to acquire the lock |
| Replay request | Actor/session/hash/expiry/idempotency binding | Xchange execution and revision tests | Five-minute Preview availability is instance-local before execution |
| Secret leakage | Server-only configuration, allowlisted projections, redaction | Model usage, Audit, diagnostics, and bundle scans | Future log additions require the same allowlist discipline |
| Provider compromise / malformed result | JSON parse, strict schema, content validation, no tools | Gateway and multilingual negative tests | Semantically plausible false content remains a human-review concern |
| Locale bypass | Locale-specific canonical registry without implicit cross-locale fallback | `xchange-locale-semantic-regression.test.js` | New concepts need curated lexical variants |
| Client model override | Request mass-assignment allowlist rejects mode/provider/model | `xchange-model-modes.test.js` | Server environment remains privileged configuration |
| Unauthorized Preview | Same-origin, Admin session, CSRF | API route tests | Distributed generation rate limiting is absent |
| Unauthorized Delivery | Confirmation token, actor binding, lock, private Draft writer | Execution tests | Compromised Admin session remains high impact |
| Audit tampering / missing trace | Append-only Audit, bounded projections, request/trace IDs, fail-closed lock persistence | Audit and execution-lock tests | Airtable is an external availability dependency |

## Bundle review

The model and provider files are imported only by Vercel Function code. No `openai` import exists under `src/`, and the generated client assets contain no OpenAI SDK endpoint, provider credential, or server environment variable value. The existing large `index` chunk warning predates Stage 5-3F and remains separate frontend code-splitting debt; this stage adds no client UI or provider SDK bundle.

## Acceptance boundary

Production stays in `shadow`; no environment variable and no Notion/Airtable schema is changed. Production checks for this stage are deployment readiness, HTTP health, build/static version, and protected zero-write behavior. The authenticated Korean Preview canary from Stage 5-3F-H is accepted evidence and is not repeated in bulk.
