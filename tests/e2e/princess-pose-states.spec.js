import { expect, test } from '@playwright/test';

const expectedStates = {
  resting_awake: /frame-001\.png$/,
  standing_attentive: /frame-001\.png$/,
  sitting_smile: /frame-001\.png$/,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  for (const [state, imagePattern] of Object.entries(expectedStates)) {
    test(`${state} renders as a contained transparent asset at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/?princessState=${state}`);
      const root = page.locator('[data-pet-state]');
      const image = root.locator('img');
      await expect(root).toHaveAttribute('data-pet-state', state);
      await expect(root).toHaveAttribute('data-pet-debug-state', state);
      await expect(root).toBeInViewport();
      await expect(image).toHaveAttribute('src', imagePattern);
      await expect(image).toHaveCSS('object-fit', 'contain');
      await expect.poll(() => image.evaluate((node) => ({
        complete: node.complete,
        width: node.naturalWidth,
        height: node.naturalHeight,
      }))).toMatchObject({ complete: true });
      const rootBox = await root.boundingBox();
      expect(rootBox).not.toBeNull();
      expect(rootBox.x).toBeGreaterThanOrEqual(0);
      expect(rootBox.y).toBeGreaterThanOrEqual(0);
      expect(rootBox.x + rootBox.width).toBeLessThanOrEqual(viewport.width);
      expect(rootBox.y + rootBox.height).toBeLessThanOrEqual(viewport.height);
    });
  }
}
