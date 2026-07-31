import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

test('Explorer submits independently, blocks duplicates, preserves context, and shows sources', async ({ page }) => {
  const requests = [];
  await page.route('**/api/agent/explorer/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        mode: 'ai',
        answer: 'The public record uses UTAUT and SEM. [S1]',
        citations: [{
          sourceId: 'S1',
          title: 'UTAUT and AI learning adoption',
          summary: 'A public study of AI learning adoption.',
          typeLabel: 'Journal Article',
          moduleLabel: 'Research',
          sourceRoute: '/research/research-literature-database',
          sourceUrl: 'https://example.com/research',
        }],
        suggestedQuestions: ['Which variables were used?'],
        partialSources: false,
        agentId: 'explorer',
        supportingAgentId: null,
        executedTools: ['searchResearchItems'],
      }),
    });
  });

  await page.goto('/research/nexaeon-explorer');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByTestId('explorer-agent-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'NexAeon Explorer', level: 1 })).toBeVisible();

  const input = page.locator('#explorer-agent-query');
  await input.fill('Compare UTAUT methods');
  await page.getByRole('button', { name: 'Submit' }).dblclick();
  await expect(page.getByText('Explorer is searching public data with the Research tools…')).toBeVisible();
  await expect(page.locator('.agent-message-assistant').last()).toContainText('UTAUT and SEM');
  await expect(page.getByRole('button', { name: 'Jump to source S1' })).toBeVisible();
  await expect(page.locator('.agent-result-card').filter({ hasText: 'UTAUT and AI learning adoption' })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toEqual({
    message: 'Compare UTAUT methods',
    locale: 'en',
    history: [],
  });

  await input.fill('Which variables were used?');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].history).toEqual([
    { role: 'user', content: 'Compare UTAUT methods' },
    { role: 'assistant', content: 'The public record uses UTAUT and SEM. [S1]' },
  ]);
});

test('Explorer supports cancel, empty result, error, and localized Korean copy', async ({ page }) => {
  let mode = 'pending';
  await page.route('**/api/agent/explorer/chat', async (route) => {
    if (mode === 'pending') {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        mode: 'sources_only',
        answer: '',
        reason: mode,
        citations: [],
        suggestedQuestions: [],
        partialSources: false,
        agentId: 'explorer',
        executedTools: [],
      }),
    });
  });

  await page.goto('/research/nexaeon-explorer');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  const input = page.locator('#explorer-agent-query');
  await input.fill('Cancel this request');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Explorer is searching public data with the Research tools…')).toBeHidden();
  await expect(page.locator('.agent-message-assistant')).toHaveCount(0);

  mode = 'no_sources';
  await input.fill('No matching records');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('The currently public Research data does not contain enough information to answer this question.')).toBeVisible();

  mode = 'tool_unavailable';
  await input.fill('Retry tools');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Explorer’s Research tools cannot read the public data right now. Please try again later.')).toBeVisible();

  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.getByText('Explorer는 현재 공개된 Research 데이터만 사용하며 Draft, Hidden 또는 비공개 콘텐츠를 읽지 않습니다.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '보내기' })).toBeVisible();
});
