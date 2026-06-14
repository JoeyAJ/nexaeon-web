import assert from 'node:assert/strict';
import test from 'node:test';

import { AGENT_SOURCES } from '../lib/agent/sourceRegistry.js';
import {
  createKnowledgeDocuments,
  createKnowledgeDocumentsFromPayloads,
  uniqueCompactArray,
} from '../lib/agent/knowledgeDocuments.js';
import { normalizeQuery, retrieveKnowledge } from '../lib/agent/retrieval.js';

const SOURCE_FIXTURES = {
  identity: [{
    id: 'identity-one',
    name: 'Nexōn AI Assistant',
    identityType: 'AI Assistant',
    shortPositioning: 'Language mediator for public knowledge',
    fullIntroduction: 'Public assistant role for research and teaching.',
    corePhilosophy: 'Help people understand questions.',
    roleTags: ['Nexōn', 'Nexōn', 'AI Assistant'],
    notes: 'secret notes',
    visibility: 'Internal',
  }],
  research: [{
    id: 'research-one',
    title: 'AI Tutor Research',
    summaryZh: '繁中研究摘要',
    summaryKo: '한국어 연구 요약',
    summaryEn: 'English research summary',
    theoryModels: ['TAM', 'SRL'],
    variables: ['Learning engagement'],
    sourceUrl: 'https://example.com/research',
  }],
  teaching: [{
    id: 'teaching-one',
    title: 'Prompt Engineering Workshop',
    summary: 'English teaching summary',
    teachingCategory: 'Workshop',
    targetAudience: ['Students', 'Students'],
    tags: ['Prompt', 'AI Literacy'],
  }],
  knowledge: [{
    id: 'knowledge-one',
    titleZh: '知識節點',
    titleKo: '지식 노드',
    titleEn: 'Knowledge Node',
    summaryZh: '繁中知識摘要',
    summaryKo: '한국어 지식 요약',
    summaryEn: 'English knowledge summary',
    tags: ['Knowledge', 'AI Tutor'],
    sourceUrl: 'javascript:alert(1)',
  }],
  demos: [{
    id: 'demo-one',
    name: '繁中 Demo',
    demoType: 'AI Tutor',
    status: 'Testing',
    translations: {
      zh: { name: '繁中 Demo', summary: '繁中 Demo 摘要', problem: '繁中問題', solution: '繁中解法', coreFeatures: '繁中特色', nextStep: '繁中下一步' },
      ko: { name: '한국어 Demo', summary: '한국어 Demo 요약', problem: '한국어 문제', solution: '한국어 해결', coreFeatures: '한국어 기능', nextStep: '한국어 다음' },
      en: { name: 'English Demo', summary: 'English Demo summary', problem: 'English problem', solution: 'English solution', coreFeatures: 'English feature', nextStep: 'English next' },
    },
    techStack: ['React'],
    demoUrl: 'https://example.com/demo',
  }],
  action: [{
    id: 'action-one',
    name: 'Website Build',
    projectType: 'Website',
    status: 'In Progress',
    publicSummary: 'Public build progress',
    currentPhase: 'Agent foundation',
    owner: 'private owner',
    blockers: 'private blocker',
  }],
  collaboration: [{
    id: 'collaboration-one',
    title: 'University Workshop',
    summary: 'Public collaboration summary',
    organizationType: 'University',
    collaborationTypes: ['Workshop', 'Research'],
    publicStage: 'Open',
    email: 'private@example.com',
  }],
};

test('seven public sources convert into Knowledge Documents', () => {
  for (const source of AGENT_SOURCES) {
    const docs = createKnowledgeDocuments(source.id, SOURCE_FIXTURES[source.id], 'en');
    assert.equal(docs.length, 1, source.id);
    assert.equal(docs[0].sourceId, source.id);
    assert.ok(docs[0].title);
    assert.ok(docs[0].searchableText);
  }
});

test('empty values and arrays are normalized safely', () => {
  assert.deepEqual(uniqueCompactArray(['AI', '', 'ai', null, ['Tutor']]), ['AI', 'Tutor']);
  const docs = createKnowledgeDocuments('identity', [{ id: 'empty', name: '', roleTags: ['', 'NexAeon'] }], 'en');
  assert.equal(docs.length, 1);
  assert.deepEqual(docs[0].tags, ['NexAeon']);
});

test('long content is truncated', () => {
  const docs = createKnowledgeDocuments('action', [{
    id: 'long',
    name: 'Long Project',
    publicSummary: 'x'.repeat(5000),
  }], 'en');
  assert.ok(docs[0].summary.length < 2000);
  assert.ok(docs[0].searchableText.length <= 6000);
});

test('internal fields do not enter Knowledge Documents', () => {
  const docs = createKnowledgeDocumentsFromPayloads(SOURCE_FIXTURES, 'en');
  const serialized = JSON.stringify(docs).toLowerCase();
  for (const forbidden of ['secret notes', 'visibility', 'private owner', 'private@example.com', 'private blocker']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test('localized summaries do not bleed across language indexes', () => {
  const zh = createKnowledgeDocuments('research', SOURCE_FIXTURES.research, 'zh')[0];
  const ko = createKnowledgeDocuments('research', SOURCE_FIXTURES.research, 'ko')[0];
  const en = createKnowledgeDocuments('research', SOURCE_FIXTURES.research, 'en')[0];

  assert.ok(zh.searchableText.includes('繁中研究摘要'));
  assert.equal(ko.searchableText.includes('繁中研究摘要'), false);
  assert.equal(en.searchableText.includes('한국어 연구 요약'), false);
  assert.equal(zh.searchableText.includes('English research summary'), false);
});

test('title matches outrank summary matches and summary outranks content', () => {
  const docs = [
    { id: 'summary', moduleKey: 'research', sourceId: 'research', title: 'Other', summary: 'adaptive learning', content: '', tags: [], updatedAt: '' },
    { id: 'title', moduleKey: 'research', sourceId: 'research', title: 'Adaptive Learning', summary: '', content: '', tags: [], updatedAt: '' },
    { id: 'content', moduleKey: 'research', sourceId: 'research', title: 'Other 2', summary: '', content: 'adaptive learning', tags: [], updatedAt: '' },
  ];
  const results = retrieveKnowledge(docs, 'adaptive learning');
  assert.deepEqual(results.map((result) => result.document.id), ['title', 'summary', 'content']);
});

test('exact phrase match outranks scattered terms', () => {
  const docs = [
    { id: 'scattered', moduleKey: 'research', sourceId: 'research', title: 'Learning with adaptive tools', summary: '', content: '', tags: [], updatedAt: '' },
    { id: 'phrase', moduleKey: 'research', sourceId: 'research', title: 'Adaptive learning', summary: '', content: '', tags: [], updatedAt: '' },
  ];
  assert.equal(retrieveKnowledge(docs, 'adaptive learning')[0].document.id, 'phrase');
});

test('English plural query variants can match singular public titles', () => {
  const docs = [
    { id: 'demo', moduleKey: 'projects', sourceId: 'demos', title: 'Learning Demo', summary: '', content: '', tags: [], updatedAt: '' },
  ];

  assert.equal(retrieveKnowledge(docs, 'public demos')[0].document.id, 'demo');
});

test('module filter, de-duplication, limit, empty query, long query, and deterministic sorting', () => {
  const docs = [
    { id: 'a', moduleKey: 'research', sourceId: 'research', title: 'AI Tutor', summary: '', content: '', tags: [], updatedAt: '2026-01-01' },
    { id: 'a', moduleKey: 'research', sourceId: 'research', title: 'AI Tutor duplicate', summary: '', content: '', tags: [], updatedAt: '2026-01-02' },
    { id: 'b', moduleKey: 'teaching', sourceId: 'teaching', title: 'AI Tutor Teaching', summary: '', content: '', tags: [], updatedAt: '2026-01-03' },
    { id: 'c', moduleKey: 'research', sourceId: 'research', title: 'AI Tutor Research', summary: '', content: '', tags: [], updatedAt: '2026-01-04' },
  ];

  assert.deepEqual(retrieveKnowledge(docs, '', { limit: 8 }), []);
  assert.equal(normalizeQuery('x'.repeat(500)).length, 300);
  assert.deepEqual(retrieveKnowledge(docs, 'AI Tutor', { moduleKey: 'research' }).map((result) => result.document.id), ['c', 'a']);
  assert.equal(retrieveKnowledge(docs, 'AI Tutor', { limit: 1 }).length, 1);
  assert.deepEqual(
    retrieveKnowledge(docs, 'AI Tutor').map((result) => result.document.id),
    retrieveKnowledge(docs, 'AI Tutor').map((result) => result.document.id),
  );
});

test('invalid external URLs are not clickable', () => {
  const doc = createKnowledgeDocuments('knowledge', SOURCE_FIXTURES.knowledge, 'en')[0];
  assert.equal(doc.sourceUrl, '');
});
