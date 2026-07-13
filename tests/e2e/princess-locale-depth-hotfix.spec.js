import { expect, test } from '@playwright/test';

const localeGreeting = '[data-testid="princess-locale-greeting"]';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('nexaeon_intro_seen', 'true');
    sessionStorage.setItem('nexaeon_princess_intro_docked', 'true');
  });
});

test('real locale changes show one translated greeting without replaying intro', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(localeGreeting)).toHaveCount(0);
  await expect(page.locator('.intro-overlay')).toHaveCount(0);

  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.locator(localeGreeting)).toHaveText('언어가 변경되었어요. 계속 함께 NexAeon을 탐험해 볼게요.');
  await expect(page.locator(localeGreeting)).toHaveCount(1);
  await expect(page.locator('.intro-overlay')).toHaveCount(0);

  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.locator(localeGreeting)).toHaveText('The language has changed. I’ll continue exploring NexAeon with you.');

  await page.getByRole('button', { name: '切換為繁體中文' }).click();
  await expect(page.locator(localeGreeting)).toHaveText('語言已切換，我會繼續陪你探索 NexAeon。');
  await expect(page.locator('[data-princess-intro-phase]')).toHaveAttribute('data-princess-intro-phase', 'active');
});

test('locale greeting ignores interaction and proactive settings but never overlaps settings', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nexaeon-princess-companion-preferences', JSON.stringify({
      version: 1, visible: true, autoBehavior: false, proactiveBubbles: false,
      accessoriesEnabled: true, interactionEnabled: false, motionLevel: 'none', scale: 1,
    }));
  });
  await page.goto('/');
  const settings = page.locator('[data-princess-settings-trigger="true"]');
  await settings.click();
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.locator(localeGreeting)).toHaveCount(0);
  await settings.click();
  await expect(page.locator(localeGreeting)).toHaveText('언어가 변경되었어요. 계속 함께 NexAeon을 탐험해 볼게요.');
});

test('a hidden Princess never queues a locale greeting', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nexaeon-princess-companion-preferences', JSON.stringify({
      version: 1, visible: false, autoBehavior: true, proactiveBubbles: true,
      accessoriesEnabled: true, interactionEnabled: true, motionLevel: 'full', scale: 1,
    }));
  });
  await page.goto('/');
  await expect(page.locator('[data-princess-intro-phase]')).toHaveCount(0);
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.locator(localeGreeting)).toHaveCount(0);
});

test('an action panel and locale greeting are never rendered together', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('princess-interactive').click({ force: true });
  await expect(page.getByTestId('companion-action-panel')).toBeVisible();
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.locator(`${localeGreeting}:visible`)).toHaveCount(1);
  await expect(page.getByTestId('companion-action-panel')).toHaveCount(0);
});

test('depth profiles render only appropriate ground shadows and remain bounded responsively', async ({ page }) => {
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    await page.goto('/identity/profile');
    const portrait = page.locator('[data-companion-module="identity"]');
    await expect(portrait).toHaveAttribute('data-companion-shadow-type', 'soft-float');
    await expect(portrait.getByTestId('princess-ground-shadow')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

    await page.goto('/field-lab/action');
    const fullBody = page.locator('[data-companion-module="action"]');
    await expect(fullBody).toHaveAttribute('data-companion-shadow-type', 'ground');
    await expect(fullBody.getByTestId('princess-ground-shadow')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
});

test('depth motion stops for none, reduced motion, drag, and an open action panel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/field-lab/action');
  const pet = page.locator('[data-companion-module="action"]');
  const shadow = pet.getByTestId('princess-ground-shadow');
  await expect(pet).toHaveAttribute('data-pet-motion-level', 'reduced');
  await expect.poll(() => shadow.evaluate((node) => getComputedStyle(node).animationName)).toBe('none');

  const button = pet.getByTestId('princess-interactive');
  await button.dispatchEvent('pointerdown', { pointerId: 1, isPrimary: true, clientX: 100, clientY: 100 });
  await button.dispatchEvent('pointermove', { pointerId: 1, isPrimary: true, clientX: 120, clientY: 120 });
  await expect(pet).toHaveAttribute('data-companion-depth-stable', 'true');
  await button.dispatchEvent('pointerup', { pointerId: 1, isPrimary: true, clientX: 120, clientY: 120 });
});
