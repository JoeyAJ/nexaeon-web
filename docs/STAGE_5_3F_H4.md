# Stage 5-3F-H4 — Multilingual Audit Payload Regression

## Production evidence

- Production deployment: `dpl_RJZM3GgjA7sBHdBjXbLmZjmDdWft`
- `POST /api/agent/xchange/actions/preview` returned `503` at approximately `2026-08-05T06:36:43Z` and `2026-08-05T06:38:36Z`.
- No Preview Audit record was persisted and the Preview was not returned, so the write contract remained fail closed with `writesPerformed=0`.
- The deployed Preview persistence catch preserved only the public error code. It discarded `status`, `airtableErrorType`, `diagnosticReason`, `fieldNames`, and `rejectedFieldNames`, and did not emit the safe Audit failure log. Consequently, the historical Airtable response body and exact `rejectedFieldNames` value cannot be recovered after the fact.

The code path and production-shaped reproduction isolate `Sanitized Output` as the rejected field: Korean language, title, audience, and requirements are nested inside this long-text JSON field and are not mapped to Airtable Select fields. All top-level Select values are server-owned fixed values, and timestamps are server-generated ISO strings.

## Root cause

The former Preview Audit copied full `contentPreview`, `createPayloadPreview`, extracted requirements, and other nested content into `Sanitized Output`. `safeJson` checked JavaScript string character count with `.length <= 12_000`, not UTF-8 bytes. Multibyte Korean content could therefore pass the local character guard while exceeding the 12 KB safety envelope used for Audit JSON fields. The oversized fallback also retained an arbitrary serialized JSON prefix in a string rather than reducing the structure.

Production-shaped 90-minute Course fixtures with four objectives, six sessions, two activities, assessment, resources, risks, model metadata, shadow comparison, quality diagnostics, and token usage measured:

| Language | Former characters | Former UTF-8 bytes | Compact characters | Compact UTF-8 bytes | Full Airtable request bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| zh | 6,893 | 11,363 | 2,470 | 2,480 | 3,812 |
| ko | 8,311 | 13,685 | 2,471 | 2,471 | 3,794 |
| en | 13,809 | 13,839 | 2,471 | 2,471 | 3,794 |

This fixture explains the observed language difference: the Traditional Chinese payload stayed below the byte envelope, while the Korean payload passed the old character check (`8,311 < 12,000`) but exceeded the byte envelope (`13,685 > 12,000`). English is covered as a regression case as well and is now compacted before persistence.

## Fix

Preview Audits now persist a bounded projection only:

- Preview/request/operation identifiers, draft type, language, schema versions, hash, expiry, and source
- estimated writes and `writesPerformed`
- content quality, duration, constraint, and extracted-requirement summaries
- model generation, shadow comparison, quality diagnostic, and token usage metadata
- bounded revision lineage metadata

They no longer persist full `contentPreview`, `coreContent`, `sessionPlan`, `activities`, `resources`, `risksAndNotes`, `createPayloadPreview`, Shadow candidates, or the full user/model prompt. Full Preview content stays in the existing short-term Preview Store and is not reconstructed from Audit records. Loss of that store fails closed instead of treating compact Audit metadata as executable content.

Audit JSON limits now use `Buffer.byteLength(..., 'utf8')`. Over-limit generic values use a small parseable object containing the compaction reason, original byte count, bounded scalars, and omitted key names. Serialized JSON is never sliced and treated as a complete document.

## Safe diagnostics

Server logs now retain only safe metadata: status, Airtable error type, diagnostic reason, operation, field names, rejected field names, per-field byte sizes, request-body bytes, and `writesPerformed=0`. Preview Audit persistence uses this logger before returning the unchanged safe front-end code.

The 422 classifier distinguishes:

- `field_too_large`
- `request_body_too_large`
- `field_type_invalid`
- `select_option_invalid`
- `invalid_datetime`
- `invalid_json`
- `unknown_field`
- `general_422`

It never logs the request payload, prompt, credentials, or upstream message.

## Why previous tests missed it

The prior 590-test suite checked schema validity, character length, redaction, quality diagnostics, and Shadow candidate omission separately. It did not pass full zh/ko/en production-shaped payloads through the complete `normalizeAuditRecord → sanitize → compact projection → UTF-8 byte measurement → safeJson → toAirtableFields → Airtable request → fromAirtableRecord` pipeline. It also asserted JavaScript `.length < 12_000`, which encoded the implementation defect instead of the external byte constraint.

No Airtable schema or Vercel environment variable changes are required. Xchange remains in Shadow mode.
