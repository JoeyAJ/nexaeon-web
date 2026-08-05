import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

test('protected admin audit route supports login, server records, filters, and tri-language UI', async ({ page }) => {
  let authenticated = false;
  const auditQueries = [];
  await page.route('**/api/admin/session', async (route) => {
    if (route.request().method() === 'POST') authenticated = true;
    await route.fulfill(authenticated
      ? { status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: true, actorId: 'e2e-admin', role: 'admin', csrfToken: 'csrf-e2e', expiresAt: '2026-08-01T01:15:00.000Z' }) }
      : { status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, errorCode: 'AUTH_REQUIRED' }) });
  });
  await page.route('**/api/admin/audit**', async (route) => {
    auditQueries.push(new URL(route.request().url()).searchParams);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, count: 1, records: [{ auditId: 'audit-1', auditRecordId: 'rec-audit-1', operationId: 'operation-1', idempotencyKey: 'idem-1', timestamp: '2026-08-01T00:00:00.000Z', actorId: 'e2e-admin', actorRole: 'admin', agentId: 'xchange', toolId: 'createCourseDraft', targetDataSource: 'notion-teaching-materials', executionStatus: 'succeeded', confirmationStatus: 'confirmed', externalRecordId: 'rec-action', errorCode: null, duration: 42, schemaVersion: 'v1', recordType: 'formal', actorSessionHash: 'must-not-render', requesterFingerprint: 'must-not-render', sanitizedInput: { title: 'must-not-render' }, sanitizedOutput: { modelGeneration: { mode: 'shadow', requestedProvider: 'openai', actualProvider: 'mock', model: 'fake-model', apiKey: 'must-not-render' }, shadowComparison: { shadowExecuted: true, provider: 'openai', model: 'fake-model', comparisonStatus: 'completed', schemaPassed: true, qualityPassed: false, latencyMs: 24054, tokenUsage: { inputTokens: 2284, outputTokens: 3329, totalTokens: 5613 }, fallbackUsed: false, schemaValidationStatus: 'passed', qualityValidationStatus: 'failed', qualityDiagnostic: { status: 'failed', failedChecks: ['ai_risk_coverage'], qualityReasons: ['At least four AI risk categories are required.'], failedPaths: ['risksAndNotes'] }, candidate: 'must-not-render' }, contentPreview: 'must-not-render', writesPerformed: 0 } }] }) });
  });
  await page.goto('/admin/audit');
  await expect(page.getByTestId('admin-audit-page')).toBeVisible();
  await expect(page.getByText('需要管理員授權', { exact: false })).toHaveCount(0);
  await page.getByLabel('管理員 ID').fill('e2e-admin');
  await page.getByLabel('存取碼').fill('secret');
  await page.getByRole('button', { name: '驗證管理員' }).click();
  await expect(page.getByText('operation-1')).toBeVisible();
  await expect(page.getByRole('heading', { name: '模型與 Shadow 診斷' })).not.toBeVisible();
  await page.getByText('查看模型詳細').click();
  await expect(page.getByRole('heading', { name: '模型與 Shadow 診斷' })).toBeVisible();
  await expect(page.getByTestId('model-audit-details')).toContainText('ai_risk_coverage');
  await expect(page.getByTestId('model-audit-details')).toContainText('5613');
  await expect(page.getByText('must-not-render')).toHaveCount(0);
  await page.getByLabel('狀態').selectOption('succeeded');
  await page.getByLabel('Schema 類型').selectOption('formal');
  await page.getByLabel('Operation ID').fill('operation-1');
  await page.getByLabel('外部紀錄 ID').fill('rec-action');
  await page.getByRole('button', { name: '重新整理' }).click();
  await expect(page.getByText('rec-action')).toBeVisible();
  expect(auditQueries.at(-1).get('recordType')).toBe('formal'); expect(auditQueries.at(-1).get('operationId')).toBe('operation-1'); expect(auditQueries.at(-1).get('externalRecordId')).toBe('rec-action');
  await page.getByLabel('Language').selectOption('ko');
  await expect(page.getByRole('heading', { name: '관리자 감사 로그' })).toBeVisible();
  await expect(page.getByText('모델 세부정보 보기')).toBeVisible();
  await page.getByLabel('Language').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Admin audit log' })).toBeVisible();
  await expect(page.getByText('View model details')).toBeVisible();
});

test('admin migration UI requires dry-run and confirmation, checks consistency, and repairs only one verified issue', async ({ page }) => {
  let migrationExecuteCount = 0;
  await page.route('**/api/admin/session', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: true, actorId: 'e2e-admin', role: 'admin', csrfToken: 'csrf-e2e', expiresAt: '2026-08-01T01:15:00.000Z' }) }));
  await page.route('**/api/admin/audit**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, count: 0, records: [] }) }));
  await page.route('**/api/admin/migration/preflight', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, preflight: { ok: false, writesPerformed: 0, issues: [{ code: 'DATA_SOURCE_FIELD_TYPE_INVALID', tableRole: 'audit', fieldName: 'Tool ID' }] }, partialWrites: { remainingLegacyAuditCount: 1, remainingLegacyDraftCount: 1, persistedMigrationBatchIds: [] } }) }));
  await page.route('**/api/admin/migration/preview', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ migrationBatchId: 'migration-e2e', recordsToCreate: ['legacy-audit-1'], recordsToUpdate: ['legacy-draft-1'], recordsToSkip: ['legacy-audit-done'], invalidRecordCount: 0, estimatedWrites: 4, warnings: [{ recordId: 'legacy-draft-1', code: 'MISSING_AUDIT_LINK' }], expiresAt: '2026-08-01T01:05:00.000Z', payloadHash: 'hash-e2e', confirmationToken: 'token-e2e' }) }));
  await page.route('**/api/admin/migration/execute', (route) => { migrationExecuteCount += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ migrationBatchId: 'migration-e2e', succeededCount: 2, skippedCount: 1, failedCount: 0, executionStatus: 'succeeded' }) }); });
  const issue = { category: 'action-missing-audit', actionRecordId: 'rec-action', auditRecordId: null, operationId: 'op-1', repairable: true, safe: true, candidateAuditRecordId: 'rec-audit', candidateAuditRecordIds: ['rec-audit'], candidateCount: 1, candidateBasis: 'external-record-id', candidateMatches: [{ auditRecordId: 'rec-audit', matchScore: 194, evidence: [{ field: 'External Record ID', match: 'exact' }, { field: 'Idempotency Key', match: 'exact' }] }], recommendedAction: 'preview-unique-link-repair', actionDetails: { recordId: 'rec-action', createdBy: 'admin', sourceToolId: 'createActionDraft' } };
  const mismatch = { category: 'link-mismatch', actionRecordId: 'rec-linked-action', auditRecordId: 'rec-current', operationId: 'op-2', currentAuditRecordId: 'rec-current', expectedAuditRecordId: 'rec-expected', repairable: false, safe: false };
  const duplicate = { category: 'duplicate', reason: 'duplicate-audit-id', duplicateBasis: 'audit-id', auditId: 'audit-duplicate', auditRecordIds: ['rec-duplicate-a', 'rec-duplicate-b'], repairable: false };
  await page.route('**/api/admin/consistency', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, actionCount: 2, auditCount: 3, counts: { 'action-missing-audit': 1, 'link-mismatch': 1, duplicate: 1 }, results: [issue, mismatch, duplicate] }) }));
  await page.route('**/api/admin/repair/preview', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ safe: true, reason: 'unique-external-record-id', operationId: 'op-1', actionRecordId: 'rec-action', auditRecordId: 'rec-audit', before: { action: { recordId: 'rec-action', auditRecordId: null } }, after: { action: { recordId: 'rec-action', auditRecordId: 'rec-audit' } }, updates: [{ target: 'action', recordId: 'rec-action', fields: { 'Audit Record ID': 'rec-audit' } }], payloadHash: 'repair-hash', confirmationToken: 'repair-token', expiresAt: '2026-08-01T01:05:00.000Z' }) }));
  await page.route('**/api/admin/repair/execute', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, executionStatus: 'succeeded' }) }));

  await page.goto('/admin/audit');
  await expect(page.getByTestId('admin-migration-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Schema Preflight／Partial Write 檢查' }).click();
  await expect(page.getByTestId('migration-safety-report')).toContainText('DATA_SOURCE_FIELD_TYPE_INVALID');
  expect(migrationExecuteCount).toBe(0);
  await page.getByRole('button', { name: '產生 Migration Dry Run' }).click();
  await expect(page.getByTestId('migration-dry-run')).toContainText('migration-e2e');
  await expect(page.getByRole('button', { name: '執行已確認 Migration' })).toBeDisabled();
  expect(migrationExecuteCount).toBe(0);
  await page.getByLabel('我確認依此 dry-run 執行，且原始資料不會刪除').check();
  await page.getByRole('button', { name: '執行已確認 Migration' }).click();
  await expect(page.getByText('"succeededCount": 2')).toBeVisible(); expect(migrationExecuteCount).toBe(1);

  await page.getByRole('button', { name: '檢查 Action／Audit 一致性' }).click();
  await expect(page.getByTestId('consistency-summary')).toContainText('Action 總數2');
  await expect(page.getByTestId('consistency-summary')).toContainText('Audit 總數3');
  await expect(page.locator('.admin-consistency-list').getByText('action-missing-audit', { exact: true })).toBeVisible();
  await expect(page.locator('.admin-consistency-list article').filter({ hasText: 'action-missing-audit' })).toContainText('候選 Audit: rec-audit');
  await expect(page.locator('.admin-consistency-list article').filter({ hasText: 'action-missing-audit' })).toContainText('候選數量: 1 / 安全修復: true');
  await expect(page.locator('.admin-consistency-list article').filter({ hasText: 'action-missing-audit' })).toContainText('匹配分數: 194');
  await expect(page.locator('.admin-consistency-list article').filter({ hasText: 'action-missing-audit' })).toContainText('建議操作: preview-unique-link-repair');
  await expect(page.locator('.admin-consistency-list article').filter({ hasText: 'link-mismatch' })).toContainText('目前關聯: rec-current / 預期關聯: rec-expected');
  await expect(page.locator('.admin-consistency-list article').filter({ hasText: 'duplicate' })).toContainText('rec-duplicate-a, rec-duplicate-b');
  await expect(page.locator('.admin-consistency-list article').filter({ hasText: 'duplicate' })).toContainText('判定依據: audit-id');
  await expect(page.getByRole('button', { name: '預覽安全修復' })).toHaveCount(1);
  await page.getByRole('button', { name: '預覽安全修復' }).click();
  await expect(page.getByTestId('repair-preview')).toContainText('修復前');
  await expect(page.getByTestId('repair-preview')).toContainText('修復後');
  await page.getByRole('button', { name: '確認修復 ID 關聯' }).click();
  await expect(page.locator('.admin-consistency-list').getByText('action-missing-audit', { exact: true })).toBeVisible();
});
