import { expect, test } from '@playwright/test';

const profiles = [
  { key: 'home', route: '/', image: '02', accessory: 'none' },
  { key: 'identity', route: '/identity/profile', image: '01', accessory: 'none' },
  { key: 'research', route: '/research/topic', image: '06', accessory: 'none' },
  { key: 'coaching', route: '/teaching/course', image: '04', accessory: 'academic-cap' },
  { key: 'knowledge', route: '/knowledge-lab/resource', image: '08', accessory: 'none' },
  { key: 'prototype', route: '/projects/demo', image: '07', accessory: 'none' },
  { key: 'action', route: '/field-lab/action', image: '03', accessory: 'none' },
  { key: 'navigator', route: '/identity/nexaeon-navigator', image: '05', accessory: 'none' },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('nexaeon_intro_seen', 'true');
    sessionStorage.setItem('nexaeon_companion_intro_docked', 'true');
    sessionStorage.removeItem('nexaeon-princess-presence');
  });
});

test('all module profiles preserve their matched image through hover, click, inactivity, and return', async ({ page }) => {
  for (const profile of profiles) {
    await page.goto(profile.route);
    const pet = page.locator('[data-companion-module]');
    const button = pet.getByTestId('princess-interactive');
    const image = pet.locator('img');
    const imagePattern = new RegExp(`princess-module-pose-${profile.image}\\.png$`);

    await expect(pet).toHaveAttribute('data-companion-module', profile.key);
    await expect(pet).toHaveAttribute('data-companion-accessory', profile.accessory);
    await expect(image).toHaveAttribute('src', imagePattern);
    await pet.screenshot({ path: `test-results/profile-${profile.key}.png` });

    await button.dispatchEvent('pointerover');
    await expect(image).toHaveAttribute('src', imagePattern);
    await expect(pet).toHaveAttribute('data-companion-accessory', profile.accessory);
    await button.dispatchEvent('pointerout');

    await button.click({ force: true });
    await expect(pet).toHaveAttribute('data-pet-state', /wave|sitting_smile/);
    await expect(image).toHaveAttribute('src', imagePattern);
    await expect(pet).toHaveAttribute('data-companion-accessory', profile.accessory);

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexaeon:companion-behavior', {
      detail: { type: 'error', duration: 4_000 },
    })));
    await expect(pet).toHaveAttribute('data-pet-state', 'quiet');
    await expect(image).toHaveAttribute('src', imagePattern);
    await expect(pet).toHaveAttribute('data-companion-accessory', 'none');

    await page.goto('/unknown-route');
    await page.goto(profile.route);
    await expect(image).toHaveAttribute('src', imagePattern);
    await expect(pet).toHaveAttribute('data-companion-accessory', profile.accessory);
  }
});
