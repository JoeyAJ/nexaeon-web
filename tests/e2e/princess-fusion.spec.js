import { expect, test } from '@playwright/test';

const PET = '[data-pet-state]';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.sessionStorage.setItem('nexaeon_intro_seen', 'true');
  });
});

async function openNavigator(page) {
  await page.goto('/identity/nexaeon-navigator');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.locator(PET)).not.toHaveAttribute('data-pet-state', /curious|happy|wave/, { timeout: 5_000 });
  await page.evaluate(() => {
    window.__fusionPetStates = [];
    const pet = document.querySelector('[data-pet-state]');
    window.__fusionObserver = new MutationObserver(() => window.__fusionPetStates.push(pet?.getAttribute('data-pet-state')));
    window.__fusionObserver.observe(pet, { attributes: true, attributeFilter: ['data-pet-state'] });
  });
}

async function submit(page, query = 'fusion test') {
  await page.locator('#navigator-agent-query').fill(query);
  await page.getByRole('button', { name: 'Send' }).click();
}

function responsePayload(overrides = {}) {
  return {
    answer: 'Grounded answer [S1]', mode: 'ai', reason: '', citations: [], suggestedQuestions: [], partialSources: false,
    ...overrides,
  };
}

test('valid submit produces one listening reaction and one resolved reaction without retrieval flicker', async ({ page }) => {
  await page.route('**/api/agent/chat', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_250));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responsePayload({ answer: 'Grounded answer' })) });
  });
  await openNavigator(page);
  await submit(page);
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'curious');
  await expect(page.getByText('Grounded answer', { exact: true })).toBeVisible();
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'happy');
  await expect(page.locator(PET)).not.toHaveAttribute('data-pet-state', /curious|happy|wave|quiet/, { timeout: 5_000 });
  const states = await page.evaluate(() => window.__fusionPetStates);
  expect(states.filter((state) => state === 'curious')).toHaveLength(1);
  expect(states.filter((state) => state === 'happy')).toHaveLength(1);
});

test('citation availability is passive and a real citation open acknowledges once', async ({ page }) => {
  const citation = {
    sourceId: 'S1', title: 'Safe source', localizedTitle: 'Safe source', summary: 'Summary', localizedSummary: 'Summary',
    moduleLabel: 'Research', localizedModuleLabel: 'Research', sourceRoute: '/research/research-literature-database',
  };
  await page.route('**/api/agent/chat', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_250));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responsePayload({ citations: [citation] })) });
  });
  await openNavigator(page);
  await submit(page);
  await expect(page.getByRole('button', { name: 'Jump to source S1' })).toBeVisible();
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'happy');
  await expect(page.locator(PET)).not.toHaveAttribute('data-pet-state', /curious|happy|wave|quiet/, { timeout: 5_000 });
  const beforeOpen = await page.evaluate(() => window.__fusionPetStates.length);
  await page.getByRole('button', { name: 'Jump to source S1' }).click();
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'wave');
  await expect(page.locator(PET)).not.toHaveAttribute('data-pet-state', /curious|happy|wave|quiet/, { timeout: 5_000 });
  await page.getByRole('button', { name: 'Jump to source S1' }).click();
  await page.waitForTimeout(300);
  const afterStates = await page.evaluate((start) => window.__fusionPetStates.slice(start), beforeOpen);
  expect(afterStates.filter((state) => state === 'wave')).toHaveLength(1);
});

test('clarification, uncertainty, and unavailable results stay distinct', async ({ page }) => {
  const cases = [
    [responsePayload({ answer: '', mode: 'sources_only', reason: 'moderated' }), 'curious'],
    [responsePayload({ answer: '', mode: 'sources_only', reason: 'no_sources' }), 'quiet'],
    [responsePayload({ answer: '', mode: 'sources_only', reason: 'model_unavailable' }), 'quiet'],
  ];
  let index = 0;
  await page.route('**/api/agent/chat', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_250));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cases[index++][0]) });
  });
  await openNavigator(page);
  for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
    await submit(page, `case-${caseIndex}`);
    await expect(page.locator(PET)).toHaveAttribute('data-pet-state', cases[caseIndex][1], { timeout: 5_000 });
    await expect(page.locator(PET)).not.toHaveAttribute('data-pet-state', /curious|happy|wave|quiet/, { timeout: 5_000 });
  }
});

test('abort blocks late success and remains stable on mobile across locales', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/agent/chat', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responsePayload({ answer: 'Must not appear' })) });
  });
  await openNavigator(page);
  await submit(page);
  await expect(page.locator(PET)).toHaveAttribute('data-pet-state', 'curious');
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByText('Must not appear')).toHaveCount(0);
  await page.waitForTimeout(2_200);
  const states = await page.evaluate(() => window.__fusionPetStates);
  expect(states).not.toContain('happy');
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await page.getByRole('button', { name: '切換為繁體中文' }).click();
  await expect(page.locator(PET)).toHaveCount(1);
});

test('Navigator navigation, module activity, Fusion resolved, and route change collapse to one reaction', async ({ page }) => {
  const citation = {
    sourceId: 'S1', title: 'Safe source', localizedTitle: 'Safe source', summary: 'Summary', localizedSummary: 'Summary',
    moduleLabel: 'Research', localizedModuleLabel: 'Research', sourceRoute: '/research/research-literature-database',
  };
  await page.route('**/api/agent/chat', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_250));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responsePayload({ citations: [citation] })) });
  });
  await openNavigator(page);
  await submit(page);
  await expect(page.getByRole('button', { name: 'View source' })).toBeVisible();
  await expect(page.locator(PET)).not.toHaveAttribute('data-pet-state', /curious|happy|wave|quiet/, { timeout: 5_000 });
  await page.evaluate(() => { window.__fusionPetStates = []; });
  await page.getByRole('button', { name: 'View source' }).click();
  await expect(page).toHaveURL(/\/research\/research-literature-database$/);
  await expect(page.locator(PET)).not.toHaveAttribute('data-pet-state', /curious|happy|wave|quiet/, { timeout: 5_000 });
  const reactions = await page.evaluate(() => window.__fusionPetStates.filter((state) => ['curious', 'happy', 'wave', 'quiet'].includes(state)));
  expect(reactions.length).toBeLessThanOrEqual(1);
});
