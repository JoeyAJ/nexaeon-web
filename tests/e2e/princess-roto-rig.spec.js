import { expect, test } from '@playwright/test';

const routes = ['/', '/#identity', '/#research', '/#teaching', '/#knowledge-lab', '/#projects', '/#field-lab', '/identity/nexaeon-navigator'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

for (const route of routes) {
  test(`${route} uses the uploaded complete Princess without overflow`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    const pet = page.locator('[data-pet-state]');
    await expect(pet.locator('[data-testid="princess-roto-rig"]')).toHaveCount(0);
    await expect(pet.locator('button img')).toHaveCount(1);
    await expect(pet.locator('button img')).toHaveAttribute('src', /\/images\/princess\/princess-active\.png$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    if (route === '/') {
      await page.screenshot({ path: testInfo.outputPath('home-mobile-whole-image.png'), fullPage: true });
      await pet.screenshot({ path: testInfo.outputPath('home-mobile-whole-image-closeup.png') });
    }
  });
}

test('intro keeps the blue-dress Princess through its active handoff', async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.removeItem('nexaeon_intro_seen'));
  await page.goto('/');
  const pet = page.locator('[data-princess-intro-phase]');
  const image = pet.locator('button img');
  await expect(pet.locator('[data-testid="princess-roto-rig"]')).toHaveCount(0);
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute('src', /\/pet\/princess\/frames\/frame-001\.png$/);
  await expect(pet).toHaveAttribute('data-princess-intro-phase', 'active', { timeout: 15_000 });
  await expect(image).toHaveAttribute('src', /\/images\/princess\/princess-active\.png$/);
});

test('motion preferences and accessory remain bound to the complete frame', async ({ page }) => {
  await page.goto('/#teaching');
  const root = page.locator('[data-pet-state]');
  await expect(root).toHaveAttribute('data-companion-accessory', 'academic-cap');
  await expect(root.locator('[data-testid="princess-accessory-academic-cap"]')).toHaveCount(1);
  await expect(root.locator('button > [data-testid="princess-accessory-academic-cap"]')).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(root).toHaveAttribute('data-pet-motion-level', 'reduced');
});
