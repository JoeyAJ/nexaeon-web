import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

test('Archivist runs independently with sources, clear, direct refresh, and localized UI', async ({ page }) => {
  const requests = [];
  await page.route('**/api/agent/archivist/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    await new Promise((resolve) => setTimeout(resolve, 120));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, mode: 'ai', answer: 'The public notes connect AI Tutor and personalization. [S1]',
      citations: [{ sourceId: 'S1', title: 'AI Tutor Note', summary: 'A public knowledge note.', typeLabel: 'Research note', moduleLabel: 'Knowledge Lab', sourceRoute: '/knowledge-lab/knowledge-resources', sourceUrl: 'https://example.com/note' }],
      suggestedQuestions: ['Create a concept map.'], partialSources: false, agentId: 'archivist', supportingAgentId: null,
      executedTools: ['searchKnowledgeItems'], conceptMap: { nodes: [{ id: 'note', label: 'AI Tutor Note' }], relationships: [], sourceIds: ['note'] },
    }) });
  });

  await page.goto('/knowledge-lab/nexaeon-archivist');
  await page.reload();
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByTestId('archivist-agent-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'NexAeon Archivist', level: 1 })).toBeVisible();
  const input = page.locator('#archivist-agent-query');
  await input.fill('Map AI Tutor knowledge');
  await page.getByRole('button', { name: 'Submit' }).dblclick();
  await expect(page.getByText('Archivist is searching and organizing public data with the Knowledge tools…')).toBeVisible();
  await expect(page.locator('.agent-message-assistant').last()).toContainText('personalization');
  await expect(page.getByRole('button', { name: 'Jump to source S1' })).toBeVisible();
  await expect(page.locator('.agent-result-card').filter({ hasText: 'AI Tutor Note' })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toEqual({ message: 'Map AI Tutor knowledge', locale: 'en', history: [] });
  await page.getByRole('button', { name: 'Clear chat' }).click();
  await expect(page.locator('.agent-message')).toHaveCount(0);
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.getByText('정리하거나 탐색할 지식 질문을 입력하세요')).toBeVisible();
});

test('Archivist supports cancel, empty result, and tool error states', async ({ page }) => {
  let mode = 'pending';
  await page.route('**/api/agent/archivist/chat', async (route) => {
    if (mode === 'pending') { await new Promise((resolve) => setTimeout(resolve, 10_000)); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, mode: 'sources_only', answer: '', reason: mode, citations: [], suggestedQuestions: [], partialSources: false,
      agentId: 'archivist', executedTools: [], conceptMap: { nodes: [], relationships: [], sourceIds: [] },
    }) });
  });
  await page.goto('/knowledge-lab/nexaeon-archivist');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  const input = page.locator('#archivist-agent-query');
  await input.fill('Cancel this request');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Archivist is searching and organizing public data with the Knowledge tools…')).toBeHidden();
  await expect(page.locator('.agent-message-assistant')).toHaveCount(0);

  mode = 'no_sources';
  await input.fill('No matching knowledge');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('The currently public Knowledge Lab data does not contain enough information to answer this request.')).toBeVisible();
  mode = 'tool_unavailable';
  await input.fill('Retry tools');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Archivist’s Knowledge tools cannot read the public data right now. Please try again later.')).toBeVisible();
});
