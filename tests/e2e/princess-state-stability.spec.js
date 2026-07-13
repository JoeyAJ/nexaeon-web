import { expect, test } from '@playwright/test';

const PET_ROOT = '[data-pet-state]';
const PET_BUTTON = '[data-testid="princess-interactive"]';

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
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake');
  await expect(root).toHaveAttribute('data-pet-dragging', 'false');
  await expect.poll(() => image.evaluate((node) => ({ complete: node.complete, width: node.naturalWidth })))
    .toEqual({ complete: true, width: 1085 });
}

test('Princess loads safely, refreshes, and keeps single and double clicks isolated', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.goto('/');
  await expectLoadedIdlePrincess(page);

  const root = page.locator(PET_ROOT);
  const button = page.locator(PET_BUTTON);
  await button.click({ force: true });
  await expect(root).toHaveAttribute('data-pet-state', /wave|sitting_smile/);
  await page.mouse.move(0, 0);
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake', { timeout: 4_000 });

  await button.dblclick({ force: true });
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake');
  await expect(root).toHaveAttribute('data-pet-scale', '1.18');

  await page.mouse.move(0, 0);
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
  await expect(root).toHaveAttribute('data-pet-state', 'standing_attentive');
  await page.mouse.up();

  await expect(root).toHaveAttribute('data-pet-dragging', 'false');
  await expect(root).toHaveAttribute('data-pet-state', 'standing_attentive');
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake', { timeout: 3_000 });
  expect(JSON.parse(await page.evaluate(() => window.localStorage.getItem('nexaeon-princess-companion-preferences'))).position).not.toBeNull();
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
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake', { timeout: 4_000 });
  await page.waitForTimeout(400);
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake');
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

  const savedTransform = await root.evaluate((node) => node.style.transform);
  const storedPosition = JSON.parse(await page.evaluate(() => (
    window.localStorage.getItem('nexaeon-princess-companion-preferences')
  )));
  expect(storedPosition.version).toBe(1);
  expect(storedPosition.position).not.toBeNull();
  expect(Number.isNaN(Date.parse(storedPosition.updatedAt))).toBe(false);

  await page.getByTestId('module-card-research').getByRole('button').click();
  await page.getByTestId('module-entry-research-literature-database').click();
  await expect(page).toHaveURL(/\/research\/research-literature-database$/);
  await expect(page.locator(PET_ROOT)).toHaveCount(1);
  await expect(root).toHaveAttribute('data-persistence-marker', 'same-princess-instance');
  await expect.poll(() => root.evaluate((node) => node.style.transform)).toBe(savedTransform);

  await page.goBack();
  await expect(page.locator(PET_ROOT)).toHaveCount(1);
  await expect(root).toHaveAttribute('data-persistence-marker', 'same-princess-instance');
  await expect.poll(() => root.evaluate((node) => node.style.transform)).toBe(savedTransform);

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
    await expect.poll(() => root.evaluate((node) => node.style.transform)).toBe(savedTransform);
  }

  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator(PET_ROOT)).toHaveCount(1);
  await expect(root).toHaveAttribute('data-persistence-marker', 'same-princess-instance');
  await expect.poll(() => root.evaluate((node) => node.style.transform)).toBe(savedTransform);

  await page.reload();
  await expect(page.locator(PET_ROOT)).toHaveCount(1);
  await expect.poll(() => page.locator(PET_ROOT).evaluate((node) => node.style.transform)).toBe(savedTransform);
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
  await expect(root).toHaveAttribute('data-pet-state', 'standing_attentive');
  await expect(root).toHaveAttribute('data-persistence-marker', 'drag-route-instance');
  await expect(page.locator(PET_ROOT)).toHaveCount(1);
  await page.mouse.up();

  const storedPosition = JSON.parse(await page.evaluate(() => (
    window.localStorage.getItem('nexaeon-princess-companion-preferences')
  )));
  expect(storedPosition.version).toBe(1);
  assertRuntimeClean();
});

test('Companion controls persist visibility, automatic behavior, and interaction settings', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.goto('/');
  await expectLoadedIdlePrincess(page);

  const controls = page.getByTestId('princess-controls');
  const root = page.locator(PET_ROOT);
  await controls.getByRole('button', { name: '開啟 Companion 設定' }).click();
  await expect(controls.getByRole('dialog', { name: 'Companion 設定' })).toBeVisible();

  const autoSwitch = controls.getByRole('switch', { name: '自動行為' });
  await autoSwitch.click();
  await expect(autoSwitch).toHaveAttribute('aria-checked', 'false');
  await expect(root).toHaveAttribute('data-pet-auto-behavior', 'false');
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake');
  await page.evaluate(() => document.querySelector('[data-testid="princess-interactive"]').click());
  await expect(root).toHaveAttribute('data-pet-state', /wave|sitting_smile/);
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake', { timeout: 4_000 });

  const interactionSwitch = controls.getByRole('switch', { name: '允許互動' });
  await interactionSwitch.click();
  await expect(interactionSwitch).toHaveAttribute('aria-checked', 'false');
  await expect(root).toHaveAttribute('data-pet-interaction', 'false');
  await page.getByTestId('princess-interactive').click({ force: true });
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake');

  const visibleSwitch = controls.getByRole('switch', { name: '顯示 Princess' });
  await visibleSwitch.click();
  await expect(page.locator(PET_ROOT)).toHaveCount(0);
  await expect(controls.getByRole('button', { name: '開啟 Companion 設定' })).toBeVisible();

  const settingsRecord = JSON.parse(await page.evaluate(() => (
    new Promise((resolve) => window.setTimeout(() => resolve(
    window.localStorage.getItem('nexaeon-princess-companion-preferences')
    ), 220))
  )));
  expect(settingsRecord).toMatchObject({
    version: 1,
    visible: false,
    autoBehavior: false,
    interactionEnabled: false,
  });

  await page.reload();
  await expect(page.locator(PET_ROOT)).toHaveCount(0);
  await controls.getByRole('button', { name: '開啟 Companion 設定' }).click();
  const restoredVisibleSwitch = controls.getByRole('switch', { name: '顯示 Princess' });
  await expect(restoredVisibleSwitch).toHaveAttribute('aria-checked', 'false');
  await restoredVisibleSwitch.click();
  await expectLoadedIdlePrincess(page);
  await expect(root).toHaveAttribute('data-pet-auto-behavior', 'false');
  await expect(root).toHaveAttribute('data-pet-interaction', 'false');

  await page.keyboard.press('Escape');
  await expect(controls.getByRole('dialog', { name: 'Companion 設定' })).toHaveCount(0);
  assertRuntimeClean();
});

test('Companion preference changes apply immediately to bubbles, accessories, motion, size, and drag', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.goto('/research/ai-in-education');
  const root = page.locator(PET_ROOT);
  const controls = page.getByTestId('princess-controls');
  await expect(root).toHaveAttribute('data-companion-accessory', 'none');
  await expect(page.getByTestId('princess-route-bubble')).toBeVisible({ timeout: 2_000 });

  await controls.getByRole('button', { name: '開啟 Companion 設定' }).click();
  await controls.getByRole('switch', { name: '顯示配件' }).click();
  await expect(root).toHaveAttribute('data-companion-accessory', 'none');
  await controls.getByRole('switch', { name: '主動語境提示' }).click();
  await expect(page.getByTestId('princess-route-bubble')).toHaveCount(0);

  await controls.getByRole('radio', { name: '關閉動畫' }).check();
  await expect(root).toHaveAttribute('data-pet-motion-level', 'none');
  await controls.getByRole('slider', { name: '大小' }).fill('0.82');
  await expect(root).toHaveAttribute('data-pet-scale', '0.82');

  const button = page.getByTestId('princess-interactive');
  const before = await root.getAttribute('style');
  await controls.getByRole('switch', { name: '允許互動' }).click();
  await expect(button).toBeDisabled();
  const box = await root.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 40, box.y - 20);
  await page.mouse.up();
  await expect(root).toHaveAttribute('style', before);

  await page.waitForTimeout(250);
  await page.reload();
  await expect(root).toHaveAttribute('data-companion-accessory', 'none');
  await expect(root).toHaveAttribute('data-pet-motion-level', 'none');
  await expect(root).toHaveAttribute('data-pet-scale', '0.82');
  await expect(root).toHaveAttribute('data-pet-interaction', 'false');
  await expect(page.getByTestId('princess-route-bubble')).toHaveCount(0);
  assertRuntimeClean();
});

test('website events remain low-frequency when direct interaction and auto behavior are off', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.goto('/');
  await expectLoadedIdlePrincess(page);

  const controls = page.getByTestId('princess-controls');
  const root = page.locator(PET_ROOT);
  await controls.getByRole('button', { name: '開啟 Companion 設定' }).click();
  await controls.getByRole('switch', { name: '自動行為' }).click();
  await controls.getByRole('switch', { name: '允許互動' }).click();
  await page.keyboard.press('Escape');

  await page.getByTestId('module-card-research').getByRole('button').click();
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake');
  await expect(root).toHaveCount(1);

  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake');

  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(root).toHaveAttribute('data-pet-state', 'resting_awake');
  await expect(root).toHaveCount(1);
  assertRuntimeClean();
});

test('Companion controls reset position, size, and only Princess settings', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.goto('/');
  await expectLoadedIdlePrincess(page);

  const root = page.locator(PET_ROOT);
  const button = page.getByTestId('princess-interactive');
  const controls = page.getByTestId('princess-controls');
  const box = await button.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 52, box.y + box.height / 2 - 28, { steps: 3 });
  await page.mouse.up();
  const draggedTransform = await root.getAttribute('style');
  await button.dblclick();
  await expect(root).toHaveAttribute('data-pet-scale', '1.18');

  await controls.getByRole('button', { name: '開啟 Companion 設定' }).click();
  await controls.getByRole('button', { name: '恢復位置與大小' }).click();
  await expect(root).toHaveAttribute('data-pet-scale', '1.00');
  await expect(root).not.toHaveAttribute('style', draggedTransform);
  const resetRecord = JSON.parse(await page.evaluate(() => window.localStorage.getItem('nexaeon-princess-companion-preferences')));
  expect(resetRecord.position).toBeNull();
  expect(resetRecord.scale).toBe(1);
  await expect(controls.getByText('已恢復預設')).toBeVisible();

  await controls.getByRole('switch', { name: '允許互動' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await controls.getByRole('button', { name: '全部恢復預設' }).click();
  await expect(root).toHaveAttribute('data-pet-interaction', 'true');
  expect(JSON.parse(await page.evaluate(() => window.localStorage.getItem('nexaeon-princess-companion-preferences'))).interactionEnabled).toBe(true);
  assertRuntimeClean();
});

test('Companion controls localize and remain readable across theme changes', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Switch to English' }).click();
  const controls = page.getByTestId('princess-controls');
  await controls.getByRole('button', { name: 'Open Companion settings' }).click();
  await expect(controls.getByText('Automatic behavior')).toBeVisible();
  await expect(controls.getByText('Restore all defaults')).toBeVisible();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await controls.getByRole('button', { name: 'Companion 설정 열기' }).click();
  await expect(controls.getByText('자동 행동')).toBeVisible();
  await expect(controls.getByText('전체 기본값 복원')).toBeVisible();
  assertRuntimeClean();
});

test('Princess context follows routes without remounting, respects locale, Navigator input, mobile bounds, and sleeping priority', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.goto('/');
  const root = page.locator(PET_ROOT);
  await expect(root).toHaveAttribute('data-princess-context', 'home');
  await root.evaluate((node) => { node.dataset.contextMarker = 'same-context-princess'; });

  await page.evaluate(() => {
    window.history.pushState({}, '', '/research/ai-in-education');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(root).toHaveAttribute('data-princess-context', 'research');
  await expect(root).toHaveAttribute('data-context-marker', 'same-context-princess');

  await page.evaluate(() => {
    window.history.pushState({}, '', '/research/learning-analytics');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(root).toHaveAttribute('data-princess-context', 'research');
  await expect(root).toHaveAttribute('data-context-marker', 'same-context-princess');

  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(root).toHaveAttribute('data-princess-context', 'research');
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(root).toHaveAttribute('data-princess-context', 'research');

  await page.evaluate(() => {
    const preferences = JSON.parse(window.localStorage.getItem('nexaeon-princess-companion-preferences'));
    window.localStorage.setItem('nexaeon-princess-companion-preferences', JSON.stringify({ ...preferences, position: null }));
    window.history.pushState({}, '', '/identity/nexaeon-navigator');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(root).toHaveAttribute('data-princess-context', 'navigator');
  const inputBox = await page.locator('#navigator-agent-query').boundingBox();
  const petBox = await root.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(petBox).not.toBeNull();
  const overlapsInput = petBox.x < inputBox.x + inputBox.width
    && petBox.x + petBox.width > inputBox.x
    && petBox.y < inputBox.y + inputBox.height
    && petBox.y + petBox.height > inputBox.y;
  expect(overlapsInput).toBe(false);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => {
    const mobileBox = await root.boundingBox();
    return {
      leftSafe: mobileBox.x >= 0,
      topSafe: mobileBox.y >= 0,
      rightSafe: mobileBox.x + mobileBox.width <= 390,
      bottomSafe: mobileBox.y + mobileBox.height <= 844,
    };
  }).toEqual({ leftSafe: true, topSafe: true, rightSafe: true, bottomSafe: true });

  await page.addInitScript(() => {
    const now = Date.now();
    window.sessionStorage.setItem('nexaeon-princess-presence', JSON.stringify({
      version: 2,
      lastActivityAt: now - (30 * 60 * 1000),
      persistentState: 'sleeping',
      stateEnteredAt: now - (10 * 60 * 1000),
      hiddenAt: null,
      currentContextId: 'research',
      previousContextId: 'navigator',
      contextEnteredAt: now - (5 * 60 * 1000),
    }));
  });
  await page.goto('/research/ai-in-education');
  await expect(root).toHaveAttribute('data-pet-state', 'sleeping_prone');
  await expect(page.locator(PET_BUTTON)).toHaveAttribute('aria-label', '公主正趴著安靜睡覺');
  await expect(root.locator('img')).toHaveAttribute('src', /princess-module-pose-06\.png$/);
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(root).toHaveAttribute('data-princess-context', 'research');
  await expect(root).toHaveAttribute('data-pet-state', 'sleeping_prone');
  await expect(page.locator(PET_BUTTON)).toHaveAttribute('aria-label', 'Princess sleeping peacefully');
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(root).toHaveAttribute('data-pet-state', 'sleeping_prone');
  await expect(page.locator(PET_BUTTON)).toHaveAttribute('aria-label', '공주가 편안하게 엎드려 자고 있음');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(root).toHaveAttribute('data-pet-state', 'sleeping_prone');
  await page.evaluate(() => {
    window.history.pushState({}, '', '/research/learning-analytics');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(root).toHaveAttribute('data-princess-context', 'research');
  await expect(root).toHaveAttribute('data-pet-state', /standing_attentive|curious/);
  await expect(root).toHaveAttribute('data-pet-state', 'standing_attentive', { timeout: 3_000 });
  assertRuntimeClean();
});

test('reduced motion keeps prone sleep visible without breathing animation', async ({ page }) => {
  const assertRuntimeClean = watchRuntimeErrors(page);
  await page.addInitScript(() => {
    const now = Date.now();
    window.sessionStorage.setItem('nexaeon-princess-presence', JSON.stringify({
      version: 2,
      lastActivityAt: now - (30 * 60 * 1000),
      persistentState: 'sleeping',
      stateEnteredAt: now - (10 * 60 * 1000),
      hiddenAt: null,
      currentContextId: 'research',
      previousContextId: 'navigator',
      contextEnteredAt: now - (10 * 60 * 1000),
    }));
  });

  await page.goto('/research/ai-in-education');
  const root = page.locator(PET_ROOT);
  await expect(root).toHaveAttribute('data-pet-state', 'sleeping_prone');
  await expect(root.locator('img')).toHaveAttribute('src', /princess-module-pose-06\.png$/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(root).toHaveAttribute('data-pet-state', 'sleeping_prone');
  await expect.poll(() => root.locator('[class*="aliveLayer"]').evaluate((node) => getComputedStyle(node).animationName))
    .toBe('none');
  assertRuntimeClean();
});
