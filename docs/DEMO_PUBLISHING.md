# NexAeon Demo Publishing Workflow

這份文件說明如何透過 Airtable `NexAeon Operations -> MVP Demos` 發布、更新、排序與下架 Demo。

修改 Airtable 內容後不需要重新執行 Codex，也不需要重新部署網站。網站會透過 `/api/modules/demos` 讀取最新公開資料，通常約 60 秒內反映更新。

只有改欄位結構、網站功能、站內 Demo 元件或 Runtime 行為時，才需要重新開發。

## 發布流程

1. 在 Airtable 新增或修改 Demo。
2. `Visibility` 先保持 `Internal`。
3. 填寫繁中、韓文、英文名稱與 Summary：
   - `Demo Name`
   - `Demo Name KO`
   - `Demo Name EN`
   - `Summary`
   - `Summary KO`
   - `Summary EN`
4. 設定 `Demo Type`、`Status`、`Slug`。
5. 設定 `Launch Mode`：
   - `External`
   - `Embedded`
   - `Internal`
6. `External` 或 `Embedded` 需要填寫合法的 HTTPS `Demo URL`。
7. `GitHub URL` 填程式碼倉庫；它會作為獨立的「查看程式碼」按鈕。
8. 可選：在本機執行 `npm run check:demos` 檢查發布狀態。
9. 確認資料完整後，將 `Visibility` 改為 `Public`。
10. 等待快取更新後刷新網站。
11. 下架時，將 `Visibility` 改回 `Internal` 或 `Private`。
12. 封存時，將 `Status` 改為 `Archived`。

## Showcase Ready

Demo 會出現在公開 Demo Showcase，必須符合：

- `Visibility = Public`
- `Status` 不是 `Archived`
- `Slug` 不為空，且格式符合 `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Public Demo 之間 `Slug` 不重複
- `Demo Type` 不為空
- `Status` 不為空
- 三語 Demo Name 都已填寫
- 三語 Summary 都已填寫

以下欄位缺少時不會阻擋 Showcase，但檢查工具會提示 warning：

- `Version`
- `Cover Image`
- `GitHub URL`
- `Research Link`

`Problem`、`Solution`、`Core Features`、`Next Step`、`Target Users`、`Tech Stack`、`Related Modules` 也不是 Showcase 的硬性阻擋欄位；前端會隱藏空內容或使用既有 placeholder。

## Launch Ready

Launch Ready 只控制是否顯示啟動按鈕，不影響 Demo 是否能在 Showcase 展示。

- `External`：需要合法 HTTPS `Demo URL`
- `Embedded`：需要合法 HTTPS `Demo URL`
- `Internal`：需要該 `Slug` 已登記在站內 `internalDemoRegistry`

如果 `Launch Mode` 空白或未知，但有合法 HTTPS `Demo URL`，網站會安全視為 `External`。

如果 Demo 尚未 Launch Ready，卡片仍可展示，但只會顯示「Demo 尚未開放操作」狀態，不會顯示內部 validation code。

## 下架與封存

- 暫時不公開：將 `Visibility` 改成 `Internal` 或 `Private`
- 永久封存：將 `Status` 改成 `Archived`
- `Archived` 即使 `Visibility = Public` 也不會出現在公開 API

網站不會自動修改 Airtable 的 `Visibility` 或 `Status`。
