# NexAeon Navigator Eval Dataset

Stage 5-2 uses an offline deterministic eval dataset:

```text
tests/fixtures/navigator-evals.json
scripts/eval-navigator.mjs
```

The dataset currently contains 66 cases across Traditional Chinese, Korean, and English.

## Coverage

- Core questions for Joey identity, research areas, public demos, Research, Learning Coaching, Knowledge Lab, Action Center, and Collaboration.
- Natural wording, synonyms, mixed-language product terms, vague no-source prompts, and prompt-injection style safety prompts.
- Query intent checks: `intent`, `sourceIntent`, optional `sourceIntents`, and optional `queryType`.
- Expected source modules and forbidden source modules.
- Partial source failure with mock endpoint failure.
- Citation marker validation with valid `[S1]` and rejected invalid `[S99]`.
- Suggested question validation for unsafe Web Search, email, Airtable/Notion, and write-like suggestions.
- Shared localization validation for answer language, suggested questions, and localized citation display fields.
- Cross-language stress cases where the UI locale differs from the user's input language.
- Brand safety checks against the old Nexon spelling.

The eval uses fixtures and mock fetch responses only. It does not require a real Production API key and does not call OpenAI.

## Command

```text
npm run eval:navigator
```

Passing output should look like:

```text
Navigator Offline Eval
66/66 passed
```
