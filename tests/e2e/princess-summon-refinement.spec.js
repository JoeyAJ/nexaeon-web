import { expect, test } from '@playwright/test';

test('summon phases apply a short violet-blue bloom and recover the normal Princess color', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const pet = page.locator('[data-princess-intro-phase]');
  const frame = pet.locator('[class*="frameLayer"]');
  await pet.waitFor();
  await page.waitForTimeout(100);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexaeon:companion-intro', {
    detail: { phase: 'materializing', materializeProgress: 0.62, emergenceProgress: 0 },
  })));
  await pet.evaluate((node) => node.style.setProperty('--princess-intro-materialize', '0.62'));
  await expect.poll(() => frame.evaluate((node) => {
    const phase = node.closest('[data-princess-intro-phase]')?.getAttribute('data-princess-intro-phase');
    return phase === 'materializing'
      && getComputedStyle(node).filter.includes('drop-shadow')
      && getComputedStyle(node, '::before').backgroundImage.includes('radial-gradient')
      && Number.parseFloat(getComputedStyle(node, '::before').opacity) > 0.25;
  })).toBe(true);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexaeon:companion-intro', {
    detail: { phase: 'emerging', materializeProgress: 1, emergenceProgress: 0.45 },
  })));
  await expect.poll(() => frame.evaluate((node) => (
    node.closest('[data-princess-intro-phase]')?.getAttribute('data-princess-intro-phase') === 'emerging'
    && getComputedStyle(node).filter.includes('drop-shadow')
  ))).toBe(true);

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
