# Stage 5-2 Acceptance Notes

Stage 5-2 improves NexAeon Navigator answer quality and reading experience without creating new agents, write actions, Web Search, private data access, account systems, or persistent chat storage.

## Implemented

- Local multilingual query normalization and synonym mapping for Joey, Identity, Research, Learning Coaching, Knowledge Lab, Demo, Action Center, Collaboration, AI Tutor, MVP, and Prototype concepts.
- Multi-module intent detection through deterministic `sourceIntents`.
- Deterministic module catalog retrieval for explicit list questions.
- Source ranking with module intent, title, tags, summary, content, status, update time, and stable tie breakers.
- Source de-duplication by ID, URL, canonical ID, and title-summary similarity key.
- Citation validation that rejects unknown answer markers such as `[S99]`.
- Citation cards displayed only for markers used in the validated answer, except sources-only fallback lists.
- Clickable citation markers with aria labels, focus, smooth scroll, and temporary card highlight.
- Server-side suggested question validation with deterministic fallback and no extra model call.
- Shared Agent Localization Layer for UI-locale-driven answers, suggested questions, and citation display text.
- Structured output now includes `localizedCitations` in the same Responses API call.
- Deterministic localized citation fallback with stable shared glossary labels for modules and common source types.
- Server-side answer language guard that safely falls back without logging the raw answer.
- Safe Markdown rendering for paragraphs, line breaks, ordered lists, unordered lists, bold, italic, inline code, and citation markers.
- Mobile chat layout fixes for input, buttons, citation cards, long text, long URLs, and suggested question wrapping.
- Duplicate submit and IME Enter guards.
- Fixed default production model version `gpt-5.4-mini-2026-03-17`, still overridable by `OPENAI_MODEL` on the server.
- Expanded offline eval dataset to 66 cases, including 12 localization and cross-language UI-locale cases.

## Preserved

- One normal AI request still performs at most 1 input moderation, 1 Responses API call, and 1 output moderation.
- No second model translation call is added for citation localization or suggested questions.
- `store: false`, strict structured output, tools disabled, and no second Responses retry.
- Sources-only safety fallback and `NEXAEON_AGENT_FORCE_SOURCES_ONLY`.
- Seven existing public API sources and their Published/Draft/Hidden public filtering.
- Chinese-first Notion source data remains valid; localization happens at response display time and does not write back to Notion or Airtable.
- `sourceId`, URL, source key, raw source ID, and module key remain untranslated.
- Log privacy whitelist: no query, answer, history, source content, prompts, raw upstream errors, secrets, Authorization, Cookie, full IP, or full User Agent.
- Existing Navigator route `/identity/nexaeon-navigator` and legacy route redirect.
- Existing site language switch, dark/light mode, Liquid Glass style, homepage, video logic, back behavior, and back-to-top behavior.

## Required Verification

Run:

```text
npm run lint
npm test
npm run eval:navigator
npm run build
npm run test:e2e
npm run verify
npm run check:navigator
```

Production verification should confirm `/api/agent/health` remains ready or sources-only depending on environment, `sourceRegistryCount = 7`, and no public response exposes the model version or secrets.
