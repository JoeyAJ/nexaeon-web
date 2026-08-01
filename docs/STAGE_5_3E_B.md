# Stage 5-3E-B — Xchange Confirmed Write Execution

## Scope

Xchange can create exactly one new private Learning Coaching draft after an authenticated administrator explicitly confirms a valid Stage 5-3E-A preview. The only enabled tools are `createCourseDraft` and `createLearningActivityDraft`; update, delete, publish, client-selected database IDs, and client system fields remain forbidden.

## API flow

- Preview: `POST /api/agent/xchange/actions/preview`
- Execute: `POST /api/agent/xchange/actions/execute`
- Both routes require an allowed origin, an admin session, and the session CSRF header.
- The preview returns a five-minute confirmation token signed by the server. Its claims bind the operation ID, stable preview hash, idempotency key, tool, target, draft type, language, normalized payload hash, schema versions, expiry, and admin session hash.
- Execute compares every bound value against the persisted preview Audit record. A modified or expired request performs zero Notion writes.

## Notion contract

The server resolves `NOTION_TEACHING_DATABASE_ID`; the client cannot provide it. Before create, the writer resolves the database's current data source and validates the exact read-adapter property names and types. It fails closed with `SCHEMA_MISMATCH` before `pages.create` when the schema differs.

Course fields map to `標題`, `教學分類`, `形式`, `子主題`, `對象`, `可講時間(分)`, `難度`, `語言`, `標籤`, optional `檔案連結`, `狀態`, and `公開狀態`. Learning Activity maps the activity title/type/instructions/time/materials to the same confirmed schema. `published=false`, logical `visibility=Private`, and `createdViaAgent=xchange` remain enforced contract and Audit metadata and are not guessed as nonexistent Notion properties.

### Observed Production Notion schema

The schema below was read from the Production integration through `databases.retrieve` and `dataSources.retrieve`; no page query or write was performed.

| Property | Production type | Safe option names |
| --- | --- | --- |
| 標題 | title | — |
| 教學分類 | select | AI, 商業, 心理, 教育, 跨域 |
| 形式 | multi_select | PPT, 課堂講義, 案例, 影片, 問卷, Workshop |
| 子主題 | rich_text | — |
| 對象 | multi_select | 大學生, 研究生, 中國學生, 韓國學生, 在職人員 |
| 可講時間(分) | number | — |
| 難度 | select | 初級, 中級, 高級 |
| 語言 | multi_select | 中文, 韓文, 英文 |
| 標籤 | multi_select | 重要, 熱門, 實驗中, 核心 |
| 檔案連結 | url | — |
| 狀態 | status | 未開始, 進行中, 完成 |
| 公開狀態 | select | Hidden, Draft, Published |

The original writer incorrectly required `狀態=Draft` and `公開狀態=Private`; neither option exists. The Production-safe representation is `狀態=未開始` and `公開狀態=Draft`. The public read adapter still returns only records whose exact `公開狀態` normalizes to Published, so a newly created Draft remains excluded from `GET /api/teaching/courses`.

`標題`, `教學分類`, `子主題`, `可講時間(分)`, `難度`, `語言`, `狀態`, and `公開狀態` are required by the write adapter. `形式`, `對象`, `標籤`, and `檔案連結` are optional: if their property is absent, or an optional select value is not in the observed option allowlist, the property is omitted rather than creating a Notion schema option. Required fields, required types, and the `未開始` / `Draft` safety options always fail closed when unavailable.

Schema failures emit safe structured server diagnostics containing `missingProperties`, `mismatchedProperties` with expected and actual types, `missingRequiredOptions`, `unsupportedWritableProperties`, and optional-property omissions. Logs never include Notion tokens or database/data-source IDs; the client continues to receive only `SCHEMA_MISMATCH`.

## Idempotency and Audit

Audit is the durable source of truth. The lifecycle is `previewed/pending → executing/confirmed → succeeded` or `failed`. Administrator IDs are stored only as hashes, and secrets, cookies, CSRF values, tokens, database IDs, and raw headers are excluded.

Execution uses an atomic Airtable `PATCH` with `performUpsert`, keyed by deterministic `Audit ID`. Only the request whose claim is created can call Notion. A parallel claimant returns `EXECUTION_IN_PROGRESS`; a completed retry replays the persisted result with `writesPerformed=1` and does not call Notion again. Audit persistence failures fail closed before the Notion create.

### Production incident and diagnostics

The original Stage 5-3E-B lock sent `performUpsert` through `POST` (create records). Airtable accepts record upserts on its update-records path, so the lock request was rejected before any Notion write. The adapter now uses `PATCH`, accepts `createdRecords` and `updatedRecords` as record-ID strings or record objects, and rejects missing or ambiguous outcome metadata rather than guessing lock ownership.

Server logs retain only safe diagnostic metadata. They distinguish missing configuration, schema rejection, HTTP request rejection, invalid Airtable responses, lock failure, and general persistence failure. For rejected requests they retain the HTTP status, sanitized Airtable error type, a bounded diagnostic category, operation stage, and submitted field names. Tokens, base/table IDs, response bodies, cookies, and raw error messages are never logged or returned to the client. The client continues to receive the safe `AUDIT_PERSISTENCE_FAILED` contract and `writesPerformed=0`.

### Airtable field mapping

The existing `NexAeon Tool Execution Audit` formal schema remains unchanged. The adapter writes these columns: `Audit ID`, `Operation ID`, `Idempotency Key`, `Timestamp`, `Agent ID`, `Tool ID`, `Permission Level`, `Target Data Source`, `Action Type`, `Execution Status`, `Confirmation Status`, `Confirmation Timestamp`, `Actor ID`, `Actor Role`, `Actor Session Hash`, `Sanitized Input`, `Sanitized Output`, `External Record ID`, `Error Code`, `Error Message`, `Duration Ms`, `Preview Hash`, `Requester Fingerprint`, `Audit Persistence Status`, `Created At`, `Schema Version`, and `Record Type`.

The Xchange concepts map without adding or renaming Airtable columns:

- Agent → `Agent ID`; Tool → `Tool ID`; Status → `Execution Status`.
- Requested By → hashed `Actor ID`; Actor Hash → `Actor Session Hash`.
- Confirmation → `Confirmation Status` and `Confirmation Timestamp`.
- Request ID, Source, Estimated Writes, Writes Performed, Started At, and Completed At → structured JSON in `Sanitized Output`.
- Input and Output → `Sanitized Input` and `Sanitized Output`.

`Audit ID` must remain a writable single-line-text merge field. No new Airtable field is required for this repair; migration, consistency, repair, and existing Audit reads continue to use the formal schema above.

## Verification safety

Unit, integration, and browser tests use mocked Notion responses. Automated verification must never confirm a write against Production Notion. Production acceptance of the final create remains a deliberate administrator action in the UI.
