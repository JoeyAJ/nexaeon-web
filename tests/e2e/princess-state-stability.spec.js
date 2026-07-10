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
  await expect(root).toHaveAttribute('data-pet-scale', '1.18');

  await page.reload();
  await expectLoadedIdlePrincess(page);
  await expect(root).toHaveAttribute('data-pet-scale', '1.18');
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

test('Princess keeps one mounted instance and its saved layout across navigation and refresh', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.goto('/');
  await expectLoadedIdlePrincess(page);

  const root = page.locator(PET_ROOT);
  const button = page.locator(PET_BUTTON);
  const box = await button.boundingBox();
  expect(box).not.toBeNull();

  await root.evaluate((node) => {
    node.dataset.persistenceMarker = 'same-princess-instance';
  });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 48, box.y + box.height / 2 - 24, { steps: 3 });
  await page.mouse.up();

  const savedTransform = await root.getAttribute('style');
  const storedPosition = JSON.parse(await page.evaluate(() => (
    window.localStorage.getItem('nexaeon-princess-pet-position')
  )));
  expect(storedPosition.version).toBe(1);
  expect(Number.isFinite(storedPosition.updatedAt)).toBe(true);

  await page.getByTestId('module-card-research').getByRole('button').click();
  await page.getByTestId('module-entry-research-literature-database').click();
  await expect(page).toHaveURL(/\/research\/research-literature-database$/);
  await expect(page.locator(PET_ROOT)).toHaveCount(1);
  await expect(root).toHaveAttribute('data-persistence-marker', 'same-princess-instance');
  await expect(root).toHaveAttribute('style', savedTransform);

  await page.goBack();
  await expect(page.locator(PET_ROOT)).toHaveCount(1);
  await expect(root).toHaveAttribute('data-persistence-marker', 'same-princess-instance');
  await expect(root).toHaveAttribute('style', savedTransform);

  const persistentRoutes = [
    '/identity/identity-profiles',
    '/identity/nexaeon-navigator',
    '/research/research-literature-database',
    '/teaching/teaching-courses',
    '/knowledge-lab/knowledge-resources',
    '/projects/module-demos',
    '/field-lab/action-projects',
    '/',
  ];

  for (const path of persistentRoutes) {
    await page.evaluate((nextPath) => {
      window.history.pushState({ nexaeonEntry: true, nexaeonDepth: 1 }, '', nextPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`));
    await expect(page.locator(PET_ROOT)).toHaveCount(1);
    await expect(root).toHaveAttribute('data-persistence-marker', 'same-princess-instance');
    await expect(root).toHaveAttribute('style', savedTransform);
  }

  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator(PET_ROOT)).toHaveCount(1);
  await expect(root).toHaveAttribute('data-persistence-marker', 'same-princess-instance');
  await expect(root).toHaveAttribute('style', savedTransform);

  await page.reload();
  await expect(page.locator(PET_ROOT)).toHaveCount(1);
  await expect(page.locator(PET_ROOT)).toHaveAttribute('style', savedTransform);
  assertRuntimeClean();
});

test('route change safely ends an active Princess drag without remounting', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.goto('/');
  await expectLoadedIdlePrincess(page);

  const root = page.locator(PET_ROOT);
  const button = page.locator(PET_BUTTON);
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  await root.evaluate((node) => {
    node.dataset.persistenceMarker = 'drag-route-instance';
  });

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 30, box.y + box.height / 2 - 18, { steps: 3 });
  await expect(root).toHaveAttribute('data-pet-dragging', 'true');

  await page.evaluate(() => {
    window.history.pushState({ nexaeonEntry: true, nexaeonDepth: 1 }, '', '/research/research-literature-database');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(/\/research\/research-literature-database$/);
  await expect(root).toHaveAttribute('data-pet-dragging', 'false');
  await expect(root).toHaveAttribute('data-pet-state', 'idle');
  await expect(root).toHaveAttribute('data-persistence-marker', 'drag-route-instance');
  await expect(page.locator(PET_ROOT)).toHaveCount(1);
  await page.mouse.up();

  const storedPosition = JSON.parse(await page.evaluate(() => (
    window.localStorage.getItem('nexaeon-princess-pet-position')
  )));
  expect(storedPosition.version).toBe(1);
  assertRuntimeClean();
});
