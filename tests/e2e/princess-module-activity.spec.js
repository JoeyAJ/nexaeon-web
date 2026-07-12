import { expect, test } from '@playwright/test';

const PET = '[data-pet-state]';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

async function settleRouteReaction(page) {
  await expect(page.locator(PET)).toBeVisible();
  await expect(page.locator(PET)).not.toHaveAttribute('data-pet-state', /curious|happy|wave/, { timeout: 5_000 });
}

test('Research submit and item open produce one low-disruption reaction without reacting to typing', async ({ page }) => {
  await page.goto('/research/research-literature-database');
  await settleRouteReaction(page);
  const pet = page.locator(PET);
  const search = page.locator('.literature-search-input');

  await search.fill('AI');
  await expect(pet).not.toHaveAttribute('data-pet-state', 'curious');
  await search.press('Enter');
  await expect(pet).toHaveAttribute('data-pet-state', 'curious');
  await expect(pet).toHaveAttribute('data-pet-state', 'standing_attentive', { timeout: 5_000 });

  await page.locator('.literature-expand-button').first().click();
  await expect(pet).toHaveAttribute('data-pet-state', 'sit');
  await page.locator('.literature-expand-button').first().click();
  await expect(pet).not.toHaveAttribute('data-pet-state', /happy|curious/);
});

test('Knowledge, Coaching, Prototype, Action, and Identity use context-specific existing reactions', async ({ page }) => {
  const cases = [
    ['/knowledge-lab/knowledge-resources', '.knowledge-expand-button', 'sit'],
    ['/teaching/teaching-courses', '.teaching-expand-button', 'curious'],
    ['/projects/module-demos', '.mvp-action-button', /curious|happy/],
    ['/field-lab/action-projects', '.action-action-button', 'curious'],
    ['/identity/identity-profiles', '.identity-action-button', 'sit'],
  ];

  for (const [path, selector, reaction] of cases) {
    await page.goto(path);
    await settleRouteReaction(page);
    const control = page.locator(selector).first();
    await expect(control).toBeVisible();
    await control.click();
    await expect(page.locator(PET)).toHaveAttribute('data-pet-state', reaction);
    await expect(page.locator(PET)).not.toHaveAttribute('data-pet-state', /happy|curious|wave/, { timeout: 5_000 });
  }
});

test('module activities remain stable on mobile and after all locale changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/knowledge-lab/knowledge-resources');
  await settleRouteReaction(page);
  for (const name of ['Switch to English', '한국어로 전환']) {
    await page.getByRole('button', { name }).click();
    await expect(page.locator(PET)).toBeVisible();
    await expect(page.locator(PET)).toHaveCount(1);
  }
  const chip = page.locator('.knowledge-filter-chip').nth(1);
  await chip.click();
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'wave');
  await chip.click();
  await expect(page.locator(PET)).toHaveCount(1);
});
