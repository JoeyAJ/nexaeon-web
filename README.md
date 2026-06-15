# NexAeon Web

NexAeon Web is the public site for the NexAeon knowledge system. The production site is:

```text
https://nexaeon-web.vercel.app/
```

## NexAeon Navigator

The public knowledge agent is **NexAeon Navigator** at:

```text
/identity/nexaeon-navigator
```

Navigator only reads the seven public API modules:

- `/api/identity/profiles`
- `/api/research/literature`
- `/api/teaching/courses`
- `/api/knowledge/resources`
- `/api/modules/demos`
- `/api/action/projects`
- `/api/collaboration/options`

It does not use Web Search, does not add write actions, does not create accounts, and does not save chat history. The browser keeps the conversation only in React memory.

## Runtime Model

Production uses a fixed default model version:

```text
gpt-5.4-mini-2026-03-17
```

`OPENAI_MODEL` may still override the default on the server. Client requests cannot select or override the model, and public responses do not expose the model name.

## Safety Boundaries

Navigator keeps the Stage 5 runtime controls:

- 1 input moderation call
- 1 Responses API call
- 1 output moderation call
- strict structured output
- server-created citation cards
- Sources-only fallback
- safe URL validation for external source links
- no query, answer, history, source content, prompts, API keys, Authorization, Cookie, full IP, or full User Agent in logs

## Stage 5-2 Quality

Stage 5-2 improves multilingual query normalization, module intent detection, deterministic source ranking, source de-duplication, citation marker validation, suggested question validation, safe Markdown rendering, mobile chat layout, duplicate-submit guards, and IME Enter behavior.

Offline Navigator evals live in:

```text
tests/fixtures/navigator-evals.json
scripts/eval-navigator.mjs
```

The dataset includes 54 cases across Traditional Chinese, Korean, and English, including core module questions, synonyms, vague/no-source prompts, partial source failures, citation validation, suggested question validation, and safety constraints.

## Local Commands

```text
npm install
npm run lint
npm test
npm run eval:navigator
npm run build
npm run test:e2e
npm run verify
npm run check:navigator
```

Do not commit real API keys or private source data.
