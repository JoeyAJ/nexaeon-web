import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

test('Engineer runs independently with classifications, structured plan, sources, refresh, and locales', async ({ page }) => {
  const requests = [];
  await page.route('**/api/agent/engineer/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, mode: 'ai', answer: 'Verified: the public Demo uses React. [S1]',
      citations: [{ sourceId: 'S1', title: 'AI Tutor Demo', summary: 'A public prototype.', typeLabel: 'AI Tutor', moduleLabel: 'Prototype Lab', sourceRoute: '/projects/module-demos', sourceUrl: 'https://demo.example.com' }],
      suggestedQuestions: ['Create the next sprint.'], partialSources: false, agentId: 'engineer', supportingAgentId: null,
      executedTools: ['searchPrototypeItems'],
      factClassification: {
        verified: [{ text: 'AI Tutor Demo — React', sourceIds: ['demo-ai-tutor'] }], inferred: [],
        recommended: [{ text: 'Run tests before implementation claims.', sourceIds: [] }],
        unknown: [{ text: 'Repository state is unknown.', sourceIds: [] }],
      },
      developmentPlan: {
        objective: 'Create an MVP sprint', scope: [{ sourceId: 'demo-ai-tutor', title: 'AI Tutor Demo' }], requirements: [],
        tasks: [{ id: 'task-1', title: 'Define architecture', status: 'planned' }], dependencies: [],
        risks: [{ text: 'Repository not inspected', verificationStatus: 'unverified' }],
        tests: [{ title: 'Unit tests', status: 'planned' }], acceptanceCriteria: [{ text: 'Sources traceable', status: 'planned' }],
        sourceIds: ['demo-ai-tutor'], verificationStatus: 'unverified',
      },
    }) });
  });

  await page.goto('/projects/nexaeon-engineer');
  await page.reload();
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByTestId('engineer-agent-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'NexAeon Engineer', level: 1 })).toBeVisible();
  const input = page.locator('#engineer-agent-query');
  await input.fill('Create an MVP sprint plan');
  await page.getByRole('button', { name: 'Submit' }).dblclick();
  await expect(page.getByText('Engineer is analyzing public data with the Prototype tools and preparing a technical plan…')).toBeVisible();
  await expect(page.locator('.agent-message-assistant').last()).toContainText('Verified');
  await expect(page.getByTestId('engineer-fact-classification')).toContainText('Recommended');
  await expect(page.getByTestId('engineer-fact-classification')).toContainText('Unknown');
  await expect(page.getByTestId('engineer-development-plan')).toContainText('planned');
  await expect(page.getByTestId('engineer-development-plan')).toContainText('unverified');
  await expect(page.locator('.agent-result-card').filter({ hasText: 'AI Tutor Demo' })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toEqual({ message: 'Create an MVP sprint plan', locale: 'en', history: [] });
  await page.getByRole('button', { name: 'Clear chat' }).click();
  await expect(page.locator('.agent-message')).toHaveCount(0);
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.getByText('분석하거나 계획할 프로토타입 및 기술 요구를 입력하세요')).toBeVisible();
});

test('Engineer supports cancel, empty result, and tool error without fabricated output', async ({ page }) => {
  let mode = 'pending';
  await page.route('**/api/agent/engineer/chat', async (route) => {
    if (mode === 'pending') { await new Promise((resolve) => setTimeout(resolve, 10_000)); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, mode: 'sources_only', answer: '', reason: mode, citations: [], suggestedQuestions: [], partialSources: false,
      agentId: 'engineer', executedTools: [], factClassification: { verified: [], inferred: [], recommended: [], unknown: [] }, developmentPlan: null,
    }) });
  });
  await page.goto('/projects/nexaeon-engineer');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  const input = page.locator('#engineer-agent-query');
  await input.fill('Cancel this request');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Engineer is analyzing public data with the Prototype tools and preparing a technical plan…')).toBeHidden();
  await expect(page.locator('.agent-message-assistant')).toHaveCount(0);

  mode = 'no_sources';
  await input.fill('No matching prototype');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('The currently public Prototype Lab data does not contain enough information to answer this request.')).toBeVisible();
  mode = 'tool_unavailable';
  await input.fill('Retry tools');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Engineer’s Prototype tools cannot read the public data right now. Please try again later.')).toBeVisible();
});
