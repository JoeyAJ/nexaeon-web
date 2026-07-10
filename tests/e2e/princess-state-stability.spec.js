import { expect, test } from '@playwright/test';

const PET_ROOT = '[data-pet-state]';
const PET_BUTTON = 'button[aria-label="Interact with the princess pet"]';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('nexaeon_intro_seen', 'true');
  });
});

function watchRuntimeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error:${message.text()}`);
    if (message.type() === 'warning' && /hydration|unmounted|react/i.test(message.text())) {
      errors.push(`console.warning:${message.text()}`);
    }
  });
  return () => expect(errors, errors.join('\n')).toEqual([]);
}

async function expectLoadedIdlePrincess(page) {
  const root = page.locator(PET_ROOT);
  const image = root.locator('img');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-pet-state', 'idle');
  await expect(root).toHaveAttribute('data-pet-dragging', 'false');
  await expect.poll(() => image.evaluate((node) => ({ complete: node.complete, width: node.naturalWidth })))
    .toEqual({ complete: true, width: 138 });
}

test('Princess loads safely, refreshes, and keeps single and double clicks isolated', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.goto('/');
  await expectLoadedIdlePrincess(page);

  const root = page.locator(PET_ROOT);
  const button = page.locator(PET_BUTTON);
  await button.click();
  await expect(root).toHaveAttribute('data-pet-state', /wave|happy/);
  await expect(root).toHaveAttribute('data-pet-state', 'idle', { timeout: 4_000 });

  await button.dblclick();
  await expect(root).toHaveAttribute('data-pet-state', 'idle');

  await page.reload();
  await expectLoadedIdlePrincess(page);
  assertRuntimeClean();
});

test('drag pauses state changes and does not trigger a click interaction', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.goto('/');
  await expectLoadedIdlePrincess(page);

  const root = page.locator(PET_ROOT);
  const button = page.locator(PET_BUTTON);
  const box = await button.boundingBox();
  expect(box).not.toBeNull();

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 24, startY - 18, { steps: 3 });
  await expect(root).toHaveAttribute('data-pet-dragging', 'true');
  await expect(root).toHaveAttribute('data-pet-state', 'idle');
  await page.mouse.up();

  await expect(root).toHaveAttribute('data-pet-dragging', 'false');
  await expect(root).toHaveAttribute('data-pet-state', 'idle');
  await page.waitForTimeout(500);
  await expect(root).toHaveAttribute('data-pet-state', 'idle');
  expect(await page.evaluate(() => window.localStorage.getItem('nexaeon-princess-pet-position'))).not.toBeNull();
  assertRuntimeClean();
});

test('long press triggers affection without also triggering click, including mobile layout', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expectLoadedIdlePrincess(page);

  const root = page.locator(PET_ROOT);
  const button = page.locator(PET_BUTTON);
  const box = await button.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(root).toHaveAttribute('data-pet-state', 'affection', { timeout: 1_500 });
  await page.mouse.up();
  await expect(root).toHaveAttribute('data-pet-state', 'idle', { timeout: 4_000 });
  await page.waitForTimeout(400);
  await expect(root).toHaveAttribute('data-pet-state', 'idle');
  assertRuntimeClean();
});
