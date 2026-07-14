import { expect, test } from '@playwright/test';

const PET = '[data-pet-state]';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('nexaeon_intro_seen', 'true');
  });
});

async function expectSittingSmile(page, ariaLabel) {
  const root = page.locator(PET);
  const image = root.locator('img');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-pet-state', 'sitting_smile');
  await expect(root.getByRole('button')).toHaveAttribute('aria-label', ariaLabel);
  await expect(image).toHaveAttribute('src', /princess-active\.png$/);
  await expect.poll(() => image.evaluate((node) => ({
    complete: node.complete,
    width: node.naturalWidth,
    height: node.naturalHeight,
  }))).toMatchObject({ complete: true });
  return root;
}

test('sitting smile renders on desktop light mode, survives scrolling, and yields to route activity', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'resting_awake');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexaeon:pet-sitting-smile')));
  const root = await expectSittingSmile(page, '公主正坐著微笑陪伴你');
  await expect.poll(() => root.locator('[class*="wholeImageMotionLayer"]').evaluate(
    (node) => getComputedStyle(node).animationName,
  )).toMatch(/princess-sitting-smile-breathe/);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(root).toHaveAttribute('data-pet-state', 'sitting_smile');
  await expect(root).toBeInViewport();
  await page.screenshot({ path: 'test-results/sitting-smile-desktop-light.png' });

  await page.goto('/research');
  await expect(page.locator(PET)).toHaveAttribute('data-princess-context', 'research');
  await expect(page.locator(PET)).toBeVisible();
  expect(errors).toEqual([]);
});

test('sitting smile renders on mobile dark mode and disables breathing motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexaeon:pet-sitting-smile')));
  const root = await expectSittingSmile(page, '公主正坐著微笑陪伴你');
  await expect.poll(() => root.locator('[class*="wholeImageMotionLayer"]').evaluate(
    (node) => getComputedStyle(node).animationName,
  )).toBe('none');
  await expect(root).toBeInViewport();
  await page.screenshot({ path: 'test-results/sitting-smile-mobile-dark-reduced.png' });
});
