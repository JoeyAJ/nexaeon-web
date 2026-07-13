import { expect, test } from '@playwright/test';

const routes = [
  ['/', 'home', 'none'],
  ['/identity/profile', 'identity', 'round-glasses'],
  ['/research/topic', 'research', 'round-glasses'],
  ['/teaching/course', 'coaching', 'academic-cap'],
  ['/knowledge-lab/resource', 'knowledge', 'round-glasses'],
  ['/projects/demo', 'prototype', 'none'],
  ['/field-lab/action', 'action', 'none'],
  ['/identity/nexaeon-navigator', 'navigator', 'round-glasses'],
  ['/unknown-route', 'fallback', 'none'],
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('nexaeon_intro_seen', 'true');
    sessionStorage.setItem('nexaeon_companion_intro_docked', 'true');
  });
});

test('detects actual routes and renders only the requested accessory', async ({ page }) => {
  for (const [route, moduleKey, accessory] of routes) {
    await page.goto(route);
    const pet = page.locator('[data-companion-module]');
    await expect(pet).toHaveAttribute('data-companion-module', moduleKey);
    await expect(pet).toHaveAttribute('data-companion-accessory', accessory);
    await expect(page.locator('[data-testid^="princess-accessory-"]')).toHaveCount(accessory === 'none' ? 0 : 1);
  }
});

test('shows a localized module bubble once per session and never on Home', async ({ page }) => {
  await page.goto('/identity/profile');
  await expect(page.getByTestId('princess-route-bubble')).toContainText('每一個身份，都從一次凝視自己開始。', { timeout: 2_500 });
  await page.goto('/identity/overview');
  await page.waitForTimeout(1_200);
  await expect(page.getByTestId('princess-route-bubble')).toHaveCount(0);
  await page.goto('/');
  await page.waitForTimeout(1_200);
  await expect(page.getByTestId('princess-route-bubble')).toHaveCount(0);
});

test('accessory follows the Princess during drag and bubble does not block it', async ({ page }) => {
  await page.goto('/research/topic');
  const pet = page.locator('[data-companion-module]');
  const accessory = page.getByTestId('princess-accessory-round-glasses');
  const beforePet = await pet.boundingBox();
  const beforeAccessory = await accessory.boundingBox();
  const princess = page.getByTestId('princess-interactive');
  const target = await princess.boundingBox();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x - 60, target.y - 40, { steps: 5 });
  await page.mouse.up();
  const afterPet = await pet.boundingBox();
  const afterAccessory = await accessory.boundingBox();
  expect(Math.abs((afterAccessory.x - beforeAccessory.x) - (afterPet.x - beforePet.x))).toBeLessThan(3);
  expect(Math.abs((afterAccessory.y - beforeAccessory.y) - (afterPet.y - beforePet.y))).toBeLessThan(4);
});

test('round glasses hide for an unsafe reaction pose and return on the module pose', async ({ page }) => {
  await page.goto('/identity/profile');
  const pet = page.locator('[data-companion-module]');
  await expect(pet).toHaveAttribute('data-pet-state', 'standing_attentive');
  await expect(page.getByTestId('princess-accessory-round-glasses')).toBeVisible();
  await page.getByTestId('princess-interactive').click({ force: true });
  await expect(pet).toHaveAttribute('data-pet-state', /wave|sitting_smile/);
  await expect(page.getByTestId('princess-accessory-round-glasses')).toHaveCount(0);
  await expect(pet).toHaveAttribute('data-pet-state', 'standing_attentive', { timeout: 5_000 });
  await expect(page.getByTestId('princess-accessory-round-glasses')).toBeVisible();
});

test('inactivity preserves the module image and interaction restores its base profile', async ({ page }) => {
  await page.goto('/?princessInactivity=sleepy');
  const pet = page.locator('[data-companion-module]');
  await expect(pet.locator('img')).toHaveAttribute('src', /princess-module-pose-02\.png$/);
  await expect(pet).toHaveAttribute('data-pet-motion-variant', 'sleepy');
  await expect(pet).toHaveAttribute('data-companion-module', 'home');
  await page.getByTestId('princess-interactive').click({ force: true });
  await expect(pet).toHaveAttribute('data-pet-motion-variant', 'base');
  await expect(pet.locator('img')).toHaveAttribute('src', /princess-module-pose-02\.png$/, { timeout: 5_000 });
});

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`keeps accessory and bubble inside a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: width <= 430 ? 667 : 800 });
    await page.goto('/teaching/course?princessModule=coaching');
    await expect(page.getByTestId('princess-route-bubble')).toBeVisible({ timeout: 2_500 });
    const metrics = await page.evaluate(() => {
      const accessory = document.querySelector('[data-testid^="princess-accessory-"]').getBoundingClientRect();
      const bubble = document.querySelector('[data-testid="princess-route-bubble"]').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, accessory, bubble, width: innerWidth };
    });
    expect(metrics.overflow).toBe(0);
    expect(metrics.accessory.left).toBeGreaterThanOrEqual(0);
    expect(metrics.accessory.right).toBeLessThanOrEqual(metrics.width);
    expect(metrics.bubble.left).toBeGreaterThanOrEqual(0);
    expect(metrics.bubble.right).toBeLessThanOrEqual(metrics.width);
  });
}
