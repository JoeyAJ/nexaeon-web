# NexAeon Navigator Production Runbook

## 運行模式

正常 AI 模式：

```text
NEXAEON_AGENT_ENABLED=true
NEXAEON_AGENT_FORCE_SOURCES_ONLY=false
```

緊急 Sources-only：

```text
NEXAEON_AGENT_FORCE_SOURCES_ONLY=true
```

完全停用：

```text
NEXAEON_AGENT_ENABLED=false
```

必要 Environment Variables：

```text
OPENAI_API_KEY
OPENAI_MODEL
NEXAEON_AGENT_ENABLED
NEXAEON_AGENT_FORCE_SOURCES_ONLY
NEXAEON_AGENT_MAX_OUTPUT_TOKENS
NEXAEON_AGENT_TIMEOUT_MS
```

`OPENAI_MODEL` 未設定時，server 使用固定預設版本 `gpt-5.4-mini-2026-03-17`。不要改回不可存取的 alias `gpt-5.4-mini`。Client request 不能覆蓋模型，Health API 與前端不公開完整模型版本。

`NEXAEON_AGENT_MAX_OUTPUT_TOKENS` 的程式上限是 800，允許範圍是 200 到 800。`NEXAEON_AGENT_TIMEOUT_MS` 的程式上限是 25000，允許範圍是 10000 到 25000。

## 健康檢查

使用：

```text
GET /api/agent/health
HEAD /api/agent/health
```

Health API 不呼叫 OpenAI、Moderation、Airtable、Notion 或七個公開 API，只檢查 runtime、production config、source registry 與 Navigator brand registry 是否可載入。

## 安全日誌

在 Vercel Functions Logs 查看 Navigator 事件。日誌只記錄 metadata：

- requestId
- category
- mode
- statusCode
- durationMs
- retrievedSourceCount
- failedSourceCount
- inputTokens
- outputTokens
- totalTokens
- model
- timestamp

日誌不保存 query、answer、conversation history、source content、source excerpt、API key、Authorization header、Cookie、完整 IP、完整 User Agent、OpenAI 原始錯誤 body、Airtable token、Notion token、system prompt 或 developer instruction。

排查單次請求時，先在前端或 response header 找 `X-NexAeon-Request-ID`，再用該 requestId 搜尋 Vercel Functions Logs。

## 常見事故處理

OpenAI timeout：

1. 檢查 log category `model_timeout`。
2. 確認 response 是否已降級為 sources-only。
3. 若 timeout 增加，先啟用緊急 Sources-only。

Moderation unavailable：

1. 檢查 `input_moderation_unavailable` 或 `output_moderation_unavailable`。
2. 系統會 fail closed，不顯示模型回答，保留安全來源卡片。

Public API partial failure：

1. 查看 `failedSourceCount`。
2. 確認七個公開 API 的 production verifier。
3. 若全部來源失敗，Navigator 只能回 no_sources / source unavailable。

429 increased：

1. 檢查是否為短時間重複提問。
2. 前端會顯示等待秒數並暫停送出。
3. 若仍過高，啟用 Vercel WAF rate limit 的 429 action。

Token usage abnormal：

1. 查看 inputTokens、outputTokens、totalTokens。
2. 確認 `NEXAEON_AGENT_MAX_OUTPUT_TOKENS` 不高於 800。
3. 必要時啟用緊急 Sources-only。

Model output invalid / citation validation failed：

1. 檢查 `model_output_invalid` 或 `citation_validation_failed`。
2. 系統不得重試模型。
3. Demo catalog query 會顯示 deterministic sources-only list。

Suggested Questions invalid：

1. Server 會過濾不安全、重複、空白、跨語言或與來源無關的 suggested questions。
2. 不重新呼叫模型。
3. 使用 deterministic fallback，且不允許 Web Search、Email、Calendar、Files、Notion/Airtable 私有資料或寫入承諾。

Partial source failure：

1. 若至少一個公開 API 失敗但仍有可用來源，API 回 `partialSources: true`。
2. 前端顯示簡短三語提示。
3. Log 只看 `failedSourceCount`，不記錄來源內容或 raw upstream error。

No source vs all sources unavailable：

1. `no_sources` 表示公開資料中找不到足夠相關內容。
2. `sources_unavailable` 表示七個公開來源暫時都不可讀。
3. 兩者都不應觸發 OpenAI 回答。

## 緊急處理順序

```text
1. 將 FORCE_SOURCES_ONLY 設為 true
2. Redeploy
3. 確認 Health mode = sources_only
4. 查看安全 Log category
5. 修復後再恢復 AI mode
```

## Vercel WAF 人工設定

Codex 不直接操作 Vercel Dashboard。請在 Vercel Firewall / WAF 中人工新增：

```text
Rule Name:
NexAeon Navigator Chat Rate Limit
```

條件：

```text
Request Path = /api/agent/chat
Request Method = POST
```

初始建議：

```text
Strategy: Fixed Window
Window: 60 seconds
Limit: 10 requests
Counting Key: IP
Action: Log
```

先使用 Log 模式觀察。確認正常後再改為：

```text
Action: Rate Limit / 429
```

注意：

- 不要將整個網站限流。
- 只限制 `/api/agent/chat` POST。
- Health API 不需要此規則。
- 七個公開 GET API 不要包含在這條規則。
- 不要在程式中假裝 WAF 已經設定完成。

Vercel WAF requires manual dashboard configuration.

## OpenAI 成本管理人工設定

Codex 不操作 OpenAI Dashboard。請人工確認：

1. OpenAI Project 使用獨立 Production Project。
2. 設定每月 Spend Limit。
3. 設定 Usage Notification Threshold。
4. 定期查看 Usage。
5. Production Key 不與測試環境共用。
6. 不將 API Key 貼進 GitHub、Issue 或 Log。

程式中的 token ceiling、timeout、forced sources-only 與 request guard 是應用層防線，不能取代 OpenAI Project Spend Limit。

OpenAI project spend limit requires manual configuration.

## Stage 5-2 驗收重點

- 三語核心問題應返回同一組核心公開模塊。
- Citation marker `[S#]` 必須和 citation card 一對一。
- `[S1]` 可鍵盤操作並平滑定位到 S1 citation card。
- Safe Markdown 可顯示粗體、斜體、列表與 inline code，但不執行 HTML。
- 手機版不可橫向溢出，input、送出、停止與清除按鈕不可重疊。
- IME 中文／韓文 composition 狀態下 Enter 不送出。
- 正常 AI request 仍維持 1 次 input moderation、1 次 Responses API、1 次 output moderation。
