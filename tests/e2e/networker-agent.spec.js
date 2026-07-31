import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

test('Networker runs independently with classification, collaboration map, sources, refresh, and locales', async ({ page }) => {
  const requests = [];
  await page.route('**/api/agent/networker/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, mode: 'ai', answer: 'Verified: these are public profiles. The possible relation is recommended only. [S1] [S2]',
      citations: [
        { sourceId: 'S1', title: 'Public Researcher', summary: 'AI education profile.', typeLabel: 'Researcher', moduleLabel: 'Identity', sourceRoute: '/identity', sourceUrl: '' },
        { sourceId: 'S2', title: 'Public Institute', summary: 'Digital institute.', typeLabel: 'Organization', moduleLabel: 'Identity', sourceRoute: '/identity', sourceUrl: '' },
      ],
      suggestedQuestions: [], partialSources: false, agentId: 'networker', executedTools: ['buildCollaborationMap'],
      factClassification: {
        verified: [{ text: 'Public Researcher — Researcher', sourceIds: ['profile-public'] }],
        inferred: [{ text: 'Shared interest suggests only a possible connection.', sourceIds: ['profile-public', 'profile-institute'] }],
        recommended: [{ text: 'Confirm willingness before contact.', sourceIds: [] }],
        unknown: [{ text: 'Willingness and private relationships are unknown.', sourceIds: [] }],
      },
      collaborationMap: {
        objective: 'Build a collaboration map',
        nodes: [{ id: 'profile-public', label: 'Public Researcher', nodeType: 'Researcher', verificationStatus: 'verified' }],
        nodeType: ['Researcher', 'Organization'], profileIds: ['profile-public', 'profile-institute'],
        organizations: ['NexAeon'], sharedInterests: ['AI Tutor'], complementaryCapabilities: ['Public Institute: Knowledge Systems'],
        proposedRelations: [{ id: 'proposed-1', title: 'Potential collaboration', status: 'recommended' }],
        evidence: [{ profileId: 'profile-public', verificationStatus: 'verified' }],
        sourceIds: ['profile-public', 'profile-institute'], verificationStatus: 'unverified',
      },
    }) });
  });

  await page.goto('/identity/nexaeon-networker');
  await page.reload();
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByTestId('networker-agent-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'NexAeon Networker', level: 1 })).toBeVisible();
  const input = page.locator('#networker-agent-query');
  await input.fill('Build a collaboration map');
  await page.getByRole('button', { name: 'Submit' }).dblclick();
  await expect(page.getByText('Networker is using Identity tools to organize public profiles and possible collaboration connections…')).toBeVisible();
  await expect(page.locator('.agent-message-assistant').last()).toContainText('recommended');
  await expect(page.getByTestId('networker-fact-classification')).toContainText('Recommended');
  await expect(page.getByTestId('networker-fact-classification')).toContainText('Unknown');
  await expect(page.getByTestId('networker-collaboration-map')).toContainText('Proposed relations');
  await expect(page.getByTestId('networker-collaboration-map')).toContainText('unverified');
  await expect(page.locator('.agent-result-card').filter({ hasText: 'Public Researcher' })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toEqual({ message: 'Build a collaboration map', locale: 'en', history: [] });
  await page.getByRole('button', { name: 'Clear chat' }).click();
  await expect(page.locator('.agent-message')).toHaveCount(0);
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.getByText('검색, 비교 또는 분석할 정체성과 협업 요구를 입력하세요')).toBeVisible();
});

test('Networker supports cancel, empty result, and tool error', async ({ page }) => {
  let mode = 'pending';
  await page.route('**/api/agent/networker/chat', async (route) => {
    if (mode === 'pending') { await new Promise((resolve) => setTimeout(resolve, 10_000)); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, mode: 'sources_only', answer: '', reason: mode, citations: [], suggestedQuestions: [], partialSources: false,
      agentId: 'networker', executedTools: [], factClassification: { verified: [], inferred: [], recommended: [], unknown: [] }, collaborationMap: null,
    }) });
  });
  await page.goto('/identity/nexaeon-networker');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  const input = page.locator('#networker-agent-query');
  await input.fill('Cancel this request');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.agent-message-assistant')).toHaveCount(0);
  mode = 'no_sources';
  await input.fill('No matching profile');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('The currently public Identity Profiles data does not contain enough information to answer this request.')).toBeVisible();
  mode = 'tool_unavailable';
  await input.fill('Retry tools');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Networker’s Identity tools cannot read public data right now. Please try again later.')).toBeVisible();
});
