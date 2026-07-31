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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, count: 1, records: [{ auditId: 'audit-1', auditRecordId: 'rec-audit-1', operationId: 'operation-1', idempotencyKey: 'idem-1', timestamp: '2026-08-01T00:00:00.000Z', actorId: 'e2e-admin', actorRole: 'admin', agentId: 'orchestrator', toolId: 'createActionDraft', targetDataSource: 'airtable-action-projects', executionStatus: 'succeeded', confirmationStatus: 'confirmed', externalRecordId: 'rec-action', errorCode: null, duration: 42, schemaVersion: 'v1', recordType: 'formal' }] }) });
  });
  await page.goto('/admin/audit');
  await expect(page.getByTestId('admin-audit-page')).toBeVisible();
  await expect(page.getByText('需要管理員授權', { exact: false })).toHaveCount(0);
  await page.getByLabel('管理員 ID').fill('e2e-admin');
  await page.getByLabel('存取碼').fill('secret');
  await page.getByRole('button', { name: '驗證管理員' }).click();
  await expect(page.getByText('operation-1')).toBeVisible();
  await page.getByLabel('狀態').selectOption('succeeded');
  await page.getByLabel('Schema 類型').selectOption('formal');
  await page.getByLabel('Operation ID').fill('operation-1');
  await page.getByLabel('外部紀錄 ID').fill('rec-action');
  await page.getByRole('button', { name: '重新整理' }).click();
  await expect(page.getByText('rec-action')).toBeVisible();
  expect(auditQueries.at(-1).get('recordType')).toBe('formal'); expect(auditQueries.at(-1).get('operationId')).toBe('operation-1'); expect(auditQueries.at(-1).get('externalRecordId')).toBe('rec-action');
  await page.getByLabel('Language').selectOption('ko');
  await expect(page.getByRole('heading', { name: '관리자 감사 로그' })).toBeVisible();
  await page.getByLabel('Language').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Admin audit log' })).toBeVisible();
});
