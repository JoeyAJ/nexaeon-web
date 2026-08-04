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
  await page.route('**/api/agent/xchange/actions/revise', async (route) => {
    requests.push({ body: route.request().postDataJSON(), csrf: route.request().headers()['x-nexaeon-csrf'] });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true, previewId: 'xpv-operation-ui-r2', operationId: 'operation-ui-r2', idempotencyKey: 'idem-ui-r2',
        agentId: 'xchange', toolId: 'createCourseDraft', draftType: 'course', language: 'en', targetDataSource: 'notion-teaching-materials',
        contractVersion: 'v1', schemaVersion: 'v1', permissionLevel: 'WRITE_CONFIRM', confirmationRequired: true,
        previewExpiresAt: '2099-08-02T01:06:00.000Z', previewHash: 'hash-ui-r2', confirmationToken: 'signed-ui-token-r2',
        normalizedPayload: { title: 'Advanced AI Marketing', draftStatus: 'Draft', visibility: 'Private', published: false },
        createPayloadPreview: { '標題': 'Advanced AI Marketing', '狀態': 'Draft', '公開狀態': 'Private', Published: false },
        contentPreview: { overview: { courseTitle: 'Advanced AI Marketing', purpose: 'Help learners apply evidence-led marketing decisions.' }, learningObjectives: ['Identify audience evidence', 'Compare campaign options', 'Design a measurable campaign'] },
        extractedRequirements: { exactTitle: 'Advanced AI Marketing', topic: 'Advanced AI Marketing', targetAudience: ['University students'], durationMinutes: 90, difficulty: 'Beginner', format: ['Workshop'], language: 'en', requiredElements: ['learning objectives'], subjectKeywords: ['AI', 'Marketing'] },
        preservedConstraints: { exactTitle: true, targetAudience: true, format: true, durationMinutes: true, difficulty: true, language: true },
        contentQuality: { status: 'Complete', errors: [], warnings: [], qualityReasons: ['All quality checks passed.'], topicRelevance: { score: 1, valid: true }, promptOverlap: { ratio: 0, valid: true } },
        contentSchemaVersion: 'v1', rendererVersion: 'v1', estimatedBodyBlocks: 72, durationValidation: { expectedMinutes: 90, actualMinutes: 90, valid: true },
        previewVersion: 2, revisionNumber: 2, parentOperationId: 'operation-ui', revisionReason: 'Update the title',
        changedPaths: ['metadata.title', 'overview'], preservedPaths: ['activities', 'assessment'], regeneratedPaths: [], autoAdjustedPaths: ['overview'],
        changeSummary: { before: 'AI Marketing', after: 'Advanced AI Marketing', changedPaths: ['metadata.title', 'overview'], preservedPaths: ['activities', 'assessment'], autoAdjustedPaths: ['overview'], qualityBefore: 'Complete', qualityAfter: 'Complete', estimatedBlocksBefore: 72, estimatedBlocksAfter: 72, durationBefore: { actualMinutes: 90 }, durationAfter: { actualMinutes: 90 }, canExecute: true },
        rejectedFields: [], warnings: ['Revision preview only.'], estimatedWrites: 1, writesPerformed: 0, canExecute: true,
      }),
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
  await page.getByRole('button', { name: 'Edit field' }).click();
  await page.getByLabel('Edit instruction').fill('Update the title');
  await page.getByLabel('Replacement value (use JSON for sections)').fill('Advanced AI Marketing');
  await page.getByRole('button', { name: 'Apply revision' }).click();
  await expect(page.getByTestId('xchange-change-summary')).toContainText('AI Marketing');
  await expect(page.getByTestId('xchange-change-summary')).toContainText('Advanced AI Marketing');
  await expect(page.getByTestId('xchange-change-summary')).toContainText('metadata.title, overview');
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('2 · parent operation-ui');
  const execute = page.getByRole('button', { name: 'Confirm draft creation' });
  await expect(execute).toBeDisabled();
  await page.getByLabel('I confirm this will create one Private Draft in Learning Coaching').check();
  await expect(execute).toBeEnabled();
  await execute.click();
  await expect(page.getByTestId('xchange-execution-success')).toContainText('Draft created successfully');
  await expect(page.getByTestId('xchange-execution-success')).toContainText('Succeeded · Draft · Private · Published=false');
  await expect(page.getByRole('button', { name: 'Created' })).toBeDisabled();
  expect(requests).toHaveLength(3);
  expect(requests[0].csrf).toBe('csrf-preview');
  expect(requests[0].body).toMatchObject({
    agentId: 'xchange', toolId: 'createCourseDraft', targetDataSource: 'notion-teaching-materials',
    draftType: 'course', contractVersion: 'v1', schemaVersion: 'v1',
  });
  expect(requests[0].body.payload).toMatchObject({ title: 'AI Marketing', durationMinutes: 90 });
  expect(requests[0].body.confirmationRequired).toBeUndefined();
  expect(requests[1].csrf).toBe('csrf-preview');
  expect(requests[1].body).toMatchObject({ sourceOperationId: 'operation-ui', sourcePreviewHash: 'hash-ui', editMode: 'edit_field', targetPath: 'title', replacementValue: 'Advanced AI Marketing', preserveOtherSections: true, contractVersion: 'v1', contentSchemaVersion: 'v1' });
  expect(requests[2].csrf).toBe('csrf-preview');
  expect(requests[2].body).toMatchObject({ operationId: 'operation-ui-r2', confirmationToken: 'signed-ui-token-r2', confirm: true, previewHash: 'hash-ui-r2' });
});

test('Xchange section revision submits the live Panel handler, replaces Preview state, and surfaces API errors', async ({ page }) => {
  const requests = [];
  let revisionAttempt = 0;
  const preview = {
    ok: true, previewId: 'xpv-section-v1', operationId: 'section-v1', idempotencyKey: 'section-idem-v1',
    agentId: 'xchange', toolId: 'createCourseDraft', draftType: 'course', language: 'en', targetDataSource: 'notion-teaching-materials',
    contractVersion: 'v1', schemaVersion: 'v1', permissionLevel: 'WRITE_CONFIRM', confirmationRequired: true,
    previewExpiresAt: '2099-08-02T01:05:00.000Z', previewHash: 'section-hash-v1', confirmationToken: 'section-token-v1',
    normalizedPayload: { title: 'Brand Strategy', draftStatus: 'Draft', visibility: 'Private', published: false },
    createPayloadPreview: { Title: 'Brand Strategy', Status: 'Draft' },
    contentPreview: {
      overview: { courseTitle: 'Brand Strategy', purpose: 'Apply brand strategy.' },
      learningObjectives: ['Identify brand principles', 'Compare brand approaches', 'Design a brand artifact'],
      assessment: { method: 'Rubric', criteria: ['Evidence'], feedbackMethod: 'Feedback' },
    },
    extractedRequirements: {}, preservedConstraints: {},
    contentQuality: { status: 'Complete', qualityReasons: ['All checks passed.'], topicRelevance: { score: 1, valid: true }, promptOverlap: { ratio: 0, valid: true } },
    contentSchemaVersion: 'v1', rendererVersion: 'v1', estimatedBodyBlocks: 30,
    durationValidation: { expectedMinutes: 90, actualMinutes: 90, valid: true },
    previewVersion: 1, revisionNumber: 1, parentOperationId: null,
    changedPaths: [], preservedPaths: [], regeneratedPaths: [], autoAdjustedPaths: [], changeSummary: null,
    warnings: [], estimatedWrites: 1, writesPerformed: 0, canExecute: true,
  };

  await page.route('**/api/admin/session', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: true, actorId: 'xchange-admin', role: 'admin', csrfToken: 'csrf-section' }) }));
  await page.route('**/api/agent/xchange/actions/preview', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(preview) }));
  await page.route('**/api/agent/xchange/actions/revise', async (route) => {
    revisionAttempt += 1;
    requests.push({ body: route.request().postDataJSON(), csrf: route.request().headers()['x-nexaeon-csrf'] });
    if (revisionAttempt === 2) {
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ ok: false, errorCode: 'PREVIEW_SUPERSEDED', writesPerformed: 0 }) });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    const objectives = ['Identify brand principles', 'Compare brand approaches', 'Design a brand artifact', '執行品牌一致性評估並提出修訂建議'];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...preview, previewId: 'xpv-section-v2', operationId: 'section-v2', idempotencyKey: 'section-idem-v2',
        previewHash: 'section-hash-v2', confirmationToken: 'section-token-v2', previewVersion: 2, revisionNumber: 2,
        parentOperationId: 'section-v1', revisionReason: '把學習目標改成 4 項，並加入品牌一致性評估',
        contentPreview: { ...preview.contentPreview, learningObjectives: objectives },
        changedPaths: ['learningObjectives'], preservedPaths: ['overview', 'assessment'],
        changeSummary: {
          before: preview.contentPreview.learningObjectives, after: objectives,
          changedPaths: ['learningObjectives'], preservedPaths: ['overview', 'assessment'], autoAdjustedPaths: [],
          qualityBefore: 'Complete', qualityAfter: 'Complete', estimatedBlocksBefore: 30, estimatedBlocksAfter: 31,
          durationBefore: preview.durationValidation, durationAfter: preview.durationValidation, canExecute: true,
        },
      }),
    });
  });

  await page.goto('/teaching/nexaeon-xchange');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByLabel('Title').fill('Brand Strategy');
  await page.getByLabel('Summary / subtopic').fill('Brand workshop');
  await page.getByRole('button', { name: 'Create Preview' }).click();
  await page.getByRole('button', { name: 'Edit section' }).click();
  await page.getByLabel('Target path').selectOption('learningObjectives');
  await page.getByLabel('Edit instruction').fill('把學習目標改成 4 項，並加入品牌一致性評估');
  await page.getByRole('button', { name: 'Apply revision' }).click();
  await expect(page.getByText('Creating a new revision Preview…')).toBeVisible();
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('2 · parent section-v1');
  await expect(page.getByTestId('xchange-change-summary')).toContainText('learningObjectives');
  await expect(page.getByTestId('xchange-change-summary')).toContainText('overview, assessment');
  await expect(page.getByTestId('xchange-change-summary')).toContainText('Identify brand principles');
  await expect(page.getByTestId('xchange-change-summary')).toContainText('品牌一致性評估');
  await expect(page.getByTestId('xchange-content-preview')).toContainText('品牌一致性評估');
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('performed 0');

  expect(requests[0].csrf).toBe('csrf-section');
  expect(requests[0].body).toEqual({
    sourceOperationId: 'section-v1', sourcePreviewHash: 'section-hash-v1',
    editMode: 'edit_section', targetPath: 'learningObjectives',
    instruction: '把學習目標改成 4 項，並加入品牌一致性評估', preserveOtherSections: true,
    contractVersion: 'v1', contentSchemaVersion: 'v1',
  });

  await page.getByRole('button', { name: 'Edit section' }).click();
  await page.getByLabel('Edit instruction').fill('Try another revision');
  await page.getByRole('button', { name: 'Apply revision' }).click();
  await expect(page.getByTestId('xchange-preview-failure')).toContainText('This Preview was superseded by a newer revision and can no longer be executed.');
  await expect(page.getByTestId('xchange-preview-failure')).toContainText('PREVIEW_SUPERSEDED');
  await expect(page.getByTestId('xchange-structured-preview')).toContainText('2 · parent section-v1');
});
