import assert from 'node:assert/strict';
import test from 'node:test';

import handler from '../api/agent/chat.js';
import {
  NETWORKER_SYSTEM_PROMPT,
  buildNetworkerAnswerRequest,
  buildNetworkerInstruction,
  buildNetworkerToolSelectionRequest,
  extractNetworkerToolCalls,
  handleNetworkerChatRequest,
  validateNetworkerRequestBody,
} from '../lib/agent/networkerRuntime.js';
import { NETWORKER_TOOL_NAMES } from '../lib/agent/networkerIdentityTools.js';

function createReq(body = { message: 'Build a collaboration map', locale: 'en' }, query = {}) {
  return { method: 'POST', body, query, headers: { origin: 'https://nexaeon-web.vercel.app', 'user-agent': `networker-test-${Math.random()}` } };
}

function createRes() {
  return { statusCode: 200, headers: {}, payload: null, setHeader(key, value) { this.headers[key.toLowerCase()] = value; }, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } };
}

function identityData() {
  return { sourcePlatform: 'notion', items: [{
    id: 'profile-public', displayName: 'Public Researcher', identityType: 'Researcher',
    identitySummary: 'Public AI education profile.', expertise: ['AI Education'], researchInterests: ['AI Tutor'],
    organizations: ['NexAeon'], collaborationInterests: ['Research'], projects: [], languages: ['English'],
    region: 'Daejeon', publicContact: [], profileUrl: '', corePhilosophy: '', sourcePlatform: 'notion',
    sourceDatabase: 'identity-profiles', sourceRoute: '/identity', sourceUrl: '', updatedAt: '',
  }] };
}

const config = { enabled: true, hasApiKey: true, forceSourcesOnly: false, model: 'test-model', maxOutputTokens: 800 };

async function callNetworker({
  body,
  loadPublicIdentityProfiles = async () => identityData(),
  selectNetworkerToolCalls = async () => ({ calls: [{ name: 'buildCollaborationMap', args: { objective: 'Map collaboration' } }] }),
  createNetworkerGroundedAnswer = async ({ lang }) => ({ parsed: {
    answer: lang === 'ko' ? '확인됨: 공개 Profile입니다. 잠재 관계는 권장 사항입니다. [S1]' : 'Verified: this is a public profile. Any potential relation is recommended only. [S1]',
    citedSourceIds: ['S1'], suggestedQuestions: [], localizedCitations: [{ sourceId: 'S1', title: 'Public Researcher', summary: 'Public AI education profile.', typeLabel: 'Researcher', moduleLabel: 'Identity' }],
  } }),
  moderateText = async () => false,
} = {}) {
  const res = createRes();
  await handleNetworkerChatRequest(createReq(body), res, {
    skipCooldown: true, config, openai: {}, logger: () => {}, loadPublicIdentityProfiles,
    selectNetworkerToolCalls, createNetworkerGroundedAnswer, moderateText,
  });
  return res;
}

test('Networker has independent identity and strict privacy, no-contact, no-scraping policy', () => {
  const prompt = NETWORKER_SYSTEM_PROMPT.join('\n');
  assert.match(prompt, /NexAeon Networker/);
  assert.match(prompt, /Verified, Inferred, Recommended, or Unknown/);
  assert.match(prompt, /Never invent a person, organization/);
  assert.match(prompt, /Never claim anyone is willing to collaborate/);
  assert.match(prompt, /social-profile scraping/);
  assert.match(prompt, /Do not write to Airtable, Notion, contacts/);
  assert.match(buildNetworkerInstruction('ko'), /Korean/);
  assert.match(buildNetworkerInstruction('zh'), /Traditional Chinese/);
});

test('Networker requests are bounded by the Identity allowlist and answer phase has no tools', () => {
  assert.equal(validateNetworkerRequestBody({ message: '협업 지도를 만들어 주세요', locale: 'ko', history: [] }).ok, true);
  assert.equal(validateNetworkerRequestBody({ message: 'send email', recipient: 'x@example.com' }).ok, false);
  const selection = buildNetworkerToolSelectionRequest({ query: 'Compare profiles', lang: 'en', history: [], model: 'test-model' });
  assert.deepEqual(selection.tools.map(({ name }) => name), NETWORKER_TOOL_NAMES);
  const calls = extractNetworkerToolCalls({ output: [{ type: 'function_call', name: 'sendEmail', arguments: '{}' }, ...NETWORKER_TOOL_NAMES.map((name) => ({ type: 'function_call', name, arguments: '{}' }))] });
  assert.deepEqual(calls.map(({ name }) => name), NETWORKER_TOOL_NAMES.slice(0, 4));
  const answer = buildNetworkerAnswerRequest({ query: 'Map', lang: 'en', history: [], numberedSources: [], executedTools: [], factClassification: {}, collaborationMap: null, model: 'test-model' });
  assert.deepEqual(answer.tools, []);
  assert.equal(answer.tool_choice, 'none');
});

test('Networker returns independent ID, citations, classification, and safe collaboration map', async () => {
  const res = await callNetworker();
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.agentId, 'networker');
  assert.equal(res.payload.mode, 'ai');
  assert.deepEqual(res.payload.executedTools, ['buildCollaborationMap']);
  assert.equal(res.payload.citations[0].sourceRoute, '/identity');
  assert.ok(res.payload.factClassification.verified.length);
  assert.ok(res.payload.factClassification.recommended.length);
  assert.ok(res.payload.factClassification.unknown.length);
  assert.equal(res.payload.collaborationMap.verificationStatus, 'unverified');
  assert.ok(res.payload.collaborationMap.nodes.every(({ verificationStatus }) => verificationStatus === 'verified'));
});

test('Networker follows Korean and returns explicit empty and tool-error states', async () => {
  const ko = await callNetworker({ body: { message: '협업 지도를 만들어 주세요', locale: 'ko' } });
  assert.match(ko.payload.answer, /권장/);
  const empty = await callNetworker({ loadPublicIdentityProfiles: async () => ({ sourcePlatform: 'notion', items: [] }) });
  assert.equal(empty.payload.reason, 'no_sources');
  assert.deepEqual(empty.payload.citations, []);
  assert.ok(empty.payload.factClassification.unknown.length);
  const failed = await callNetworker({ loadPublicIdentityProfiles: async () => { throw new Error('source failed'); } });
  assert.equal(failed.payload.reason, 'tool_unavailable');
  assert.deepEqual(failed.payload.executedTools, []);
});

test('shared API function routes Networker without adding a Serverless Function', async () => {
  const res = createRes();
  await handler(createReq({ message: 'List public profiles', locale: 'en' }, { agent: 'networker' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.agentId, 'networker');
  assert.ok(Array.isArray(res.payload.executedTools));
});
