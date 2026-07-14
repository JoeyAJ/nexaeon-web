import { expect, test } from '@playwright/test';

const routes = [
  ['/', 'home', 'none'],
  ['/identity/profile', 'identity', 'none'],
  ['/research/topic', 'research', 'none'],
  ['/teaching/course', 'coaching', 'academic-cap'],
  ['/knowledge-lab/resource', 'knowledge', 'none'],
  ['/projects/demo', 'prototype', 'none'],
  ['/field-lab/action', 'action', 'none'],
  ['/identity/nexaeon-navigator', 'navigator', 'none'],
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
  await page.goto('/teaching/course');
  const pet = page.locator('[data-companion-module]');
  const accessory = page.getByTestId('princess-accessory-academic-cap');
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
  expect(Math.sign(afterAccessory.x - beforeAccessory.x)).toBe(Math.sign(afterPet.x - beforePet.x));
  expect(Math.sign(afterAccessory.y - beforeAccessory.y)).toBe(Math.sign(afterPet.y - beforePet.y));
  expect(afterAccessory.x).toBeGreaterThanOrEqual(afterPet.x);
  expect(afterAccessory.x + afterAccessory.width).toBeLessThanOrEqual(afterPet.x + afterPet.width);
  expect(afterAccessory.y).toBeGreaterThanOrEqual(afterPet.y);
  expect(afterAccessory.y + afterAccessory.height).toBeLessThanOrEqual(afterPet.y + afterPet.height);
});

test('academic cap stays with the fixed image during reactions and hides for sleep', async ({ page }) => {
  await page.goto('/teaching/course');
  const pet = page.locator('[data-companion-module]');
  await expect(pet).toHaveAttribute('data-pet-state', 'sitting_smile');
  await expect(page.getByTestId('princess-accessory-academic-cap')).toBeVisible();
  await page.getByTestId('princess-interactive').click({ force: true });
  await expect(pet).toHaveAttribute('data-pet-state', /wave|sitting_smile/);
  await expect(pet.locator('img')).toHaveAttribute('src', /\/pet\/princess\/frames\/frame-\d+\.png$/);
  await expect(page.getByTestId('princess-accessory-academic-cap')).toBeVisible();
  await expect(pet).toHaveAttribute('data-pet-state', 'sitting_smile', { timeout: 5_000 });
  await expect(page.getByTestId('princess-accessory-academic-cap')).toBeVisible();

  const sleepPage = await page.context().newPage();
  await sleepPage.addInitScript(() => {
    sessionStorage.setItem('nexaeon_intro_seen', 'true');
    sessionStorage.setItem('nexaeon_companion_intro_docked', 'true');
  });
  await sleepPage.goto('/teaching/course?princessInactivity=sleep');
  const sleepingPet = sleepPage.locator('[data-companion-module]');
  await expect(sleepingPet).toHaveAttribute('data-pet-state', 'sleeping_prone');
  await expect(sleepingPet.locator('img')).toHaveAttribute('src', /frame-033\.png$/);
  await expect(sleepPage.getByTestId('princess-accessory-academic-cap')).toHaveCount(0);
  await sleepPage.close();
});

test('inactivity preserves the module image and interaction restores its base profile', async ({ page }) => {
  await page.goto('/?princessInactivity=sleepy');
  const pet = page.locator('[data-companion-module]');
  await expect(pet.locator('img')).toHaveAttribute('src', /frame-033\.png$/);
  await expect(pet).toHaveAttribute('data-pet-motion-variant', 'sleepy');
  await expect(pet).toHaveAttribute('data-companion-module', 'home');
  await page.getByTestId('princess-interactive').click({ force: true });
  await expect(pet).toHaveAttribute('data-pet-motion-variant', 'base');
  await expect(pet.locator('img')).toHaveAttribute('src', /\/pet\/princess\/frames\/frame-\d+\.png$/, { timeout: 5_000 });
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
