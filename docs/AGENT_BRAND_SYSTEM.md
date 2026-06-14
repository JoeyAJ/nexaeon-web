# NexAeon Agent Brand System

## 品牌規則

NexAeon 是唯一主品牌。舊的 macron 拼法、全大寫拼法與 plain Nexon assistant 系列名稱已停止作為對外品牌使用。

目前公開知識 Agent 的正式名稱是 NexAeon Navigator。

三語功能副標題：

- 繁中：公開知識導航 Agent
- 韓文：공개 지식 탐색 에이전트
- 英文：Public Knowledge Navigator

聊天回答者標籤統一為 `NAVIGATOR`。

## 正式 Agent 系列

七個正式 Agent 名稱依序形成 NEXAEON 首字母結構：

- NexAeon Navigator：Public Knowledge Navigator／公開知識導航 Agent
- NexAeon Explorer：Research Exploration Agent／研究探索 Agent
- NexAeon Xchange：Learning Coaching Agent／學習教練 Agent
- NexAeon Archivist：Knowledge Curation Agent／知識整理與典藏 Agent
- NexAeon Engineer：Prototype Builder Agent／Demo／MVP 原型建造 Agent
- NexAeon Orchestrator：Action Coordination Agent／任務與行動協調 Agent
- NexAeon Networker：Collaboration Connector Agent／合作與資源連接 Agent

英文品牌行動鏈：

```text
Navigate knowledge. Explore research. Xchange learning. Archive insight. Engineer prototypes. Orchestrate action. Network the future.
```

繁中：

```text
導航知識，探索研究，共學成長，典藏洞見，打造原型，協同行動，連結未來。
```

韓文：

```text
지식을 안내하고, 연구를 탐색하며, 배움을 나누고, 통찰을 축적하고, 프로토타입을 설계하며, 행동을 조율하고, 미래를 연결합니다.
```

## 路由與遷移

正式新路由：

```text
/identity/nexaeon-navigator
```

舊路由 `/identity/nexon-ai-assistant`、`/identity/nexon-assistant`、`/identity/nexon` 只作兼容，前端以 replace 行為自動導向正式路由，避免返回時再次進入舊路由。不建立兩套 Assistant 頁面。

## Feature Flag

正式環境變數：

```text
NEXAEON_AGENT_ENABLED=false
```

舊變數 `NEXON_AGENT_ENABLED` 僅暫時兼容既有 Vercel Production 設定，不再作為正式設定。`OPENAI_API_KEY` 與 `OPENAI_MODEL` 不因本次品牌遷移改名。

## 階段範圍

本階段只實作 NexAeon Navigator 頁面與公開 Demo 檢索 hotfix。其他六個 Agent 僅記錄於品牌設定與文件，沒有建立新頁面、Agent action、寫入能力或其他 Stage 5-1C 功能。
