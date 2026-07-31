import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

test('Xchange runs independently with course-design context, sources, clear, and localized UI', async ({ page }) => {
  const requests = [];
  await page.route('**/api/agent/xchange/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    await new Promise((resolve) => setTimeout(resolve, 120));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        mode: 'ai',
        answer: 'Build the lesson around objectives, practice, coaching feedback, and reflection. [S1]',
        citations: [{
          sourceId: 'S1',
          title: 'AI Literacy Workshop',
          summary: 'A public reflection-led workshop.',
          typeLabel: 'Workshop',
          moduleLabel: 'Learning Coaching',
          sourceRoute: '/teaching/teaching-courses',
          sourceUrl: 'https://example.com/ai-literacy',
        }],
        suggestedQuestions: ['Create reflection questions.'],
        partialSources: false,
        agentId: 'xchange',
        supportingAgentId: null,
        executedTools: ['searchLearningMaterials'],
      }),
    });
  });

  await page.goto('/teaching/nexaeon-xchange');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByTestId('xchange-agent-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'NexAeon Xchange', level: 1 })).toBeVisible();

  const input = page.locator('#xchange-agent-query');
  await input.fill('Design a 90-minute AI literacy lesson');
  await page.getByRole('button', { name: 'Submit' }).dblclick();
  await expect(page.getByText('Xchange is searching public teaching data with the Learning tools…')).toBeVisible();
  await expect(page.locator('.agent-message-assistant').last()).toContainText('coaching feedback');
  await expect(page.getByRole('button', { name: 'Jump to source S1' })).toBeVisible();
  await expect(page.locator('.agent-result-card').filter({ hasText: 'AI Literacy Workshop' })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toEqual({
    message: 'Design a 90-minute AI literacy lesson',
    locale: 'en',
    history: [],
  });

  await page.getByRole('button', { name: 'Clear chat' }).click();
  await expect(page.locator('.agent-message')).toHaveCount(0);
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.getByText('학습, 교육 또는 수업 설계 요청을 입력하세요')).toBeVisible();
  await expect(page.getByRole('button', { name: '보내기' })).toBeVisible();
});

test('Xchange supports cancel, empty result, and tool error states', async ({ page }) => {
  let mode = 'pending';
  await page.route('**/api/agent/xchange/chat', async (route) => {
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
        agentId: 'xchange',
        executedTools: [],
      }),
    });
  });

  await page.goto('/teaching/nexaeon-xchange');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  const input = page.locator('#xchange-agent-query');
  await input.fill('Cancel this request');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Xchange is searching public teaching data with the Learning tools…')).toBeHidden();
  await expect(page.locator('.agent-message-assistant')).toHaveCount(0);

  mode = 'no_sources';
  await input.fill('No matching material');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('The currently public Learning Coaching data does not contain enough information to answer this request.')).toBeVisible();

  mode = 'tool_unavailable';
  await input.fill('Retry tools');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Xchange’s Learning tools cannot read the public data right now. Please try again later.')).toBeVisible();
});
