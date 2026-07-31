import { expect, test } from '@playwright/test';
import { createApiResponse } from '../../api/_response.js';
import { getLocalizedSite } from '../../src/lib/contentSource.js';
import { hasUnsafeInternalKey } from '../../scripts/verify-production.mjs';

const EXPECTED_MODULE_LABELS = [
  'Identity',
  'Research',
  'Learning Coaching',
  'Knowledge System',
  'MVP & Practice Projects',
  'Field Experiment',
];

const EXPECTED_MODULE_AGENTS = {
  identity: ['NexAeon Networker'],
  research: ['NexAeon Explorer'],
  teaching: ['NexAeon Xchange'],
  'knowledge-lab': ['NexAeon Archivist'],
  projects: ['NexAeon Engineer'],
  'field-lab': ['NexAeon Orchestrator'],
};

const EXPECTED_AGENT_SYSTEM_MAP_AGENTS = [
  'NexAeon Navigator',
  'NexAeon Explorer',
  'NexAeon Xchange',
  'NexAeon Archivist',
  'NexAeon Engineer',
  'NexAeon Orchestrator',
  'NexAeon Networker',
];

const DATA_PAGE_ROUTES = [
  { name: 'Identity', path: '/identity/identity-profiles', cardSelector: '.identity-profile-card', search: 'input[type="search"]' },
  { name: 'Research', path: '/research/research-literature-database', cardSelector: '.literature-compact-card', search: 'input[type="search"]' },
  { name: 'Learning Coaching', path: '/teaching/teaching-courses', cardSelector: '.teaching-compact-card', search: 'input[type="search"]' },
  { name: 'Knowledge System', path: '/knowledge-lab/knowledge-resources', cardSelector: '.knowledge-compact-card', search: 'input[type="search"]' },
  { name: 'MVP & Practice Projects', path: '/projects/module-demos', cardSelector: '.mvp-compact-card', search: 'input[type="search"]' },
  { name: 'Field Experiment', path: '/field-lab/action-projects', cardSelector: '.action-project-card', search: 'input[type="search"]' },
  { name: 'Collaboration', path: '/field-lab/future-collaboration-context', cardSelector: '.collaboration-context-card', search: 'input[type="search"]' },
];

const API_ENDPOINTS = [
  '/api/identity/profiles',
  '/api/research/literature',
  '/api/teaching/courses',
  '/api/knowledge/resources',
  '/api/modules/demos',
  '/api/action/projects',
  '/api/collaboration/options',
];

const ALLOWED_SOURCES = new Set(['notion', 'airtable', 'fallback']);
const ALLOWED_REASONS = new Set([null, 'missing_env', 'upstream_timeout', 'upstream_failed', 'partial_source_failure']);
const SENSITIVE_KEYS = new Set([
  'notes',
  'owner',
  'blockers',
  'visibility',
  'public status',
  '公開狀態',
  'email',
  'contact name',
  'need/request',
  'need',
  'request',
]);

function collectObjectKeys(value, keys = []) {
  if (!value || typeof value !== 'object') return keys;
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjectKeys(item, keys));
    return keys;
  }

  Object.keys(value).forEach((key) => {
    keys.push(key);
    collectObjectKeys(value[key], keys);
  });
  return keys;
}

function getRuntimeWatcher(page) {
  const errors = [];

  page.on('pageerror', (error) => {
    errors.push(`pageerror:${error.name || 'Error'}`);
  });

  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error') errors.push(`console.error:${text}`);
    if (
      message.type() === 'warning'
      && /(duplicate key|hydration|state update on an unmounted|react)/i.test(text)
    ) {
      errors.push(`console.warning:${text}`);
    }
  });

  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.startsWith('data:')) return;
    if (request.resourceType() === 'media') return;
    if (request.failure()?.errorText?.includes('ERR_ABORTED')) return;
    errors.push(`requestfailed:${request.method()} ${url}`);
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 500) errors.push(`http:${status} ${response.url()}`);
  });

  return {
    assertClean() {
      expect(errors, errors.join('\n')).toEqual([]);
    },
  };
}

async function resetBrowserState(page) {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
}

async function gotoAndSetEnglish(page, path = '/') {
  await page.goto(path);
  await page.getByRole('button', { name: 'Switch to English' }).click();
}

async function expectUsableButtons(page) {
  const emptyButtons = await page.locator('button').evaluateAll((buttons) => (
    buttons
      .map((button) => ({
        text: button.innerText.trim(),
        label: button.getAttribute('aria-label') || button.getAttribute('title') || '',
      }))
      .filter((button) => !button.text && !button.label)
  ));

  expect(emptyButtons).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await resetBrowserState(page);
});

test('home loads, localizes, toggles theme, and keeps module order', async ({ page }) => {
  const watcher = getRuntimeWatcher(page);
  await gotoAndSetEnglish(page);

  await expect(page.getByRole('heading', { name: 'NexAeon', level: 1 })).toBeVisible();
  await expect(page.getByAltText('NexAeon').first()).toBeVisible();

  const moduleLabels = await page.locator('.module-card-kicker').evaluateAll((nodes) => (
    nodes.map((node) => node.textContent.trim())
  ));
  expect(moduleLabels).toEqual(EXPECTED_MODULE_LABELS);

  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: '切換為繁體中文' }).click();
  await expect(page.getByRole('button', { name: '切換為繁體中文' })).toBeVisible();
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.getByText('정체성').first()).toBeVisible();
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByText('Identity').first()).toBeVisible();

  const backToTop = page.getByRole('button', { name: 'Back to top' });
  await expect(backToTop).toBeVisible();
  await backToTop.click();

  await expectUsableButtons(page);
  watcher.assertClean();
});

test('module navigation, browser back, direct refresh, and intro replay guard', async ({ page }) => {
  const watcher = getRuntimeWatcher(page);
  let chatPostCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/agent/chat')) chatPostCount += 1;
  });

  await gotoAndSetEnglish(page);

  for (const label of EXPECTED_MODULE_LABELS) {
    const module = getLocalizedSite('en').modules.find((item) => item.label === label);
    await page.getByTestId(`module-card-${module.id}`).locator('.module-card-footer button').click();
    await expect(page).toHaveURL(new RegExp(`#${module.id}$`));
    await expect(page.getByTestId(`module-entry-${module.items[0].id}`)).toBeVisible();
    await expect(page.getByTestId(`module-agent-section-${module.id}`)).toBeVisible();
    for (const agentName of EXPECTED_MODULE_AGENTS[module.id]) {
      await expect(page.getByTestId(`module-agent-section-${module.id}`).getByText(agentName, { exact: true })).toBeVisible();
    }
    const agentId = {
      identity: 'networker',
      research: 'explorer',
      teaching: 'xchange',
      'knowledge-lab': 'archivist',
      projects: 'engineer',
      'field-lab': 'orchestrator',
    }[module.id];
    if (module.id === 'identity') {
      await expect(page.getByTestId('module-agent-entry-networker')).toContainText('Networker Active');
      await expect(page.getByTestId('module-agent-entry-networker')).toContainText('read-only Identity Tools');
    } else if (module.id === 'research') {
      await expect(page.getByTestId('module-agent-entry-explorer')).toContainText('Explorer Active');
      await expect(page.getByTestId('module-agent-entry-explorer')).toContainText('read-only Research Tools');
    } else if (module.id === 'teaching') {
      await expect(page.getByTestId('module-agent-entry-xchange')).toContainText('Xchange Active');
      await expect(page.getByTestId('module-agent-entry-xchange')).toContainText('read-only Learning Tools');
    } else if (module.id === 'knowledge-lab') {
      await expect(page.getByTestId('module-agent-entry-archivist')).toContainText('Archivist Active');
      await expect(page.getByTestId('module-agent-entry-archivist')).toContainText('read-only Knowledge Tools');
    } else if (module.id === 'projects') {
      await expect(page.getByTestId('module-agent-entry-engineer')).toContainText('Engineer Active');
      await expect(page.getByTestId('module-agent-entry-engineer')).toContainText('read-only Prototype Tools');
    } else if (module.id === 'field-lab') {
      await expect(page.getByTestId('module-agent-entry-orchestrator')).toContainText('Orchestrator Active');
      await expect(page.getByTestId('module-agent-entry-orchestrator')).toContainText('explicit server-verified confirmation');
    } else {
      await expect(page.getByTestId(`module-agent-entry-${agentId}`)).toContainText('Connected to Navigator');
      await expect(page.getByTestId(`module-agent-entry-${agentId}`)).toContainText('Its dedicated Agent is still under development.');
    }
  }

  await page.getByTestId('module-card-identity').locator('.module-card-footer button').click();
  await page.getByTestId('module-agent-entry-networker').getByRole('button', { name: 'Use Networker' }).click();
  await expect(page).toHaveURL(/\/identity\/nexaeon-networker$/);
  await expect(page.getByTestId('networker-agent-page')).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/identity\/nexaeon-networker$/);

  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByTestId('module-card-research').locator('.module-card-footer button').click();
  await page.getByTestId('module-agent-entry-explorer').getByRole('button', { name: 'Use Explorer' }).click();
  await expect(page).toHaveURL(/\/research\/nexaeon-explorer$/);
  await expect(page.getByTestId('explorer-agent-page')).toBeVisible();
  await expect(page.locator('#explorer-agent-query')).toBeEnabled();
  expect(chatPostCount).toBe(0);

  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByTestId('module-card-teaching').locator('.module-card-footer button').click();
  await page.getByTestId('module-agent-entry-xchange').getByRole('button', { name: 'Use Xchange' }).click();
  await expect(page).toHaveURL(/\/teaching\/nexaeon-xchange$/);
  await expect(page.getByTestId('xchange-agent-page')).toBeVisible();
  await expect(page.locator('#xchange-agent-query')).toBeEnabled();

  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByTestId('module-card-knowledge-lab').locator('.module-card-footer button').click();
  await page.getByTestId('module-agent-entry-archivist').getByRole('button', { name: 'Use Archivist' }).click();
  await expect(page).toHaveURL(/\/knowledge-lab\/nexaeon-archivist$/);
  await expect(page.getByTestId('archivist-agent-page')).toBeVisible();
  await expect(page.locator('#archivist-agent-query')).toBeEnabled();

  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('module-card-projects').locator('.module-card-footer button').click();
  await expect(page.getByTestId('module-agent-entry-engineer')).toBeVisible();
  await page.getByTestId('module-agent-entry-engineer').getByRole('button', { name: 'Use Engineer' }).click();
  await expect(page).toHaveURL(/\/projects\/nexaeon-engineer$/);
  await expect(page.getByTestId('engineer-agent-page')).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);

  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByTestId('module-card-field-lab').locator('.module-card-footer button').click();
  await page.getByTestId('module-agent-entry-orchestrator').getByRole('button', { name: 'Use Orchestrator' }).click();
  await expect(page).toHaveURL(/\/field-lab\/nexaeon-orchestrator$/);
  await expect(page.getByTestId('orchestrator-agent-page')).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/field-lab\/nexaeon-orchestrator$/);
  await expect(page.getByRole('heading', { name: 'NexAeon Orchestrator', level: 1 })).toBeVisible();

  await page.goBack();
  await expect(page).not.toHaveURL(/\/field-lab\/action-projects$/);

  await page.goto('/field-lab/action-projects');
  await page.getByRole('button', { name: /Back to home|返回首頁|홈으로 돌아가기/ }).first().click();
  await expect(page).toHaveURL(/\/$/);
  const introSeen = await page.evaluate(() => window.sessionStorage.getItem('nexaeon_intro_seen'));
  expect(introSeen).toBe('true');

  watcher.assertClean();
});

test('data pages support controls without fake initial fallback', async ({ page }) => {
  for (const route of DATA_PAGE_ROUTES) {
    const watcher = getRuntimeWatcher(page);
    await gotoAndSetEnglish(page, route.path);

    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Loading public data');
    if (await page.getByText('FALLBACK ACTIVE').count()) {
      await expect(page.locator('.resource-state-notice[data-state="fallback"]').first()).toBeVisible();
    }

    const search = page.locator(route.search).first();
    if (await search.count()) {
      await expect(search).toBeVisible();
      await search.fill('nexaeon-smoke');
      await search.fill('');
    }

    const select = page.locator('select').first();
    if (await select.count()) {
      const value = await select.locator('option').nth(0).getAttribute('value');
      await select.selectOption(value || '');
    }

    const filterButton = page.locator('button').filter({ hasText: /All|全部|전체/ }).first();
    if (await filterButton.count()) await filterButton.click();

    const cards = page.locator(route.cardSelector);
    if (await cards.count()) {
      const expand = cards.first().getByRole('button', { name: /Expand|展開|펼치기/i }).first();
      if (await expand.count()) await expand.click();
    } else {
      await expect(page.locator('.resource-state-notice, .mvp-empty-state, .literature-empty-state, .teaching-empty-state, .knowledge-empty-state, .action-empty-state, .collaboration-empty-state, .identity-empty-state').first()).toBeVisible();
    }

    if (route.name === 'Knowledge System' && await page.locator('.resource-state-notice[data-state="partial"]').count()) {
      await expect(page.locator(route.cardSelector).first()).toBeVisible();
    }

    watcher.assertClean();
  }
});

test('demo showcase renders multilingual Airtable fixture without language bleed', async ({ page }) => {
  const watcher = getRuntimeWatcher(page);

  await gotoAndSetEnglish(page, '/projects/module-demos');
  const firstCard = page.locator('.mvp-compact-card').filter({ hasText: 'Learning Demo' });
  const secondCard = page.locator('.mvp-compact-card').filter({ hasText: 'Data Bridge Demo' });

  await expect(firstCard).toBeVisible();
  await expect(firstCard).toContainText('English summary');
  await expect(firstCard).toContainText('v0.4');
  await expect(firstCard).toContainText('Featured');
  await expect(firstCard.getByRole('img', { name: 'demo-cover.png' })).toBeVisible();
  await expect(secondCard.locator('.mvp-cover-placeholder')).toBeVisible();
  await expect(firstCard.getByRole('link', { name: 'Open Demo' })).toHaveCount(1);
  await expect(firstCard.getByRole('link', { name: 'View Code' })).toHaveCount(1);
  await expect(secondCard.getByRole('link', { name: 'Open Demo' })).toHaveCount(0);
  await expect(secondCard).toContainText('Demo access is not available yet');
  await expect(secondCard.getByRole('link', { name: 'View Code' })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Archived Demo');

  await firstCard.getByRole('button', { name: 'Expand details' }).click();
  await expect(firstCard).toContainText('English problem');
  await expect(firstCard).toContainText('English solution');
  await expect(firstCard).toContainText('Diagnose learning issues');
  await expect(firstCard.getByRole('link', { name: 'Open research link' })).toHaveAttribute('href', 'https://example.com/research');
  await expect(page.locator('body')).not.toContainText('繁中摘要');
  await expect(page.locator('body')).not.toContainText('한국어 요약');
  await expect(page.locator('body')).not.toContainText('Visibility');
  await expect(page.locator('body')).not.toContainText('Notes');

  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.locator('.mvp-compact-card').filter({ hasText: '학습 데모' })).toBeVisible();
  await expect(page.locator('.mvp-compact-card').filter({ hasText: '데이터 브리지 Demo' })).toContainText('Demo는 아직 실행할 수 없습니다');
  await expect(page.locator('body')).not.toContainText('繁中摘要');
  await expect(page.locator('body')).not.toContainText('English summary');
  await expect(page.locator('body')).not.toContainText('Data Bridge Demo');

  await page.getByRole('button', { name: '切換為繁體中文' }).click();
  await expect(page.locator('.mvp-compact-card').filter({ hasText: '資料橋接展示' })).toContainText('Demo 尚未開放操作');
  await page.reload();
  await expect(page.locator('.mvp-compact-card').filter({ hasText: '資料橋接展示' })).toBeVisible();

  watcher.assertClean();
});

test('demo runtime launch modes, iframe safeguards, localization, theme, mobile, and back stack', async ({ page, context }) => {
  await gotoAndSetEnglish(page, '/projects/module-demos');

  const externalCard = page.locator('.mvp-compact-card').filter({ hasText: 'Learning Demo' });
  const [externalPage] = await Promise.all([
    context.waitForEvent('page'),
    externalCard.getByRole('link', { name: 'Open Demo' }).click(),
  ]);
  await externalPage.waitForLoadState('domcontentloaded');
  expect(externalPage.url()).toContain('/runtime-fixtures/external-demo.html');
  await externalPage.close();

  const invalidCard = page.locator('.mvp-compact-card').filter({ hasText: 'Invalid URL Demo' });
  await expect(invalidCard).toBeVisible();
  await expect(invalidCard.getByRole('link', { name: 'Open Demo' })).toHaveCount(0);
  await expect(invalidCard.getByRole('button', { name: 'Open Demo' })).toHaveCount(0);

  const embeddedCard = page.locator('.mvp-compact-card').filter({ hasText: 'Embedded Demo' });
  await embeddedCard.getByRole('button', { name: 'View in NexAeon' }).click();
  await expect(page).toHaveURL(/\/projects\/module-demos\/embedded-demo$/);
  await expect(page.getByRole('heading', { name: 'Embedded Demo', level: 1 })).toBeVisible();
  await expect(page.locator('main')).toContainText('Embedded English summary');

  const iframe = page.locator('iframe.demo-runtime-iframe');
  await expect(iframe).toHaveAttribute('title', 'Embedded Demo');
  await expect(iframe).toHaveAttribute('loading', 'lazy');
  await expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  const sandbox = await iframe.getAttribute('sandbox');
  expect(sandbox).toContain('allow-scripts');
  expect(sandbox).toContain('allow-same-origin');
  expect(sandbox).toContain('allow-forms');
  expect(sandbox).toContain('allow-popups');
  expect(sandbox).toContain('allow-downloads');
  expect(sandbox).not.toContain('allow-top-navigation');
  await expect(page.getByRole('link', { name: 'Open in new tab' }).first()).toHaveAttribute('target', '_blank');

  await page.reload();
  await expect(page).toHaveURL(/\/projects\/module-demos\/embedded-demo$/);
  await expect(page.getByTestId('demo-runtime-page')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/projects\/module-demos$/);

  await page.goto('/projects/module-demos/internal-demo');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByRole('heading', { name: 'Internal Demo', level: 1 })).toBeVisible();
  await expect(page.locator('[data-state="internal-unregistered"]')).toContainText('This internal demo has not yet been connected to the NexAeon Runtime.');
  await expect(page.getByRole('link', { name: 'Open in new tab' }).first()).toHaveAttribute('target', '_blank');

  await page.goto('/projects/module-demos/__missing_demo__');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByTestId('demo-runtime-not-found')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Demo not found', level: 1 })).toBeVisible();

  await page.goto('/projects/module-demos/embedded-demo');
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.getByRole('heading', { name: '임베드 데모', level: 1 })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Embedded English summary');
  await page.getByRole('button', { name: '切換為繁體中文' }).click();
  await expect(page.getByRole('heading', { name: '內嵌展示', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to English' }).click();

  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects/module-demos/embedded-demo');
  await expect(page.locator('main')).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);

  await page.locator('.main-logo-link').first().click();
  await expect(page).toHaveURL(/\/$/);
  const introSeen = await page.evaluate(() => window.sessionStorage.getItem('nexaeon_intro_seen'));
  expect(introSeen).toBe('true');
});

test('embedded runtime loading state and timeout fallback stay usable', async ({ page }) => {
  await gotoAndSetEnglish(page, '/projects/module-demos/timeout-demo');

  await expect(page.getByRole('heading', { name: 'Timeout Demo', level: 1 })).toBeVisible();
  await expect(page.getByText('Loading demo')).toBeVisible();
  await expect(page.getByText('This demo may not allow embedded viewing. Please open it in a new tab.')).toBeVisible({ timeout: 13_000 });
  await expect(page.getByRole('link', { name: 'Open in new tab' }).first()).toHaveAttribute('target', '_blank');
});

test('navigator searches public knowledge with grounded source cards', async ({ page, context }) => {
  const watcher = getRuntimeWatcher(page);
  await gotoAndSetEnglish(page, '/identity/nexaeon-navigator');

  await expect(page.getByTestId('navigator-agent-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'NexAeon Navigator', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'NexAeon Agent System Map', level: 2 })).toBeVisible();
  for (const agentName of EXPECTED_AGENT_SYSTEM_MAP_AGENTS) {
    await expect(page.locator('.agent-landing-section').getByText(agentName)).toBeVisible();
  }
  const navigatorCard = page.locator('.agent-landing-card').filter({ hasText: 'NexAeon Navigator' });
  const explorerCard = page.locator('.agent-landing-card').filter({ hasText: 'NexAeon Explorer' });
  const xchangeCard = page.locator('.agent-landing-card').filter({ hasText: 'NexAeon Xchange' });
  const archivistCard = page.locator('.agent-landing-card').filter({ hasText: 'NexAeon Archivist' });
  const engineerCard = page.locator('.agent-landing-card').filter({ hasText: 'NexAeon Engineer' });
  const orchestratorCard = page.locator('.agent-landing-card').filter({ hasText: 'NexAeon Orchestrator' });
  const networkerCard = page.locator('.agent-landing-card').filter({ hasText: 'NexAeon Networker' });
  await expect(navigatorCard).toContainText('Active');
  await expect(explorerCard).toContainText('Active');
  await expect(xchangeCard).toContainText('Active');
  await expect(archivistCard).toContainText('Active');
  await expect(engineerCard).toContainText('Active');
  await expect(orchestratorCard).toContainText('Active');
  await expect(networkerCard).toContainText('Active');
  await expect(page.locator('body')).not.toContainText(new RegExp('Nex\\u014dn'));

  await page.getByRole('button', { name: 'Which demos are currently public?' }).click();
  await expect(page.locator('.agent-message-assistant .agent-message-label').filter({ hasText: /^NAVIGATOR$/ })).toBeVisible();
  await expect(page.getByText('The currently public demos include Learning Demo.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jump to source S1' })).toBeVisible();

  const demoResult = page.locator('.agent-result-card').filter({ hasText: 'Learning Demo' });
  await expect(demoResult).toBeVisible();
  await expect(demoResult).toContainText('S1');
  await expect(demoResult).toContainText('Demo Showcase');
  await expect(demoResult).not.toContainText('Visibility');
  await expect(demoResult).not.toContainText('Notes');
  await expect(demoResult).not.toContainText('score');

  const [externalPage] = await Promise.all([
    context.waitForEvent('page'),
    demoResult.getByRole('link', { name: 'Open external source' }).click(),
  ]);
  expect(externalPage.url()).toContain('example.com');
  await externalPage.close();

  await demoResult.getByRole('button', { name: 'View source' }).click();
  await expect(page).toHaveURL(/\/projects\/module-demos$/);

  watcher.assertClean();
});

test('navigator handles sources-only fallback states', async ({ page }) => {
  await gotoAndSetEnglish(page, '/identity/nexaeon-navigator');
  await page.locator('#navigator-agent-query').fill('partial status');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Some public sources are temporarily unavailable. This answer uses the sources currently available.')).toBeVisible();

  await page.locator('#navigator-agent-query').fill('disabled status');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('AI answers are not enabled yet. You can still review the relevant public sources.')).toBeVisible();
  await expect(page.locator('.agent-result-card').filter({ hasText: 'Learning Demo' }).first()).toBeVisible();

  await page.locator('#navigator-agent-query').fill('unavailable public demo status');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('The currently public demos include:')).toBeVisible();
  await expect(page.getByText('AI answers are temporarily unavailable. The most relevant public sources are still shown below.')).toBeVisible();

  await page.locator('#navigator-agent-query').fill('nosource status');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('The current public knowledge does not contain enough information to answer this question.')).toBeVisible();

  await page.locator('#navigator-agent-query').fill('moderated status');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('This request cannot be processed. Please revise it and try again.')).toBeVisible();

  await page.locator('#navigator-agent-query').fill('forced status');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Relevant public sources include:')).toBeVisible();
  await expect(page.getByText('Results are currently provided in public-source navigation mode.')).toBeVisible();
});

test('navigator renders safe markdown and clickable citation markers', async ({ page }) => {
  await gotoAndSetEnglish(page, '/identity/nexaeon-navigator');
  await page.locator('#navigator-agent-query').fill('markdown status');
  await page.getByRole('button', { name: 'Send' }).click();

  const answer = page.locator('.agent-answer-text').last();
  await expect(answer.locator('strong', { hasText: 'NexAeon AI Tutoring MVP' })).toBeVisible();
  await expect(answer.locator('code', { hasText: 'AI Tutor' })).toBeVisible();
  await expect(answer.locator('ol li')).toHaveCount(2);
  await expect(answer.locator('ul li')).toHaveCount(1);
  await expect(page.locator('body')).not.toContainText('**NexAeon AI Tutoring MVP**');
  const scriptCount = await page.locator('script', { hasText: 'alert(1)' }).count();
  expect(scriptCount).toBe(0);

  const marker = page.getByRole('button', { name: 'Jump to source S1' }).first();
  await marker.click();
  const card = page.locator('#citation-S1');
  await expect(card).toBeFocused();
  await expect(card).toHaveClass(/agent-result-card-highlight/);
});

test('navigator handles 429 countdown and duplicate submit guards', async ({ page }) => {
  let chatPostCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/agent/chat')) chatPostCount += 1;
  });

  await gotoAndSetEnglish(page, '/identity/nexaeon-navigator');
  await page.locator('#navigator-agent-query').fill('rate limit status');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Please wait 2 seconds before asking again.')).toBeVisible();
  await expect(page.locator('.agent-message-assistant')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();
  await page.keyboard.press('Enter');
  expect(chatPostCount).toBe(1);
  await expect(page.getByText(/Please wait \d seconds before asking again\./)).toHaveCount(0, { timeout: 3500 });
  await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled();

  await page.locator('#navigator-agent-query').fill('Which demos are currently public?');
  await Promise.all([
    page.getByRole('button', { name: 'Send' }).dblclick(),
    page.keyboard.press('Enter'),
  ]);
  await expect(page.getByText('The currently public demos include Learning Demo.')).toBeVisible();
  expect(chatPostCount).toBe(2);

  await page.getByRole('button', { name: 'Clear chat' }).click();
  await page.getByRole('button', { name: 'Which demos are currently public?' }).dblclick();
  await expect(page.locator('.agent-message-user')).toHaveCount(1);
  await expect(page.locator('.agent-message-assistant')).toHaveCount(1);
  expect(chatPostCount).toBe(3);
});

test('navigator localizes, redirects legacy route, supports no-result, mobile, refresh, and back behavior', async ({ page }) => {
  await page.goto('/identity/nexon-ai-assistant');
  await expect(page).toHaveURL(/\/identity\/nexaeon-navigator$/);
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.getByRole('button', { name: '현재 공개된 Demo는 무엇인가요?' })).toBeVisible();
  await page.getByRole('button', { name: '현재 공개된 Demo는 무엇인가요?' }).click();
  await expect(page.getByText('현재 공개된 Demo에는 학습 데모가 포함됩니다.')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('繁中 Demo 摘要');
  await expect(page.locator('body')).not.toContainText('English Demo summary');

  await page.getByRole('button', { name: '切換為繁體中文' }).click();
  await page.locator('#navigator-agent-query').fill('目前有哪些公開 Demo？');
  await page.getByRole('button', { name: '送出' }).click();
  await expect(page.getByText('目前公開 Demo 包含智慧學習展示。')).toBeVisible();

  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByRole('button', { name: 'Clear chat' }).click();
  await expect(page.getByText('The currently public demos include Learning Demo.')).toHaveCount(0);

  await page.locator('#navigator-agent-query').fill('slow answer');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Navigator is preparing an answer from the public sources…')).toBeVisible();
  await page.getByRole('button', { name: 'Stop waiting' }).click();
  await expect(page.getByText('Navigator is preparing an answer from the public sources…')).toHaveCount(0);

  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page).toHaveURL(/\/identity\/nexaeon-navigator$/);
  await expect(page.getByTestId('navigator-agent-page')).toBeVisible();
  await expect(page.locator('#navigator-agent-query')).toBeVisible();
  await expect(page.getByRole('button', { name: /Send|送出|보내기/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Clear chat|清除對話|대화 지우기/ })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);

  await page.locator('.subpage-content > .btn').first().click();
  await expect(page).toHaveURL(/\/#identity$/);
  const introSeen = await page.evaluate(() => window.sessionStorage.getItem('nexaeon_intro_seen'));
  expect(introSeen).toBe('true');
});

test('navigator does not submit while IME composition is active', async ({ page }) => {
  let chatPostCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/agent/chat')) chatPostCount += 1;
  });

  await gotoAndSetEnglish(page, '/identity/nexaeon-navigator');
  const input = page.locator('#navigator-agent-query');
  await input.fill('Joey');
  await input.dispatchEvent('compositionstart');
  await input.press('Enter');
  expect(chatPostCount).toBe(0);
  await input.dispatchEvent('compositionend');
  await input.press('Enter');
  await expect(page.locator('.agent-message-assistant')).toHaveCount(1);
  expect(chatPostCount).toBe(1);
});

test('demo showcase shows localized empty states for zero public demos', async ({ page }) => {
  const watcher = getRuntimeWatcher(page);
  await page.route('**/api/modules/demos', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createApiResponse({ source: 'airtable', reason: null, items: [] })),
    });
  });

  await page.goto('/projects/module-demos');
  await expect(page.locator('.mvp-empty-state')).toContainText('目前尚無公開展示的 Demo。');
  await expect(page.locator('.mvp-compact-card')).toHaveCount(0);

  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.locator('.mvp-empty-state')).toContainText('현재 공개된 Demo가 없습니다.');

  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.locator('.mvp-empty-state')).toContainText('No public demos are available yet.');

  watcher.assertClean();
});

test('direct routes and refresh stay on the same URL', async ({ page }) => {
  const watcher = getRuntimeWatcher(page);
  const directRoutes = [
    '/students',
    '/research/ai-in-education',
    '/identity/identity-profiles',
    '/identity/nexaeon-networker',
  ];

  for (const route of directRoutes) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator('main')).toBeVisible();
  }

  watcher.assertClean();
});

test('invalid route and unavailable detail show safe guardrail states', async ({ page }) => {
  const watcher = getRuntimeWatcher(page);

  await gotoAndSetEnglish(page, '/__nexaeon_invalid_route__');
  await expect(page.getByTestId('not-found-route')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('not-found-route')).toBeVisible();
  await page.getByRole('button', { name: /Back to home|返回首頁|홈으로 돌아가기/ }).first().click();
  await expect(page).toHaveURL(/\/$/);

  await gotoAndSetEnglish(page, '/research/not-public-smoke-id');
  await expect(page.getByTestId('detail-unavailable')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This public content cannot be viewed right now', level: 1 })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('TypeError');
  await expect(page.locator('body')).not.toContainText('Notion');
  await expect(page.locator('body')).not.toContainText('Airtable');

  watcher.assertClean();
});

test('seven public APIs keep the deployed public contract', async ({ request }) => {
  const healthHead = await request.head('/api/agent/health');
  expect(healthHead.status()).toBe(200);
  expect(await healthHead.text()).toBe('');

  const healthResponse = await request.get('/api/agent/health');
  expect(healthResponse.status()).toBe(200);
  const health = await healthResponse.json();
  expect(health.service).toBe('NexAeon Navigator');
  expect(health.sourceRegistryCount).toBe(7);
  expect(['ready', 'sources_only', 'disabled', 'degraded']).toContain(health.status);

  for (const endpoint of API_ENDPOINTS) {
    const response = await request.get(endpoint);
    expect(response.status(), endpoint).toBe(200);
    const payload = await response.json();

    expect(ALLOWED_SOURCES.has(payload.source), endpoint).toBe(true);
    expect(ALLOWED_REASONS.has(payload.reason ?? null), endpoint).toBe(true);
    expect(Array.isArray(payload.items), endpoint).toBe(true);
    expect(Array.isArray(payload.data), endpoint).toBe(true);
    expect(payload.count, endpoint).toBe(payload.items.length);
    expect(typeof payload.updatedAt === 'string' || payload.updatedAt === null, endpoint).toBe(true);

    const keys = collectObjectKeys(payload).map((key) => key.trim().toLowerCase());
    expect(keys.some((key) => SENSITIVE_KEYS.has(key)), endpoint).toBe(false);
    expect(hasUnsafeInternalKey(keys), endpoint).toBe(false);
  }
});
