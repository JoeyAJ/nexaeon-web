import { expect, test } from '@playwright/test';

const PET = '[data-pet-state]';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

test('home defaults to calm resting awake, hover becomes attentive, and click becomes happy', async ({ page }) => {
  await page.goto('/');
  const pet = page.locator(PET);
  const button = pet.getByTestId('princess-interactive');
  await expect(pet).toHaveAttribute('data-pet-emotion', 'calm');
  await expect(pet).toHaveAttribute('data-pet-state', 'resting_awake');

  await button.dispatchEvent('pointerover');
  await expect(pet).toHaveAttribute('data-pet-emotion', 'attentive');
  await expect(pet).toHaveAttribute('data-pet-state', 'standing_attentive');

  await button.dispatchEvent('pointerout');
  await expect(pet).toHaveAttribute('data-pet-state', 'resting_awake', { timeout: 3_000 });
  await button.click({ force: true });
  await expect(pet).toHaveAttribute('data-pet-emotion', 'happy');
  await expect(pet).toHaveAttribute('data-pet-state', /wave|sitting_smile/);
});

test('module debug mapping covers all NexAeon contexts without a visible debug UI', async ({ page }) => {
  const cases = [
    ['home', 'calm', 'resting_awake'],
    ['identity', 'attentive', 'standing_attentive'],
    ['research', 'attentive', 'standing_attentive'],
    ['coaching', 'happy', 'sitting_smile'],
    ['knowledge', 'curious', 'resting_awake'],
    ['prototype', 'curious', 'standing_attentive'],
    ['action', 'attentive', 'standing_attentive'],
  ];
  for (const [module, emotion, pose] of cases) {
    await page.goto(`/?princessModule=${module}`);
    const pet = page.locator(PET);
    await expect(pet).toHaveAttribute('data-pet-emotion', emotion);
    await expect(pet).toHaveAttribute('data-pet-state', pose);
    await expect(page.locator('[data-companion-debug-panel]')).toHaveCount(0);
  }
});

test('inactivity debug stages and system event API produce stable emotion-pose pairs', async ({ page }) => {
  const inactivityCases = [
    ['resting', 'calm', 'resting_awake'],
    ['sleepy', 'sleepy', 'sleep'],
    ['sleep', 'sleepy', 'sleeping_prone'],
  ];
  for (const [stage, emotion, pose] of inactivityCases) {
    await page.goto(`/?princessInactivity=${stage}`);
    const pet = page.locator(PET);
    await expect(pet).toHaveAttribute('data-pet-emotion', emotion);
    await expect(pet).toHaveAttribute('data-pet-state', pose);
  }

  await page.goto('/');
  const pet = page.locator(PET);
  for (const [type, emotion, pose] of [
    ['success', 'happy', 'sitting_smile'],
    ['loading', 'attentive', 'standing_attentive'],
    ['error', 'sad', 'quiet'],
  ]) {
    await page.evaluate((eventType) => window.dispatchEvent(new CustomEvent('nexaeon:companion-behavior', {
      detail: { type: eventType, duration: 4_000 },
    })), type);
    await expect(pet).toHaveAttribute('data-pet-emotion', emotion);
    await expect(pet).toHaveAttribute('data-pet-state', pose);
    await expect(pet).toHaveAttribute('data-pet-behavior-source', 'system');
  }
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexaeon:companion-behavior', {
    detail: { type: 'reset' },
  })));
  await expect(pet).toHaveAttribute('data-pet-emotion', 'calm');
  await expect(pet).toHaveAttribute('data-pet-state', 'resting_awake');
});

test('emotion orchestration remains in bounds on mobile and survives locale changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?princessModule=coaching');
  const pet = page.locator(PET);
  await expect(pet).toHaveAttribute('data-pet-emotion', 'happy');
  await expect(pet).toHaveAttribute('data-pet-state', 'sitting_smile');
  for (const name of ['Switch to English', '한국어로 전환']) {
    await page.getByRole('button', { name }).click();
    await expect(pet).toHaveAttribute('data-pet-emotion', 'happy');
    await expect(pet).toHaveAttribute('data-pet-state', 'sitting_smile');
    await expect(pet).toBeInViewport();
  }
});
