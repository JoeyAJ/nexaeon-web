# Nexōn Agent Foundation

Stage 5-1A 建立 Nexōn AI Assistant 的公開知識檢索基礎。這一階段只做 deterministic retrieval 與 source grounding，不接入 OpenAI、Claude、Gemini 或其他模型，也不生成自由回答。

## Agent 定位

Nexōn 在本階段是 NexAeon 公開知識的檢索介面。它協助使用者從網站已公開的內容中找到相關來源，並顯示可追溯的來源卡片。

它不是聊天機器人、不是自動化 Agent，也不具備寫入後台資料的能力。

## 七個公開來源

Nexōn 只能讀取以下已經過公開資料過濾的 API：

- `/api/identity/profiles`
- `/api/research/literature`
- `/api/teaching/courses`
- `/api/knowledge/resources`
- `/api/modules/demos`
- `/api/action/projects`
- `/api/collaboration/options`

Agent 不直接讀取 Notion、Airtable、GitHub 或任何私有資料源。

## Knowledge Document Schema

七個來源會被轉換成一致格式：

```js
{
  id,
  sourceId,
  moduleKey,
  itemType,
  title,
  summary,
  content,
  tags,
  status,
  sourceUrl,
  sourceRoute,
  updatedAt,
  searchableText
}
```

轉換層只保留檢索需要的公開資訊，不保留 raw API item。`Notes`、`Visibility`、`Owner`、`Blockers`、`Email`、record id、Base ID、Table ID、API Key 都不得進入 Knowledge Document。

## Retrieval 排序原則

檢索使用純函式 deterministic ranking：

- Title 命中權重最高
- Tags 次之
- Summary 再次之
- Content 最低
- 完整片語命中高於零散 token
- `updatedAt` 只作為同分時的輕微排序依據
- 空查詢不回傳結果
- 查詢長度上限為 300 字元
- 不使用 RegExp injection，不執行 HTML 或 JavaScript

本階段不使用 embedding、不使用向量資料庫、不使用 RAG generation。

## 三語原則

介面支援繁體中文、韓文、英文，一次只顯示目前選擇的語言。

資料層不自動翻譯內容。若來源提供 `summaryZh`、`summaryKo`、`summaryEn` 或 `translations`，只把目前語言內容放進該語言索引。品牌名、技術名、論文名可保留原文。

## 隱私與安全邊界

本階段保證：

- 不使用任何 AI API Key
- 不新增模型服務環境變數
- 不向第三方發送查詢
- 不記錄使用者查詢
- 不保存聊天紀錄
- 不建立使用者帳號
- 不執行寫入操作
- 不修改 Notion
- 不修改 Airtable
- 不顯示內部錯誤或 stack trace
- 不使用 `dangerouslySetInnerHTML`
- 不允許查詢控制 router、URL、tool 或 action

## Stage 5-1B

Stage 5-1B 才會評估模型生成與引用回答。屆時仍應沿用本階段的 Source Registry、Knowledge Document schema、公開資料過濾與來源引用規則。

## 新增公開來源的方法

未來若要新增公開來源：

1. 先建立安全的公開 API，完成公開資料過濾。
2. 將來源加入 `lib/agent/sourceRegistry.js`。
3. 在 `lib/agent/knowledgeDocuments.js` 新增明確 adapter。
4. 補 unit tests，確認內部欄位不進入 Knowledge Document。
5. 補 e2e tests，確認來源卡片與檢索結果正常。
