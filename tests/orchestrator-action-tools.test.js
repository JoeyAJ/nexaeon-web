import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ORCHESTRATOR_TOOL_NAMES,
  buildOrchestratorExecutionPlan,
  buildOrchestratorFactClassification,
  executeOrchestratorActionTool,
  filterActionItems,
  findBlockedActions,
  groupActionsByProject,
  listActionPriorities,
  listActionStatuses,
  loadPublicActionItems,
  normalizeActionToolItem,
  searchActionItems,
} from '../lib/agent/orchestratorActionTools.js';

const rawItems = [
  {
    id: 'action-research', name: 'Research review', publicSummary: 'Review public AI education literature.', visibility: 'Public',
    projectType: 'Research', status: 'In Progress', priority: 'High', dueDate: '2026-08-10', nextAction: 'Review evidence',
    publicOwner: 'Research team', dependencies: ['action-knowledge'], deploymentUrl: 'https://nexaeon.example.com/research',
  },
  {
    id: 'action-knowledge', name: 'Knowledge index', publicSummary: 'Organize public notes.', visibility: 'Published',
    projectType: 'Knowledge', status: 'Blocked', priority: 'Medium', dueDate: '2026-08-20', blockers: ['Awaiting public taxonomy'],
    evidenceUrl: 'https://example.com/evidence',
  },
];

function data() {
  return { sourcePlatform: 'airtable', items: rawItems.map((item) => normalizeActionToolItem(item, 'airtable')) };
}

test('Orchestrator exposes the exact read-only Action allowlist and rejects write, notification, and execution tools', () => {
  assert.deepEqual(ORCHESTRATOR_TOOL_NAMES, [
    'searchActionItems', 'getActionItem', 'filterActionItems', 'listActionStatuses', 'listActionPriorities',
    'findBlockedActions', 'groupActionsByProject', 'buildExecutionPlan',
  ]);
  for (const name of ['createTask', 'updateAirtable', 'sendEmail', 'createCalendarEvent', 'runShell', 'deploy']) {
    assert.throws(() => executeOrchestratorActionTool(name, {}, { items: [] }), /orchestrator_tool_not_allowed/);
  }
});

test('Action normalization excludes non-public records, redacts secrets, and validates links', () => {
  for (const visibility of ['Draft', 'Hidden', 'Private', 'Archived', 'Unknown', '']) {
    assert.equal(normalizeActionToolItem({ id: visibility, name: 'Blocked', visibility }, 'airtable'), null);
  }
  const item = normalizeActionToolItem({
    ...rawItems[0], publicSummary: 'API_KEY=super-secret token=another-secret',
    githubUrl: 'https://example.com/not-github', deploymentUrl: 'javascript:alert(1)', evidenceUrl: 'https://notion.so/private',
    email: 'private@example.com', password: 'must-never-return',
  }, 'airtable');
  assert.equal(item.githubUrl, ''); assert.equal(item.deploymentUrl, ''); assert.equal(item.evidenceUrl, '');
  assert.doesNotMatch(JSON.stringify(item), /super-secret|another-secret|private@example|must-never/);
  assert.equal('email' in item, false); assert.equal('password' in item, false);
});

test('public Action loader reuses the Action Center API output and preserves normalized public fields only', async () => {
  const loaded = await loadPublicActionItems({
    getActionProjectsImpl: async () => ({ source: 'airtable', items: [...rawItems, { id: 'private', name: 'Private', visibility: 'Private' }] }),
  });
  assert.equal(loaded.sourcePlatform, 'airtable');
  assert.deepEqual(loaded.items.map(({ id }) => id), ['action-research', 'action-knowledge']);
  assert.equal(loaded.items[0].sourceDatabase, 'action-projects');
  assert.equal(loaded.items[0].owner, 'Research team');
  assert.equal('visibility' in loaded.items[0], false);
});

test('Action search, filters, status, priority, blockers, dependencies, and project grouping are deterministic', () => {
  const publicData = data();
  assert.deepEqual(searchActionItems(publicData, { query: 'literature' }).items.map(({ id }) => id), ['action-research']);
  assert.deepEqual(filterActionItems(publicData, { priority: 'High', owner: 'Research' }).items.map(({ id }) => id), ['action-research']);
  assert.ok(listActionStatuses(publicData).statuses.some(({ name }) => name === 'Blocked'));
  assert.ok(listActionPriorities(publicData).priorities.some(({ name }) => name === 'High'));
  const blocked = findBlockedActions(publicData);
  assert.deepEqual(blocked.items.map(({ id }) => id), ['action-research', 'action-knowledge']);
  assert.match(JSON.stringify(blocked.blocked), /Unresolved dependency|Awaiting public taxonomy/);
  assert.equal(groupActionsByProject(publicData).projects.length, 2);
});

test('classification and structured plan distinguish facts and keep all new execution states proposed or planned', () => {
  const results = [executeOrchestratorActionTool('buildExecutionPlan', { objective: 'Coordinate modules' }, data())];
  const facts = buildOrchestratorFactClassification(results, { lang: 'en' });
  assert.equal(facts.verified.length, 2); assert.ok(facts.inferred.length); assert.ok(facts.recommended.length); assert.ok(facts.unknown.length);
  const plan = buildOrchestratorExecutionPlan(results, { query: 'Create a cross-module execution plan with milestones', lang: 'en' });
  assert.equal(plan.verificationStatus, 'unverified');
  assert.ok(plan.tasks.every(({ status }) => status === 'proposed'));
  assert.ok(plan.milestones.every(({ status }) => status === 'proposed'));
  assert.ok(plan.acceptanceCriteria.every(({ status }) => status === 'planned'));
  assert.ok(plan.crossModulePlan.every(({ status }) => status === 'proposed'));
  assert.doesNotMatch(JSON.stringify(plan), /"status":"(?:completed|in progress|assigned|notified)"/iu);
});

test('Action source failures and empty results remain explicit', async () => {
  await assert.rejects(() => loadPublicActionItems({ getActionProjectsImpl: async () => ({ source: 'airtable' }) }), /action_source_invalid/);
  assert.deepEqual(searchActionItems({ sourcePlatform: 'airtable', items: [] }, { query: 'nothing' }).items, []);
});
