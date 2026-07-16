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
  await expect(page.locator('.agent-message-user')).toHaveCount(0);
  expect(chatRequests).toBe(0);
  await page.getByTestId('princess-interactive').click({ force: true });
  await page.locator('[data-action-id="clear-prefill"]').click();
  await expect(input).toHaveValue('');
  expect(chatRequests).toBe(0);
});
