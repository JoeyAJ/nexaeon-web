import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

test('Orchestrator runs independently with classifications, proposed plan, sources, refresh, and locales', async ({ page }) => {
  const requests = [];
  let previewCount = 0;
  let executeCount = 0;
  let cancelCount = 0;
  await page.route('**/api/admin/session', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: true, actorId: 'e2e-admin', role: 'admin', csrfToken: 'csrf-e2e', expiresAt: '2026-08-01T01:15:00.000Z' }) });
  });
  await page.route('**/api/agent/orchestrator/actions/preview', async (route) => {
    previewCount += 1;
    const operationId = `operation-${previewCount}`;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      operationId, agentId: 'orchestrator', toolId: 'createActionDraft', permissionLevel: 'WRITE_CONFIRM',
      targetDataSource: 'airtable-action-projects', actionType: 'create', payload: route.request().postDataJSON().payload,
      fieldsToWrite: { 'Project Name': '[Draft idempotency] Coordinate public work', 'Public Summary': 'Draft plan\n\n[NexAeon draft idempotency:test]' },
      warnings: [], expiresAt: '2026-08-01T01:05:00.000Z', confirmationRequired: true,
      previewHash: 'preview-hash', idempotencyKey: `idempotency-${previewCount}`, executionStatus: 'previewed',
      auditRecordId: `rec-audit-${previewCount}`, auditPersistenceStatus: 'airtable-dedicated', rollbackSupport: false, confirmationToken: `confirmation-${previewCount}`,
    }) });
  });
  await page.route('**/api/agent/orchestrator/actions/cancel', async (route) => {
    cancelCount += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, operationId: route.request().postDataJSON().operationId, executionStatus: 'cancelled' }) });
  });
  await page.route('**/api/agent/orchestrator/actions/execute', async (route) => {
    executeCount += 1;
    const body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, operationId: body.operationId, executionStatus: 'succeeded', targetDataSource: body.targetDataSource, externalRecordId: 'rec-action-draft-real', idempotencyKey: body.idempotencyKey, replayed: false, actionWriteStatus: 'succeeded', auditRecordId: body.auditRecordId, auditPersistenceStatus: 'airtable-dedicated' }) });
  });
  await page.route('**/api/agent/orchestrator/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, mode: 'ai', answer: 'Verified: the public action is planned. Cross-module work is proposed only. [S1]',
      citations: [{ sourceId: 'S1', title: 'Public action', summary: 'Public Action Center item.', typeLabel: 'Research', moduleLabel: 'Action Center', sourceRoute: '/field-lab', sourceUrl: '' }],
      suggestedQuestions: ['Review blockers.'], partialSources: false, agentId: 'orchestrator', supportingAgentId: null,
      executedTools: ['buildExecutionPlan'],
      factClassification: {
        verified: [{ text: 'Public action — Planned', sourceIds: ['action-public'] }], inferred: [{ text: 'Priority order is proposed.', sourceIds: ['action-public'] }],
        recommended: [{ text: 'Confirm owner before execution.', sourceIds: [] }], unknown: [{ text: 'Owner is unknown.', sourceIds: [] }],
      },
      executionPlan: {
        objective: 'Coordinate public work', currentState: [{ text: 'Public action — Planned', verificationStatus: 'verified' }],
        tasks: [{ id: 'proposed-1', title: 'Review scope', status: 'proposed', priority: 'High' }], priority: [{ title: 'Public action', priority: 'High', status: 'proposed' }],
        dependencies: [], blockers: [], milestones: [{ title: 'Human confirms owner and date', status: 'proposed' }], risks: [{ text: 'Owner missing', verificationStatus: 'unverified' }],
        acceptanceCriteria: [{ text: 'Sources traceable', status: 'planned' }], nextActions: [{ text: 'Review proposed plan', status: 'proposed' }],
        crossModulePlan: [{ module: 'Research', title: 'Review scope', status: 'proposed' }], sourceIds: ['action-public'], verificationStatus: 'unverified',
      },
    }) });
  });

  await page.goto('/field-lab/nexaeon-orchestrator');
  await page.reload();
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByTestId('orchestrator-agent-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'NexAeon Orchestrator', level: 1 })).toBeVisible();
  const input = page.locator('#orchestrator-agent-query');
  await input.fill('Create a cross-module proposed execution plan');
  await page.getByRole('button', { name: 'Submit' }).dblclick();
  await expect(page.getByText('Orchestrator is using the Action tools to organize public tasks and an execution plan…')).toBeVisible();
  await expect(page.locator('.agent-message-assistant').last()).toContainText('proposed');
  await expect(page.getByTestId('orchestrator-fact-classification')).toContainText('Recommended');
  await expect(page.getByTestId('orchestrator-fact-classification')).toContainText('Unknown');
  await expect(page.getByTestId('orchestrator-execution-plan')).toContainText('Cross-module proposed plan');
  await expect(page.getByTestId('orchestrator-execution-plan')).toContainText('unverified');
  await page.getByRole('button', { name: 'Create task draft' }).click();
  await expect(page.getByTestId('orchestrator-action-preview')).toContainText('Draft');
  await page.getByRole('button', { name: 'Cancel without creating draft' }).click();
  await expect(page.getByText('Cancelled. No draft was created.')).toBeVisible();
  expect(cancelCount).toBe(1); expect(executeCount).toBe(0);
  await page.getByRole('button', { name: 'Create task draft' }).click();
  await page.getByRole('button', { name: 'Confirm action draft creation' }).dblclick();
  await expect(page.getByTestId('orchestrator-action-success')).toContainText('rec-action-draft-real');
  expect(executeCount).toBe(1);
  await expect(page.locator('.agent-result-card').filter({ hasText: 'Public action' })).toBeVisible();
  expect(requests).toHaveLength(1); expect(requests[0]).toEqual({ message: 'Create a cross-module proposed execution plan', locale: 'en', history: [] });
  await page.getByRole('button', { name: 'Clear chat' }).click(); await expect(page.locator('.agent-message')).toHaveCount(0);
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.getByText('정리, 우선순위 지정 또는 계획할 목표와 행동 요구를 입력하세요')).toBeVisible();
});

test('Orchestrator supports cancel, empty result, and tool error without fabricated execution', async ({ page }) => {
  let mode = 'pending';
  await page.route('**/api/agent/orchestrator/chat', async (route) => {
    if (mode === 'pending') { await new Promise((resolve) => setTimeout(resolve, 10_000)); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, mode: 'sources_only', answer: '', reason: mode, citations: [], suggestedQuestions: [], partialSources: false,
      agentId: 'orchestrator', executedTools: [], factClassification: { verified: [], inferred: [], recommended: [], unknown: [] }, executionPlan: null,
    }) });
  });
  await page.goto('/field-lab/nexaeon-orchestrator'); await page.getByRole('button', { name: 'Switch to English' }).click();
  const input = page.locator('#orchestrator-agent-query'); await input.fill('Cancel this request'); await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Orchestrator is using the Action tools to organize public tasks and an execution plan…')).toBeHidden();
  await expect(page.locator('.agent-message-assistant')).toHaveCount(0);
  mode = 'no_sources'; await input.fill('No matching action'); await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('The currently public Action Center data does not contain enough information to answer this request.')).toBeVisible();
  mode = 'tool_unavailable'; await input.fill('Retry tools'); await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Orchestrator’s Action tools cannot read public data right now. Please try again later.')).toBeVisible();
});
