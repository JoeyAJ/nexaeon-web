# Stage 5-3F-H1 — Xchange Model Modes and Production Readiness

## Mode and provider are separate controls

`NEXAEON_XCHANGE_MODEL_MODE` controls whether a generated Course candidate can participate in Preview creation. `NEXAEON_MODEL_PROVIDER` selects the server-side implementation used by the shared Model Gateway. Neither value is accepted from a browser request.

The safe defaults are:

```text
NEXAEON_XCHANGE_MODEL_MODE=rules
NEXAEON_MODEL_PROVIDER=mock
NEXAEON_MODEL_FALLBACK=mock
```

No model output can confirm, execute, publish, select a Notion target, or write to Notion. Every accepted candidate still enters the existing Preview, Admin Confirmation, execution-lock, Notion delivery, Delivery Validation, and Audit lifecycle.

## Rollout modes

- `rules`: uses only the existing deterministic generator and local quality validation. It does not call the Model Gateway. This is the Production default.
- `shadow`: the deterministic result remains the only formal Preview. The Gateway candidate is validated only for objective structural comparison. Shadow content and prompts are not stored, and provider failure does not block the rules Preview.
- `live`: a Gateway candidate may become the single formal Preview only after JSON parsing, strict schema validation, and existing Xchange quality validation. Allowed mock fallback is recorded as `live_fallback` with requested and actual providers.
- `disabled`: does not call a provider or create a Preview. It returns `MODEL_DISABLED` after a zero-write Failure Audit has persisted.

Learning Activity Preview remains on the deterministic generator because this stage's strict model schema is the Xchange Course schema.

## Readiness endpoint

`GET /api/system/model-readiness` is read-only and requires the existing Admin session cookie. It reports only safe mode, provider, fallback, configuration booleans, and rules/shadow/live readiness. It never returns keys, partial keys, environment values, prompts, provider errors, authorization headers, or Admin session data.

Readiness means:

- Rules is ready while the deterministic generator is available.
- Shadow requires a valid enabled provider and any provider-required credentials.
- Live additionally requires the strict schema registry and a valid fallback policy.
- Disabled is a valid mode but cannot generate.

## Safe rollout and rollback

Change server-side variables one step at a time, verify the Admin-only readiness endpoint, deploy, and inspect zero-write Shadow Audit metadata before considering Live. Do not add a real credential to source control.

Immediate rollback:

```text
NEXAEON_XCHANGE_MODEL_MODE=rules
NEXAEON_MODEL_PROVIDER=mock
NEXAEON_MODEL_FALLBACK=mock
```

Changing environment settings requires a new deployment. Existing deployments do not automatically receive updated environment variables.
