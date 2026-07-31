import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ENGINEER_TOOL_NAMES,
  buildEngineerDevelopmentPlan,
  buildEngineerFactClassification,
  comparePrototypeItems,
  executeEngineerPrototypeTool,
  filterPrototypeItems,
  getPrototypeLinks,
  listPrototypeStatuses,
  listPrototypeTopics,
  loadPublicPrototypeItems,
  normalizePrototypeToolItem,
  searchPrototypeItems,
} from '../lib/agent/engineerPrototypeTools.js';

const rawItems = [
  {
    id: 'demo-ai-tutor', slug: 'ai-tutor', name: 'AI Tutor Demo', summary: 'Adaptive learning prototype.',
    visibility: 'Published', demoType: 'AI Tutor', status: 'In Development', version: '0.3',
    techStack: ['React', 'OpenAI'], launchMode: 'External', launchReady: true,
    demoUrl: 'https://demo.example.com/ai-tutor', githubUrl: 'https://github.com/JoeyAJ/ai-tutor',
    relatedModules: ['Learning Coaching'], coreFeatures: 'Adaptive prompts', updatedAt: '2026-07-01',
  },
  {
    id: 'demo-dashboard', slug: 'dashboard', name: 'Research Dashboard', summary: 'Research metrics dashboard.',
    publicStatus: 'Public', demoType: 'Dashboard', status: 'MVP', version: '1.0',
    techStack: ['React', 'Vite'], launchMode: 'Internal', launchReady: true,
    relatedModules: ['Research'], coreFeatures: 'Charts and filters', updatedAt: '2025-05-01',
  },
];

function data() {
  return { sourcePlatform: 'airtable', items: rawItems.map((item) => normalizePrototypeToolItem(item, 'airtable')) };
}

test('Engineer exposes the exact read-only Prototype allowlist and rejects write or execution tools', () => {
  assert.deepEqual(ENGINEER_TOOL_NAMES, [
    'searchPrototypeItems', 'getPrototypeItem', 'filterPrototypeItems', 'listPrototypeTopics',
    'listPrototypeStatuses', 'comparePrototypeItems', 'getPrototypeLinks',
  ]);
  assert.throws(() => executeEngineerPrototypeTool('runShell', { command: 'env' }, { items: [] }), /engineer_tool_not_allowed/);
  assert.throws(() => executeEngineerPrototypeTool('deployPrototype', {}, { items: [] }), /engineer_tool_not_allowed/);
});

test('Prototype normalization excludes private states, redacts secrets, and validates links', () => {
  for (const visibility of ['Draft', 'Hidden', 'Private', 'Archived', 'Unknown', '']) {
    assert.equal(normalizePrototypeToolItem({ id: visibility, name: 'Blocked', visibility }, 'airtable'), null);
  }
  const item = normalizePrototypeToolItem({
    ...rawItems[0],
    summary: 'API_KEY=super-secret-value token=another-secret',
    demoUrl: 'javascript:alert(1)',
    githubUrl: 'https://example.com/not-github',
    researchLink: 'https://notion.so/private-page',
    token: 'must-never-be-returned',
  }, 'airtable');
  assert.equal(item.demoUrl, '');
  assert.equal(item.githubUrl, '');
  assert.equal(item.researchUrl, '');
  assert.doesNotMatch(JSON.stringify(item), /super-secret|another-secret|must-never/);
  assert.equal('token' in item, false);
});

test('public Prototype loader reuses Airtable Demo output and preserves only normalized public fields', async () => {
  const loaded = await loadPublicPrototypeItems({
    getModuleDemosImpl: async () => ({ source: 'airtable', items: [...rawItems, { id: 'private', name: 'Private', visibility: 'Private' }] }),
  });
  assert.equal(loaded.sourcePlatform, 'airtable');
  assert.deepEqual(loaded.items.map(({ id }) => id), ['demo-ai-tutor', 'demo-dashboard']);
  assert.equal(loaded.items[0].sourceDatabase, 'demos');
  assert.equal(loaded.items[0].githubUrl, 'https://github.com/JoeyAJ/ai-tutor');
});

test('Prototype search, filters, topics, statuses, comparison, and validated links are deterministic', () => {
  const publicData = data();
  assert.deepEqual(searchPrototypeItems(publicData, { query: 'adaptive' }).items.map(({ id }) => id), ['demo-ai-tutor']);
  assert.deepEqual(filterPrototypeItems(publicData, { techStack: 'Vite', year: 2025 }).items.map(({ id }) => id), ['demo-dashboard']);
  assert.ok(listPrototypeTopics(publicData).topics.some(({ name }) => name === 'React'));
  assert.ok(listPrototypeStatuses(publicData).statuses.some(({ name }) => name === 'MVP'));
  assert.deepEqual(comparePrototypeItems(publicData, { ids: ['demo-ai-tutor', 'dashboard'] }).comparison.map(({ id }) => id), ['demo-ai-tutor', 'demo-dashboard']);
  assert.equal(getPrototypeLinks(publicData, { id: 'ai-tutor' }).links.demoUrl, 'https://demo.example.com/ai-tutor');
});

test('fact classification and structured plan never claim execution completion', () => {
  const comparison = comparePrototypeItems(data(), { ids: ['ai-tutor', 'dashboard'] });
  const facts = buildEngineerFactClassification([comparison]);
  assert.ok(facts.verified.length >= 2);
  assert.ok(facts.inferred.some(({ text }) => /React/.test(text)));
  assert.ok(facts.recommended.length);
  assert.ok(facts.unknown.length);

  const plan = buildEngineerDevelopmentPlan([comparison], { query: 'Create an MVP sprint and acceptance test plan' });
  assert.equal(plan.verificationStatus, 'unverified');
  assert.ok(plan.tasks.every(({ status }) => status === 'planned'));
  assert.ok(plan.tests.every(({ status }) => status === 'planned'));
  assert.doesNotMatch(JSON.stringify(plan), /"status":"(?:completed|passed|deployed)"/);
  assert.equal(buildEngineerDevelopmentPlan([comparison], { query: 'List demos' }), null);
});

test('Prototype source failures and empty results remain explicit', async () => {
  await assert.rejects(() => loadPublicPrototypeItems({ getModuleDemosImpl: async () => ({ source: 'airtable' }) }), /prototype_source_invalid/);
  assert.deepEqual(searchPrototypeItems({ sourcePlatform: 'airtable', items: [] }, { query: 'nothing' }).items, []);
});
