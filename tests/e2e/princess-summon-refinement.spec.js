import { expect, test } from '@playwright/test';

test('summon phases apply a short violet-blue bloom and recover the normal Princess color', async ({ page }) => {
  await page.goto('/');
  const pet = page.locator('[data-princess-intro-phase]');
  const frame = pet.locator('[class*="frameLayer"]');

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexaeon:companion-intro', {
    detail: { phase: 'materializing', materializeProgress: 0.62, emergenceProgress: 0 },
  })));
  await expect(pet).toHaveAttribute('data-princess-intro-phase', 'materializing');
  await pet.evaluate((node) => node.style.setProperty('--princess-intro-materialize', '0.62'));
  const materializing = await frame.evaluate((node) => ({
    filter: getComputedStyle(node).filter,
    haloBackground: getComputedStyle(node, '::before').backgroundImage,
    haloOpacity: Number(getComputedStyle(node, '::before').opacity),
  }));
  expect(materializing.filter).toContain('drop-shadow');
  expect(materializing.haloBackground).toContain('radial-gradient');
  expect(materializing.haloOpacity).toBeGreaterThan(0.25);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexaeon:companion-intro', {
    detail: { phase: 'emerging', materializeProgress: 1, emergenceProgress: 0.45 },
  })));
  await expect(pet).toHaveAttribute('data-princess-intro-phase', 'emerging');
  await expect.poll(() => frame.evaluate((node) => getComputedStyle(node).filter)).toContain('drop-shadow');

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexaeon:companion-intro', {
    detail: { phase: 'active', materializeProgress: 1, emergenceProgress: 1 },
  })));
  await expect(pet).toHaveAttribute('data-princess-intro-phase', 'active');
  await expect.poll(() => frame.evaluate((node) => getComputedStyle(node).filter)).toBe('none');
});

test('summon refinement remains bounded and reduced-motion safe on mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto('/');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexaeon:companion-intro', {
    detail: { phase: 'emerging', materializeProgress: 1, emergenceProgress: 0.5, reducedMotion: true },
  })));
  const metrics = await page.locator('[data-princess-intro-phase]').evaluate((node) => ({
    animation: getComputedStyle(node.querySelector('[class*="frameLayer"]')).animationName,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(metrics.animation).toBe('none');
  expect(metrics.overflow).toBe(0);
});
