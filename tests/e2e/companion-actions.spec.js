import { expect, test } from '@playwright/test';

const modules = [
  ['home', '/'],
  ['identity', '/identity/identity-profiles'],
  ['research', '/research/research-literature-database'],
  ['coaching', '/teaching/teaching-courses'],
  ['knowledge', '/knowledge-lab/knowledge-resources'],
  ['prototype', '/projects/module-demos'],
  ['action', '/field-lab/action-projects'],
  ['navigator', '/identity/nexaeon-navigator'],
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

test('Princess exposes a viewport-safe, module-aware action panel across all modules', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [moduleKey, route] of modules) {
    await page.goto(route);
    await page.getByTestId('princess-interactive').click({ force: true });
    const panel = page.getByTestId('companion-action-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('button').first()).toBeFocused();
    await expect(panel.locator('[data-action-id]')).toHaveCount(3);
    await expect(page.locator('[data-companion-module]')).toHaveAttribute('data-companion-module', moduleKey);
    const box = await panel.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.getByTestId('princess-interactive')).toBeFocused();
  }
});

test('settings and Princess actions are mutually exclusive', async ({ page }) => {
  await page.goto('/research/research-literature-database');
  await page.locator('[data-princess-settings-trigger="true"]').click();
  await expect(page.locator('#princess-companion-controls-panel')).toBeVisible();
  await page.getByTestId('princess-interactive').click({ force: true });
  await expect(page.locator('#princess-companion-controls-panel')).toBeVisible();
  await expect(page.getByTestId('companion-action-panel')).toBeHidden();
  await page.locator('[data-princess-settings-trigger="true"]').click();
  await page.getByTestId('princess-interactive').click({ force: true });
  await expect(page.getByTestId('companion-action-panel')).toBeVisible();
  await page.locator('[data-princess-settings-trigger="true"]').click();
  await expect(page.getByTestId('companion-action-panel')).toBeHidden();
  await expect(page.locator('#princess-companion-controls-panel')).toBeVisible();
});

test('Navigator handoff prefills a localized prompt without submitting it', async ({ page }) => {
  let chatRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/agent/chat')) chatRequests += 1;
  });
  await page.goto('/research/research-literature-database');
  await page.getByTestId('princess-interactive').click({ force: true });
  await page.locator('[data-action-id="ask-research"]').click();
  await expect(page).toHaveURL(/\/identity\/nexaeon-navigator$/);
  const input = page.locator('#navigator-agent-query');
  await expect(input).toHaveValue('請根據目前研究模塊，幫我判斷下一步最值得推進的研究工作。');
  await expect(input).toBeFocused();
  await expect(page.getByTestId('navigator-current-module')).toContainText('Research Roadmap');
  await expect(page.getByTestId('navigator-default-agent')).toContainText('研究 Agent');
  await expect(page.locator('.agent-message-user')).toHaveCount(0);
  expect(chatRequests).toBe(0);
  await page.getByTestId('princess-interactive').click({ force: true });
  await page.locator('[data-action-id="clear-prefill"]').click();
  await expect(input).toHaveValue('');
  expect(chatRequests).toBe(0);
});

test('the two Navigator-backed module Agent regions hand off validated context and preserve actual response agent', async ({ page }) => {
  const cases = [
    { moduleId: 'identity', agentId: 'identity', moduleName: 'Identity' },
    { moduleId: 'field-lab', agentId: 'action', moduleName: 'Action Center' },
  ];
  const requests = [];
  await page.route('**/api/agent/chat', async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    const responseAgent = body.message.includes('Dashboard') ? 'prototype' : body.preferredAgent;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        mode: 'ai',
        answer: `Context answer from ${responseAgent}`,
        citations: [],
        suggestedQuestions: [],
        partialSources: false,
        agentId: responseAgent,
        supportingAgentId: null,
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();

  for (const [index, item] of cases.entries()) {
    const entry = page.getByTestId(`module-agent-indicator-${item.moduleId}`);
    await entry.focus();
    await page.keyboard.press(index % 2 === 0 ? 'Enter' : 'Space');
    await expect(page).toHaveURL(/\/identity\/nexaeon-navigator$/);
    await expect(page.getByTestId('navigator-current-module')).toContainText(item.moduleName);
    await expect(page.getByTestId('navigator-default-agent')).toContainText(new RegExp(item.agentId, 'i'));
    const input = page.locator('#navigator-agent-query');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('');
    expect(requests).toHaveLength(index);
    expect(await page.evaluate(() => window.history.state?.navigatorSourceRoute)).toBe(`/#${item.moduleId}`);
    await input.fill('What should I consider next?');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('.agent-message-assistant').last()).toContainText(`Context answer from ${item.agentId}`);
    await expect(page.locator('.agent-message-assistant').last()).toContainText(/Response Agent:/);
    expect(requests).toHaveLength(index + 1);
    expect(requests[index]).toMatchObject({
      locale: 'en',
      message: 'What should I consider next?',
      currentModule: item.agentId,
      preferredAgent: item.agentId,
      currentRoute: `/#${item.moduleId}`,
    });

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  }

  await page.getByTestId('module-agent-indicator-identity').click();
  const input = page.locator('#navigator-agent-query');
  await input.fill('Turn this research into a Dashboard');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('.agent-message-assistant').last()).toContainText('Context answer from prototype');
  await expect(page.locator('.agent-message-assistant').last()).toContainText('Response Agent: Prototype Agent');
  expect(requests.at(-1)).toMatchObject({ currentModule: 'identity', preferredAgent: 'identity' });
  await page.evaluate(() => window.history.replaceState({ ...window.history.state, nexaeonDepth: 0 }, '', window.location.href));
  await page.locator('.subpage-content > button').first().click();
  await expect(page).toHaveURL(/#identity$/);
});
