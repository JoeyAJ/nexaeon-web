# Stage 5-3E-A — Xchange Write Contract and Preview Schema

## Production source

- Platform: Notion
- Database: `NexAeon｜教學素材庫`
- Environment key: `NOTION_TEACHING_DATABASE_ID`
- Public read route: `GET /api/teaching/courses`
- Preview route: `POST /api/agent/xchange/actions/preview`
- Runtime target identifier: `notion-teaching-materials`

The Preview runtime never sends a Notion create/update/delete request. The database ID remains a server-only environment value and cannot be supplied by the client.

## Observed Learning Coaching schema

The Production read adapter recognizes the following Notion properties and types:

| Property | Type used by the adapter |
| --- | --- |
| 標題 | title |
| 教學分類 | select/status/text fallback |
| 形式 | multi_select/list fallback |
| 子主題 | rich_text/text fallback |
| 對象 | multi_select/list fallback |
| 可講時間(分) | number |
| 難度 | select/status/text fallback |
| 狀態 | select/status/text fallback |
| 語言 | multi_select/list fallback |
| 標籤 | multi_select/list fallback |
| 檔案連結 | url/files |
| 使用次數 | number |
| 參考文獻 | relation |
| 源靈感 | relation |
| 衍生內容 | relation |
| 建立日期 | created_time/date |
| 最後更新 | last_edited_time/date |
| 公開狀態 | published-visibility gate |

Production reads fail closed: only records with an explicitly published `公開狀態` are returned publicly.

## Contract v1

Server-owned fields are `requestId`, `operationId`, `idempotencyKey`, `requestedBy`, `createdAt`, `previewExpiresAt`, `permissionLevel=WRITE_CONFIRM`, `confirmationRequired=true`, `actionType=create`, `contractVersion=v1`, and `schemaVersion=v1`.

Supported tools:

- `createCourseDraft`
- `createLearningActivityDraft`

Course payload allowlist:

- `title`, `summary`, `teachingCategory`, `format`, `subTopic`, `targetAudience`, `durationMinutes`, `difficulty`, `language`, `tags`, `fileUrl`

Learning Activity payload allowlist:

- `activityTitle`, `activityType`, `instructions`, `targetAudience`, `estimatedTimeMinutes`, `difficulty`, `language`, `tags`, `materialsUrl`

Every normalized payload receives `draftStatus=Draft`, `visibility=Private`, `published=false`, and `createdViaAgent=xchange`. Unknown fields return `MASS_ASSIGNMENT_REJECTED`.

## Audit lifecycle

One formal `previewed` / `pending` row is appended to `NexAeon Tool Execution Audit`. The audit contains sanitized input/output, the stable preview hash, the actor session hash, and no token, cookie, secret, or arbitrary identifier. A retry with the same normalized payload, actor, tool, and target during the five-minute preview TTL reuses the existing operation and audit.

There is no Xchange execute route in Stage 5-3E-A. `estimatedWrites` is `1`, `writesPerformed` is always `0`, `canExecute` is `false`, and the UI exposes only a disabled “Coming in Stage 5-3E-B” control.
