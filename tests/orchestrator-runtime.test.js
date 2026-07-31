import assert from 'node:assert/strict';
import test from 'node:test';

import handler from '../api/agent/chat.js';
import {
  ORCHESTRATOR_SYSTEM_PROMPT,
  buildOrchestratorAnswerRequest,
  buildOrchestratorInstruction,
  buildOrchestratorToolSelectionRequest,
  extractOrchestratorToolCalls,
  handleOrchestratorChatRequest,
  validateOrchestratorRequestBody,
} from '../lib/agent/orchestratorRuntime.js';
import { ORCHESTRATOR_TOOL_NAMES } from '../lib/agent/orchestratorActionTools.js';

function createReq(body = { message: 'Create a cross-module execution plan', locale: 'en' }, query = {}) {
  return { method: 'POST', body, query, headers: { origin: 'https://nexaeon-web.vercel.app', 'user-agent': `orchestrator-test-${Math.random()}` } };
}

function createRes() {
  return { statusCode: 200, headers: {}, payload: null, setHeader(key, value) { this.headers[key.toLowerCase()] = value; }, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } };
}

function actionData() {
  return { sourcePlatform: 'airtable', items: [{
    id: 'action-public', title: 'Public action', summary: 'Coordinate a public project.', actionType: 'Research',
    status: 'Planned', priority: 'High', startDate: '', dueDate: '2026-08-10', progress: 0,
    currentPhase: 'Planning', nextAction: 'Review scope', owner: '', dependencies: [], blockers: [], milestones: [],
    projectId: 'action-public', projectName: 'Public action', automationStatus: 'Not Connected', githubUrl: '', deploymentUrl: '', evidenceUrl: '',
    sourcePlatform: 'airtable', sourceDatabase: 'action-projects', sourceRoute: '/field-lab', sourceUrl: '', updatedAt: '',
  }] };
}

const config = { enabled: true, hasApiKey: true, forceSourcesOnly: false, model: 'test-model', maxOutputTokens: 800 };

async function callOrchestrator({
  body,
  loadPublicActionItems = async () => actionData(),
  selectOrchestratorToolCalls = async () => ({ calls: [{ name: 'buildExecutionPlan', args: { objective: 'Coordinate work' } }] }),
  createOrchestratorGroundedAnswer = async ({ lang }) => ({ parsed: {
    answer: lang === 'ko' ? '확인됨: 공개 작업입니다. proposed plan입니다. [S1]' : 'Verified: this is a public action and the plan is proposed. [S1]',
    citedSourceIds: ['S1'], suggestedQuestions: [], localizedCitations: [{ sourceId: 'S1', title: 'Public action', summary: 'Coordinate a public project.', typeLabel: 'Research', moduleLabel: 'Action Center' }],
  } }),
  moderateText = async () => false,
} = {}) {
  const res = createRes();
  await handleOrchestratorChatRequest(createReq(body), res, {
    skipCooldown: true, config, openai: {}, logger: () => {}, loadPublicActionItems,
    selectOrchestratorToolCalls, createOrchestratorGroundedAnswer, moderateText,
  });
  return res;
}

test('Orchestrator has independent identity and strict read-only, no-notification, no-execution policy', () => {
  const prompt = ORCHESTRATOR_SYSTEM_PROMPT.join('\n');
  assert.match(prompt, /NexAeon Orchestrator/); assert.match(prompt, /Verified, Inferred, Recommended, or Unknown/);
  assert.match(prompt, /Never invent task status, owner, deadline/); assert.match(prompt, /Do not run code, shell commands/);
  assert.match(prompt, /Do not write to Airtable, Notion, GitHub, Vercel/); assert.match(prompt, /Never call another Agent/);
  assert.match(buildOrchestratorInstruction('ko'), /Korean/); assert.match(buildOrchestratorInstruction('zh'), /Traditional Chinese/);
});

test('Orchestrator requests are bounded by the Action allowlist with tools disabled while answering', () => {
  assert.equal(validateOrchestratorRequestBody({ message: '실행 계획', locale: 'ko', history: [] }).ok, true);
  assert.equal(validateOrchestratorRequestBody({ message: 'send email', recipient: 'x@example.com' }).ok, false);
  const selection = buildOrchestratorToolSelectionRequest({ query: 'Plan actions', lang: 'en', history: [], model: 'test-model' });
  assert.deepEqual(selection.tools.map(({ name }) => name), ORCHESTRATOR_TOOL_NAMES);
  const calls = extractOrchestratorToolCalls({ output: [{ type: 'function_call', name: 'sendEmail', arguments: '{}' }, ...ORCHESTRATOR_TOOL_NAMES.map((name) => ({ type: 'function_call', name, arguments: '{}' }))] });
  assert.deepEqual(calls.map(({ name }) => name), ORCHESTRATOR_TOOL_NAMES.slice(0, 4));
  const answer = buildOrchestratorAnswerRequest({ query: 'Plan', lang: 'en', history: [], numberedSources: [], executedTools: [], factClassification: {}, executionPlan: null, model: 'test-model' });
  assert.deepEqual(answer.tools, []); assert.equal(answer.tool_choice, 'none');
});

test('Orchestrator returns independent ID, citations, fact classification, and safe execution plan', async () => {
  const res = await callOrchestrator();
  assert.equal(res.statusCode, 200); assert.equal(res.payload.agentId, 'orchestrator'); assert.equal(res.payload.mode, 'ai');
  assert.deepEqual(res.payload.executedTools, ['buildExecutionPlan']); assert.equal(res.payload.citations[0].sourceRoute, '/field-lab');
  assert.ok(res.payload.factClassification.verified.length); assert.ok(res.payload.factClassification.recommended.length); assert.ok(res.payload.factClassification.unknown.length);
  assert.equal(res.payload.executionPlan.verificationStatus, 'unverified'); assert.ok(res.payload.executionPlan.tasks.every(({ status }) => status === 'proposed'));
  assert.ok(res.payload.executionPlan.crossModulePlan.every(({ status }) => status === 'proposed'));
});

test('Orchestrator follows Korean and returns explicit empty and tool-error states', async () => {
  const ko = await callOrchestrator({ body: { message: '실행 계획을 만들어 주세요', locale: 'ko' } });
  assert.match(ko.payload.answer, /proposed plan/);
  const empty = await callOrchestrator({ loadPublicActionItems: async () => ({ sourcePlatform: 'airtable', items: [] }) });
  assert.equal(empty.payload.reason, 'no_sources'); assert.deepEqual(empty.payload.citations, []); assert.ok(empty.payload.factClassification.unknown.length);
  const failed = await callOrchestrator({ loadPublicActionItems: async () => { throw new Error('source failed'); } });
  assert.equal(failed.payload.reason, 'tool_unavailable'); assert.deepEqual(failed.payload.executedTools, []);
});

test('shared API function routes Orchestrator without adding a Serverless Function', async () => {
  const res = createRes();
  await handler(createReq({ message: 'List public actions', locale: 'en' }, { agent: 'orchestrator' }), res);
  assert.equal(res.statusCode, 200); assert.equal(res.payload.agentId, 'orchestrator'); assert.ok(Array.isArray(res.payload.executedTools));
});
