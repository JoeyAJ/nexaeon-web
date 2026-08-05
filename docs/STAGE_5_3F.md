# Stage 5-3F — Shared Model Gateway Foundation

## Existing state

Xchange course and learning-activity body generation was deterministic, template-based, and rule-validated in `xchangeStructuredContent.js`. It did not call an AI provider. OpenAI was already installed and used by the separate Navigator/module chat runtime.

## Server-side boundary

`lib/model/` owns provider selection, the provider registry, structured and text generation, health/configuration reporting, output parsing, strict schema validation, normalized errors, fallback, and generation metadata. Provider and model selection come only from server environment variables. The browser cannot submit a model, provider, system prompt, tools, or credentials.

The Xchange Course flow is:

1. Existing authenticated, CSRF-protected Xchange Preview endpoint validates and normalizes the request.
2. Xchange builds a server-owned course prompt and calls the shared Model Gateway.
3. The gateway uses strict structured output and validates the existing v1 course shape with unknown fields forbidden.
4. Existing Xchange quality validation runs on the candidate.
5. Only a valid result becomes the existing Draft Preview and formal Audit record.
6. Administrator confirmation, execution lock, Notion Draft write, delivery validation, and Audit lifecycle remain unchanged.

The model has no Notion client, writer, confirmation, publishing, or tool surface.

## Provider modes

- `mock` (default): existing deterministic generator; safe for Production, local development, and CI.
- `openai`: server-side OpenAI Responses API adapter with `store: false`, strict JSON schema, and tools disabled.
- `disabled`: generation returns a recoverable `MODEL_DISABLED` error and writes a zero-write failure Audit.

When configured, the mock fallback handles missing credentials, timeouts, rate limits, provider 5xx errors, invalid JSON, schema-invalid output, and quality-invalid output. Metadata always identifies the actual provider, model, generation mode, whether fallback was used, request ID, generated time, latency, and token usage when available.

## Environment

Production defaults are safe when none of the new variables are set.

| Variable | Purpose | Secret |
| --- | --- | --- |
| `NEXAEON_MODEL_PROVIDER` | `mock`, `openai`, or `disabled` | No |
| `NEXAEON_MODEL_NAME` | Server allowlisted model configured for the adapter | No |
| `NEXAEON_MODEL_FALLBACK` | `mock` or `disabled` | No |
| `NEXAEON_MODEL_TIMEOUT_MS` | Provider timeout, clamped to 1–30 seconds | No |
| `NEXAEON_MODEL_MAX_OUTPUT_TOKENS` | Output budget, clamped to 500–16,000 | No |
| `OPENAI_API_KEY` | Existing server-side OpenAI credential used by the OpenAI adapter | Yes |

No credential is returned in UI metadata, written to Audit, logged, or included in a prompt.
