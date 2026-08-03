import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('nexaeon_intro_seen', 'true'));
});

test('Xchange runs independently with course-design context, sources, clear, and localized UI', async ({ page }) => {
  const requests = [];
  await page.route('**/api/agent/xchange/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    await new Promise((resolve) => setTimeout(resolve, 120));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        mode: 'ai',
        answer: 'Build the lesson around objectives, practice, coaching feedback, and reflection. [S1]',
        citations: [{
          sourceId: 'S1',
          title: 'AI Literacy Workshop',
          summary: 'A public reflection-led workshop.',
          typeLabel: 'Workshop',
          moduleLabel: 'Learning Coaching',
          sourceRoute: '/teaching/teaching-courses',
          sourceUrl: 'https://example.com/ai-literacy',
        }],
        suggestedQuestions: ['Create reflection questions.'],
        partialSources: false,
        agentId: 'xchange',
        supportingAgentId: null,
        executedTools: ['searchLearningMaterials'],
      }),
    });
  });

  await page.goto('/teaching/nexaeon-xchange');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByTestId('xchange-agent-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'NexAeon Xchange', level: 1 })).toBeVisible();

  const input = page.locator('#xchange-agent-query');
  await input.fill('Design a 90-minute AI literacy lesson');
  await page.getByRole('button', { name: 'Submit' }).dblclick();
  await expect(page.getByText('Xchange is searching public teaching data with the Learning tools…')).toBeVisible();
  await expect(page.locator('.agent-message-assistant').last()).toContainText('coaching feedback');
  await expect(page.getByRole('button', { name: 'Jump to source S1' })).toBeVisible();
  await expect(page.locator('.agent-result-card').filter({ hasText: 'AI Literacy Workshop' })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toEqual({
    message: 'Design a 90-minute AI literacy lesson',
    locale: 'en',
    history: [],
  });

  await page.getByRole('button', { name: 'Clear chat' }).click();
  await expect(page.locator('.agent-message')).toHaveCount(0);
  await page.getByRole('button', { name: '한국어로 전환' }).click();
  await expect(page.getByText('학습, 교육 또는 수업 설계 요청을 입력하세요')).toBeVisible();
  await expect(page.getByRole('button', { name: '보내기' })).toBeVisible();
});

test('Xchange supports cancel, empty result, and tool error states', async ({ page }) => {
  let mode = 'pending';
  await page.route('**/api/agent/xchange/chat', async (route) => {
    if (mode === 'pending') {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        mode: 'sources_only',
        answer: '',
        reason: mode,
        citations: [],
        suggestedQuestions: [],
        partialSources: false,
        agentId: 'xchange',
        executedTools: [],
      }),
    });
  });

  await page.goto('/teaching/nexaeon-xchange');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  const input = page.locator('#xchange-agent-query');
  await input.fill('Cancel this request');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Xchange is searching public teaching data with the Learning tools…')).toBeHidden();
  await expect(page.locator('.agent-message-assistant')).toHaveCount(0);

  mode = 'no_sources';
  await input.fill('No matching material');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('The currently public Learning Coaching data does not contain enough information to answer this request.')).toBeVisible();

  mode = 'tool_unavailable';
  await input.fill('Retry tools');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Xchange’s Learning tools cannot read the public data right now. Please try again later.')).toBeVisible();
});

test('Xchange renders the admin-controlled Course Draft Preview and requires explicit confirmation to execute', async ({ page }) => {
  const requests = [];
  await page.route('**/api/admin/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, authenticated: true, actorId: 'xchange-admin', role: 'admin', csrfToken: 'csrf-preview' }),
    });
  });
  await page.route('**/api/agent/xchange/actions/preview', async (route) => {
    requests.push({ body: route.request().postDataJSON(), csrf: route.request().headers()['x-nexaeon-csrf'] });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true, previewId: 'xpv-operation-ui', operationId: 'operation-ui', idempotencyKey: 'idem-ui',
        agentId: 'xchange', toolId: 'createCourseDraft', draftType: 'course', targetDataSource: 'notion-teaching-materials',
        contractVersion: 'v1', schemaVersion: 'v1', permissionLevel: 'WRITE_CONFIRM', confirmationRequired: true,
        previewExpiresAt: '2099-08-02T01:05:00.000Z', previewHash: 'hash-ui', confirmationToken: 'signed-ui-token',
        normalizedPayload: { title: 'AI Marketing', draftStatus: 'Draft', visibility: 'Private', published: false },
        createPayloadPreview: { '標題': 'AI Marketing', '狀態': 'Draft', '公開狀態': 'Private', Published: false },
        contentPreview: { overview: { courseTitle: 'AI Marketing', purpose: 'Help learners apply evidence-led marketing decisions.' }, learningObjectives: ['Identify audience evidence', 'Compare campaign options', 'Design a measurable campaign'] },
        extractedRequirements: { exactTitle: 'AI Marketing', topic: 'AI Marketing', targetAudience: ['University students'], durationMinutes: 90, difficulty: 'Beginner', format: ['Workshop'], language: 'en', requiredElements: ['learning objectives'], subjectKeywords: ['AI', 'Marketing'] },
        preservedConstraints: { exactTitle: true, targetAudience: true, format: true, durationMinutes: true, difficulty: true, language: true },
        contentQuality: { status: 'Complete', errors: [], warnings: [], qualityReasons: ['All quality checks passed.'], topicRelevance: { score: 1, valid: true }, promptOverlap: { ratio: 0, valid: true } }, contentSchemaVersion: 'v1', rendererVersion: 'v1', estimatedBodyBlocks: 72,
        durationValidation: { expectedMinutes: 90, actualMinutes: 90, valid: true },
        rejectedFields: [], warnings: ['Preview only. No Learning Coaching record was created.'],
        estimatedWrites: 1, writesPerformed: 0, auditPreview: { executionStatus: 'previewed' }, canExecute: true,
      }),
    });
  });
  await page.route('**/api/agent/xchange/actions/execute', async (route) => {
    requests.push({ body: route.request().postDataJSON(), csrf: route.request().headers()['x-nexaeon-csrf'] });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, operationId: 'operation-ui', executionStatus: 'succeeded', writes: 1, writesPerformed: 1, draftStatus: 'Draft', visibility: 'Private', published: false, externalRecordId: 'notion-page-ui', createdAt: '2026-08-02T01:01:00.000Z', notPublished: true, replayed: false }),
    });
  });

  await page.goto('/teaching/nexaeon-xchange');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByTestId('xchange-draft-preview-panel')).toBeVisible();
  await page.getByLabel('Title').fill('AI Marketing');
  await page.getByLabel('Summary / subtopic').fill('A 90-minute coaching-led course.');
  await page.getByRole('button', { name: 'Create Preview' }).click();
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('Draft · Private · Published=false');
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('performed 0');
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('Complete');
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('90 / 90 min · valid');
  await expect(page.getByTestId('xchange-content-preview')).toContainText('Help learners apply evidence-led marketing decisions.');
  await expect(page.getByTestId('xchange-content-preview')).toContainText('Design a measurable campaign');
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('Extracted requirements');
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('University students');
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('Topic relevance');
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('All quality checks passed.');
  const execute = page.getByRole('button', { name: 'Confirm draft creation' });
  await expect(execute).toBeDisabled();
  await page.getByLabel('I confirm this will create one Private Draft in Learning Coaching').check();
  await expect(execute).toBeEnabled();
  await execute.click();
  await expect(page.getByTestId('xchange-execution-success')).toContainText('Draft created successfully');
  await expect(page.getByTestId('xchange-execution-success')).toContainText('Succeeded · Draft · Private · Published=false');
  await expect(page.getByRole('button', { name: 'Created' })).toBeDisabled();
  expect(requests).toHaveLength(2);
  expect(requests[0].csrf).toBe('csrf-preview');
  expect(requests[0].body).toMatchObject({
    agentId: 'xchange', toolId: 'createCourseDraft', targetDataSource: 'notion-teaching-materials',
    draftType: 'course', contractVersion: 'v1', schemaVersion: 'v1',
  });
  expect(requests[0].body.payload).toMatchObject({ title: 'AI Marketing', durationMinutes: 90 });
  expect(requests[0].body.confirmationRequired).toBeUndefined();
  expect(requests[1].csrf).toBe('csrf-preview');
  expect(requests[1].body).toMatchObject({ operationId: 'operation-ui', confirmationToken: 'signed-ui-token', confirm: true, previewHash: 'hash-ui' });
});
