import { readFile } from 'node:fs/promises';
import { detectQueryIntent } from '../lib/agent/queryIntent.js';
import {
  createCatalogAnswer,
  createSourcesListAnswer,
  numberRetrievedSources,
  retrievePublicKnowledgeForChat,
  validateModelOutput,
  validateSuggestedQuestions,
} from '../lib/agent/chatRuntime.js';
import { buildDeveloperInstruction } from '../lib/agent/chatRuntime.js';

const FIXTURE_PATH = new URL('../tests/fixtures/navigator-evals.json', import.meta.url);

const MOCK_PAYLOADS = {
  '/api/identity/profiles': {
    source: 'notion',
    reason: null,
    count: 1,
    updatedAt: null,
    items: [{
      id: 'identity-one',
      name: 'NexAeon Living Digital Institute',
      identityType: 'Digital Institute',
      shortPositioning: 'NexAeon public identity and research interface.',
      fullIntroduction: 'NexAeon connects identity, research, teaching, knowledge, demos, action, and collaboration.',
      roleTags: ['NexAeon', 'Identity'],
    }],
  },
  '/api/research/literature': {
    source: 'notion',
    reason: null,
    count: 1,
    updatedAt: null,
    items: [{
      id: 'research-one',
      title: 'AI education research direction',
      summary: 'AI education, personalized AI tutoring, learning analytics, and higher education practice.',
      theoryModels: ['AI education', 'Learning analytics'],
      variables: ['Personalized learning'],
    }],
  },
  '/api/teaching/courses': {
    source: 'notion',
    reason: null,
    count: 1,
    updatedAt: null,
    items: [{
      id: 'teaching-one',
      title: 'Learning Coaching Philosophy',
      summary: '學習教練 / 학습 코칭 / Learning Coaching helps students use AI for problem understanding.',
      teachingCategory: 'Learning Coaching',
      targetAudience: ['Students'],
    }],
  },
  '/api/knowledge/resources': {
    source: 'notion',
    reason: null,
    count: 1,
    updatedAt: null,
    items: [{
      id: 'knowledge-one',
      titleZh: '知識節點',
      titleKo: '지식 노드',
      titleEn: 'Knowledge Node',
      summaryZh: '知識實驗室的公開資源。',
      summaryKo: 'Knowledge Lab 공개 리소스입니다.',
      summaryEn: 'A public Knowledge Lab resource.',
      tags: ['Knowledge Lab'],
    }],
  },
  '/api/modules/demos': {
    source: 'airtable',
    reason: null,
    count: 1,
    updatedAt: null,
    items: [{
      slug: 'nexaeon-ai-tutoring-mvp',
      name: 'NexAeon AI Tutoring MVP',
      demoType: 'AI Tutor',
      status: 'Testing',
      summary: 'A personalized AI Tutor prototype.',
      translations: {
        zh: { name: 'NexAeon AI Tutoring MVP', summary: '研究型個別化 AI Tutor 原型，聚焦提問診斷、分層提示、任務拆解與學習反思。' },
        ko: { name: 'NexAeon AI Tutoring MVP', summary: '질문 진단, 단계별 힌트, 과제 분해 및 학습 성찰에 초점을 둔 개인화 AI Tutor 프로토타입입니다.' },
        en: { name: 'NexAeon AI Tutoring MVP', summary: 'A personalized AI Tutor prototype focused on diagnostic questioning, layered hints, task decomposition, and learning reflection.' },
      },
      techStack: ['React', 'RAG'],
      relatedModules: ['Learning Coaching'],
      targetUsers: ['Students'],
    }],
  },
  '/api/action/projects': {
    source: 'airtable',
    reason: null,
    count: 1,
    updatedAt: null,
    items: [{
      id: 'action-one',
      name: 'Website Stabilization / 網站穩定化 / 웹사이트 안정화',
      projectType: 'Action Project',
      status: 'In Progress',
      publicSummary: 'Public action project for stabilizing the NexAeon website.',
      currentPhase: 'Production controls',
    }],
  },
  '/api/collaboration/options': {
    source: 'airtable',
    reason: null,
    count: 1,
    updatedAt: null,
    items: [{
      id: 'collab-one',
      title: 'University Workshop / 大學工作坊 / 대학 워크숍',
      summary: 'Public collaboration option for university workshops.',
      organizationType: 'University',
      collaborationTypes: ['Workshop', 'Research'],
      publicStage: 'Open',
    }],
  },
};

async function mockFetch(url, failEndpoints = []) {
  if (failEndpoints.includes(new URL(url).pathname)) {
    return {
      ok: false,
      json: async () => ({}),
    };
  }
  const payload = MOCK_PAYLOADS[new URL(url).pathname];
  return {
    ok: Boolean(payload),
    json: async () => payload,
  };
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function runCase(entry) {
  const intent = detectQueryIntent(entry.query);
  assertEqual(intent.intent, entry.expectedIntent, `${entry.id} intent`);
  assertEqual(intent.sourceIntent, entry.expectedSourceIntent, `${entry.id} sourceIntent`);
  if (entry.expectedQueryType) assertEqual(intent.queryType, entry.expectedQueryType, `${entry.id} queryType`);
  if (entry.expectedSourceIntents) assertEqual(intent.sourceIntents, entry.expectedSourceIntents, `${entry.id} sourceIntents`);

  const retrieval = await retrievePublicKnowledgeForChat({
    req: { headers: { host: 'localhost:4173' } },
    query: entry.query,
    lang: entry.lang,
    baseUrl: 'https://eval.local',
    fetchImpl: (url) => mockFetch(url, entry.failEndpoints || []),
  });
  if (entry.allowPartialSources === false && retrieval.partialSources) {
    throw new Error(`${entry.id} unexpected partial sources`);
  }
  if (entry.expectPartialSources && !retrieval.partialSources) {
    throw new Error(`${entry.id} expected partial sources`);
  }
  const sourceIds = [...new Set(retrieval.results.map((result) => result.document.sourceId))];
  for (const expectedSourceId of entry.expectedSourceIds) {
    if (!sourceIds.includes(expectedSourceId)) {
      throw new Error(`${entry.id} missing expected source ${expectedSourceId}`);
    }
  }
  if (entry.expectedSourceIntent === 'demos' && entry.expectedSourceIds.length === 1) {
    assertEqual(sourceIds, ['demos'], `${entry.id} demo catalog sourceIds`);
  }
  for (const forbiddenSourceId of entry.forbiddenSourceIds || []) {
    if (sourceIds.includes(forbiddenSourceId)) throw new Error(`${entry.id} contains forbidden source ${forbiddenSourceId}`);
  }

  const numberedSources = numberRetrievedSources(retrieval.results, entry.lang);
  const answer = entry.expectedIntent === 'list' && entry.expectedSourceIntent === 'demos'
    ? createCatalogAnswer({ numberedSources, lang: entry.lang })
    : createSourcesListAnswer({ numberedSources, lang: entry.lang });

  for (const keyword of entry.expectedKeywords || []) {
    if (!answer.includes(keyword) && !JSON.stringify(retrieval.results).includes(keyword)) {
      throw new Error(`${entry.id} missing expected keyword`);
    }
  }
  for (const forbidden of entry.mustNotContain || []) {
    if (answer.includes(forbidden)) throw new Error(`${entry.id} contains forbidden text`);
  }
  if (entry.expectSourcesOnlyFallback && !/\[S\d+\]/.test(answer)) {
    throw new Error(`${entry.id} missing citation marker`);
  }
  if (entry.expectNoSources && entry.expectedSourceIds.length === 0 && retrieval.results.length !== 0) {
    throw new Error(`${entry.id} expected no sources`);
  }

  if (entry.validateCitationMarkers && numberedSources.length) {
    const valid = validateModelOutput({
      answer: `${numberedSources[0].title} [S1]`,
      citedSourceIds: ['S1'],
      suggestedQuestions: ['What public demos are currently available?'],
    }, numberedSources, { query: entry.query, lang: entry.lang, queryIntent: retrieval.queryIntent });
    if (!valid.ok || valid.citedSourceIds[0] !== 'S1') throw new Error(`${entry.id} citation validation failed`);
    const invalid = validateModelOutput({
      answer: `${numberedSources[0].title} [S99]`,
      citedSourceIds: ['S99'],
      suggestedQuestions: [],
    }, numberedSources, { query: entry.query, lang: entry.lang, queryIntent: retrieval.queryIntent });
    if (invalid.ok) throw new Error(`${entry.id} invalid citation marker accepted`);
  }

  if (entry.validateSuggestedQuestions) {
    const suggestions = validateSuggestedQuestions({
      suggestions: entry.mockSuggestedQuestions || [],
      query: entry.query,
      lang: entry.lang,
      numberedSources,
      queryIntent: retrieval.queryIntent,
    });
    if (!suggestions.length || suggestions.length > 3) throw new Error(`${entry.id} invalid suggestion count`);
    const serializedSuggestions = suggestions.join('\n').toLowerCase();
    for (const forbidden of ['web search', 'search the web', 'email', 'calendar', 'notion', 'airtable', 'api key']) {
      if (serializedSuggestions.includes(forbidden)) throw new Error(`${entry.id} unsafe suggestion survived`);
    }
  }

  const instruction = buildDeveloperInstruction(entry.lang);
  if (entry.id.includes('prompt-injection') && instruction.includes(entry.query)) {
    throw new Error(`${entry.id} query leaked into developer instruction`);
  }
}

async function main() {
  const entries = JSON.parse(await readFile(FIXTURE_PATH, 'utf8'));
  let passed = 0;
  const failures = [];
  for (const entry of entries) {
    try {
      await runCase(entry);
      passed += 1;
    } catch (error) {
      failures.push(`${entry.id}: ${error.message}`);
    }
  }

  console.log('Navigator Offline Eval');
  console.log(`${passed}/${entries.length} passed`);
  if (failures.length) {
    console.log(failures.join('\n'));
    process.exitCode = 1;
  }
}

await main();
