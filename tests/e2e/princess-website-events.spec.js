import { expect, test } from '@playwright/test';

const PET = '[data-pet-state]';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.sessionStorage.setItem('nexaeon_intro_seen', 'true');
    window.sessionStorage.setItem('nexaeon_companion_intro_docked', 'true');
  });
});

test('six module route entries map once to existing Princess behavior states', async ({ page }) => {
  const routes = [
    ['/identity/profile', 'sitting_smile'],
    ['/research/topic', 'sit'],
    ['/teaching/course', 'sitting_smile'],
    ['/knowledge-lab/resource', 'sit'],
    ['/projects/demo', 'curious'],
    ['/field-lab/action', 'standing_attentive'],
  ];

  for (const [route, state] of routes) {
    await page.goto(route);
    await expect(page.locator(PET)).toHaveAttribute('data-pet-state', state);
    await page.waitForTimeout(250);
    await expect(page.locator(PET)).toHaveAttribute('data-pet-state', state);
  }
});

test('Navigator thinking persists for a long request and terminal success replaces it', async ({ page }) => {
  await page.route('**/api/agent/chat', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3_500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ answer: 'Event-layer success', mode: 'ai', reason: '', citations: [], suggestedQuestions: [], partialSources: false }),
    });
  });
  await page.goto('/identity/nexaeon-navigator');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.locator('#navigator-agent-query').fill('Keep thinking until this request completes');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'standing_attentive');
  await page.waitForTimeout(3_100);
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'standing_attentive');
  await expect(page.getByText('Event-layer success', { exact: true })).toBeVisible();
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'sitting_smile');
});

test('empty Research search becomes concerned and is never reported as a data error', async ({ page }) => {
  await page.goto('/research/research-literature-database');
  await page.locator('.literature-search-input').fill('no-result-princess-event-9f8e7d');
  await page.locator('.literature-search-input').press('Enter');
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'quiet');
});

test('data loading and success do not close the Action Panel', async ({ page }) => {
  await page.route('**/api/modules/demos', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 750));
    await route.continue();
  });
  await page.goto('/projects/module-demos');
  await page.getByTestId('princess-interactive').click({ force: true });
  await expect(page.getByTestId('companion-action-panel')).toBeVisible();
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'sit', { timeout: 2_000 });
  await expect(page.getByTestId('companion-action-panel')).toBeVisible();
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'sitting_smile', { timeout: 5_000 });
  await expect(page.getByTestId('companion-action-panel')).toBeVisible();
});

test('reduced motion preserves route semantics while intro suppresses route events until skip', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/research/topic');
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'sit');

  const introPage = await page.context().newPage();
  await introPage.emulateMedia({ reducedMotion: 'reduce' });
  await introPage.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await introPage.goto('/#research');
  await expect(introPage.locator(PET)).not.toHaveAttribute('data-princess-intro-phase', 'active');
  await expect(introPage.locator(PET)).not.toHaveAttribute('data-pet-state', 'sit');
  await introPage.locator('.intro-skip-btn').click();
  await expect(introPage.locator(PET)).toHaveAttribute('data-princess-intro-phase', 'active');
  await expect(introPage.locator(PET)).toHaveAttribute('data-pet-state', 'sit');
  await introPage.close();
});
