# Stage 5-3F-H3 — Shadow Quality Diagnostics and Prompt Calibration

## Production baseline

The latest Production Shadow run supplied for this stage was operation `06f38b34-d8de-496e-bb87-7a36d6db564c` (Audit record `rec3Vy8tHCEFYmHtU`). It called OpenAI without fallback, returned the expected 11-section Course shape, 5 objectives, 6 sessions, 3 activities, and an exact valid duration. Strict schema validation passed, while quality validation failed. The rules result remained the formal Preview and `writesPerformed` remained `0`.

That historical Audit predates H3 and deliberately contains neither the Shadow candidate nor validator errors. Its exact failed sentences cannot be recovered safely or retroactively. H3 therefore does not claim to reconstruct that private candidate. Instead, a Fake Provider regression reproduces the same measured shape (`schemaPassed=true`, valid duration, 11/5/6/3 counts) and records the existing validator's exact result.

## Verified failure class and root cause

The Production-shaped regression fails these existing semantic checks:

| Check | Observed value | Existing expectation | Classification |
| --- | --- | --- | --- |
| `ai_marketing_objectives` | 0 AI-marketing concepts represented in the objectives | At least 4 recognized subject concepts | Prompt/schema-validator contract gap |
| `ai_marketing_group_activity` | Three individual, generic activities; no qualifying group activity | A group activity covering at least 60% of audience, prompt, brand, validation, and risk concepts | Prompt/schema-validator contract gap |
| `ai_marketing_assessment` | 0 of 6 topic-specific assessment terms | At least 5 of audience, brand voice, prompt, factual accuracy, marketing, and risk | Prompt/schema-validator contract gap |
| `ai_risk_coverage` | 0 recognized risk categories | At least 4 existing risk categories | Prompt/schema-validator contract gap |

The candidate's status mapping, topic relevance, prompt-overlap limit, exact constraint mapping, language/format mapping, objective count, schema, and duration validation all pass. The failure is therefore not a status-mapping bug, threshold bug, locale bug, or preserved-constraint bug. The strict schema describes the structure but cannot express these topic-specific semantic requirements; the previous prompt did not state them precisely enough. Existing validator behavior and thresholds remain unchanged (`topicRelevance >= 0.65`, `promptOverlap < 0.35`).

## Safe quality diagnostic

`shadowComparison.qualityDiagnostic` now stores only bounded, allowlisted diagnostic data:

- `status`, `errorCodes`, `failedChecks`, and `warningCodes`
- `qualityReasons`, sanitized and capped at 12 strings of 180 characters
- `topicRelevance`: `score`, `threshold`, and `valid`
- `promptOverlap`: `ratio`, `threshold`, and `valid`
- `durationValidation`: expected/actual minutes and `valid`
- `preservedConstraints`: exact title, audience, format, duration, difficulty, and language booleans
- `failedPaths`

Codes and checks are capped at 20 entries and paths at 24. Values are derived from the one existing quality-validator result; H3 introduces no parallel quality policy. Unknown failures map to a generic safe code. Secrets and URLs are redacted, and no candidate, source prompt, system prompt, provider error, credential, cookie, authorization value, or full user content is persisted.

The existing Audit serializer round-trips the diagnostic inside `Sanitized Output`. Regression coverage confirms it remains below the 12,000-character field limit, preserves the separate large `Validation Snapshot` lifecycle behavior, contains no `contentPreview`, and leaves `writesPerformed=0`.

## Prompt calibration

The Course generation instruction now makes the already-enforced contract explicit:

- copy all extracted constraints exactly into the overview and preserve them throughout the course;
- cover every extracted required element;
- use observable objective verbs and topic concepts naturally without copying the source prompt;
- provide specific learner output and assessment criteria aligned to objectives;
- for generative-AI marketing courses, cover at least four objective concepts, include a qualifying group activity, use topic-specific assessment dimensions, and cover at least four risk categories;
- address factual verification, privacy, copyright, bias, and accountable human review.

The strict JSON schema, validators, thresholds, injection boundary, provider/model selection, tool prohibition, and no-write rule are unchanged. The prompt adds no schema-external field and hard-codes no course response.

## Admin Audit details

An Audit summary with model data now has a collapsed, read-only **View model details** section. It displays an explicit whitelist of model mode, requested/actual provider, model, Shadow execution/comparison, schema and quality states, latency, token usage, fallback, error code, writes performed, failed checks, quality reasons, and failed paths. Labels follow the Admin page's Traditional Chinese, Korean, and English locale.

The projection never exposes Sanitized Input, content preview, candidate, prompt, API key, Admin session hash, requester fingerprint, or arbitrary record JSON. Old records and records without Shadow data continue to render without a details section. Existing Admin authentication and read-only API access are unchanged.

## Verification and safety boundaries

All model tests use Fake Providers and make no OpenAI request. Tests cover exact diagnostic mapping, bounds and redaction, Production-shaped root-cause reproduction, an equivalent passing candidate without threshold changes, prompt safety, Audit/Airtable round-trip, Admin allowlisting, expandable UI, legacy records, and existing Preview/Confirmation/Execution Lock/Notion Delivery/Validation/Audit regressions.

Final local verification on 2026-08-05 passed: ESLint, 588/588 Node tests, 132/132 Navigator offline eval cases, the Vite Production build, 103/103 Playwright tests, and the aggregate `npm run verify` command.

Production remains in `shadow` mode. Shadow output cannot replace the rules Preview, does not call tools, and cannot write Notion.

## Next Shadow acceptance and Live prerequisites

1. From an authenticated Admin session, create the same representative Xchange Course Preview in Production.
2. Confirm the formal Preview is still rules-generated and `writesPerformed=0`.
3. Open the matching Admin Audit details and confirm OpenAI executed without fallback, schema passed, and the structured diagnostic is present.
4. Require `qualityPassed=true` (or diagnose the exact new codes without weakening thresholds), valid duration and constraints, acceptable relevance/overlap, and no sensitive content in Audit.
5. Repeat across representative Traditional Chinese, Korean, and English inputs and review latency/token cost before considering rollout.

Live is not approved solely by this code change. It requires successful real Production Shadow samples after deployment, stable schema and quality results, security and cost review, an explicit operator decision, and a separate controlled environment change with rollback monitoring.

## Hotfix 2 — Traditional Chinese measurable objective alignment

Production Shadow operation `ebc2d1fb-4740-452a-a9ea-2eb79b3fe8ff` passed schema, relevance (`1`), overlap (`0`), duration (`90/90`), and every preserved constraint without fallback. Its only quality failure was `LEARNING_OBJECTIVE_VERB_INVALID` at `learningObjectives[]`.

The validator's existing Traditional Chinese verbs were `辨識`, `說明`, `解釋`, `比較`, `應用`, `建立`, `評估`, `設計`, and `分析`. The Prompt previously asked only for “observable verbs” and did not expose that formal vocabulary. The old regular expression also accepted a recognized verb anywhere in an objective rather than enforcing the requested start position.

Hotfix 2 moves the existing Traditional Chinese, Korean, and English vocabularies into one exported, immutable source shared by Prompt construction and validation. Every Traditional Chinese objective must now start with an approved verb; the Prompt lists the same locale-specific canonical values and explicitly rejects vague Traditional Chinese starters such as `了解`, `知道`, and `熟悉`. Existing Korean and English validation behavior remains unchanged. No verb, quality check, threshold, schema field, or security boundary was removed or weakened.

Regression tests cover all-objective enforcement across three to five Traditional Chinese objectives, vague and mid-sentence verb rejection, unchanged Korean and English behavior, Prompt-injection boundaries, a Production-shaped quality-passing Fake Provider Shadow, safe Audit diagnostic round-trip, and `writesPerformed=0` with the rules Preview retained.
