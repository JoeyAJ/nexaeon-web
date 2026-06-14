import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createApiResponse } from '../api/_response.js';
import { createFallbackIdentityProfilesResponse } from '../src/data/identityProfileData.js';
import { createFallbackKnowledgeResponse } from '../src/data/knowledgeResourceData.js';
import { createFallbackLiteratureResponse } from '../src/data/literatureData.js';
import { getModuleData } from '../src/data/moduleData.js';

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const DIST_DIR = join(process.cwd(), 'dist');
const LOCAL_BASE_URL = `http://${HOST}:${PORT}`;

const DEMO_SHOWCASE_FIXTURE = [
  {
    id: 'demo-atlas',
    slug: 'atlas-demo',
    name: '智慧學習展示',
    demoType: 'AI Tutor',
    status: 'Testing',
    version: 'v0.4',
    featured: true,
    displayOrder: 2,
    summary: '繁中摘要',
    problem: '繁中問題',
    solution: '繁中解法',
    targetUsers: ['Students', 'Teachers'],
    coreFeatures: '診斷學習問題\n產生分層提示',
    techStack: ['React', 'Airtable'],
    launchMode: 'External',
    launchReady: true,
    launchActionMode: 'External',
    demoUrl: `${LOCAL_BASE_URL}/runtime-fixtures/external-demo.html`,
    githubUrl: 'https://github.com/JoeyAJ/nexaeon-web',
    coverImage: { url: '/assets/nexaeon-eye.png', filename: 'demo-cover.png' },
    relatedModules: ['Research', 'Projects'],
    researchLink: 'https://example.com/research',
    nextStep: '繁中下一步',
    translations: {
      zh: {
        name: '智慧學習展示',
        summary: '繁中摘要',
        problem: '繁中問題',
        solution: '繁中解法',
        coreFeatures: '診斷學習問題\n產生分層提示',
        nextStep: '繁中下一步',
      },
      ko: {
        name: '학습 데모',
        summary: '한국어 요약',
        problem: '한국어 문제',
        solution: '한국어 해결',
        coreFeatures: '학습 문제 진단\n단계별 힌트 생성',
        nextStep: '한국어 다음 단계',
      },
      en: {
        name: 'Learning Demo',
        summary: 'English summary',
        problem: 'English problem',
        solution: 'English solution',
        coreFeatures: 'Diagnose learning issues\nGenerate layered hints',
        nextStep: 'English next step',
      },
    },
    updatedAt: '2026-06-12T05:40:00.000Z',
  },
  {
    id: 'demo-embedded',
    slug: 'embedded-demo',
    name: '內嵌展示',
    demoType: 'Dashboard',
    status: 'Testing',
    version: 'v1.0',
    featured: false,
    displayOrder: 3,
    summary: '內嵌繁中摘要',
    problem: '',
    solution: '',
    targetUsers: ['Researchers'],
    coreFeatures: 'Runtime iframe',
    techStack: ['React'],
    launchMode: 'Embedded',
    launchReady: true,
    launchActionMode: 'Embedded',
    demoUrl: `${LOCAL_BASE_URL}/runtime-fixtures/embedded-demo.html`,
    githubUrl: '',
    coverImage: '',
    relatedModules: ['Projects'],
    researchLink: '',
    nextStep: '',
    translations: {
      zh: {
        name: '內嵌展示',
        summary: '內嵌繁中摘要',
        problem: '',
        solution: '',
        coreFeatures: 'Runtime iframe',
        nextStep: '',
      },
      ko: {
        name: '임베드 데모',
        summary: '임베드 한국어 요약',
        problem: '',
        solution: '',
        coreFeatures: 'Runtime iframe',
        nextStep: '',
      },
      en: {
        name: 'Embedded Demo',
        summary: 'Embedded English summary',
        problem: '',
        solution: '',
        coreFeatures: 'Runtime iframe',
        nextStep: '',
      },
    },
    updatedAt: '2026-06-12T06:40:00.000Z',
  },
  {
    id: 'demo-timeout',
    slug: 'timeout-demo',
    name: '逾時展示',
    demoType: 'Dashboard',
    status: 'Testing',
    version: 'v1.0',
    featured: false,
    displayOrder: 4,
    summary: '逾時繁中摘要',
    problem: '',
    solution: '',
    targetUsers: ['Researchers'],
    coreFeatures: 'Runtime timeout',
    techStack: ['React'],
    launchMode: 'Embedded',
    launchReady: true,
    launchActionMode: 'Embedded',
    demoUrl: `${LOCAL_BASE_URL}/runtime-fixtures/slow-embedded-demo.html`,
    githubUrl: '',
    coverImage: '',
    relatedModules: ['Projects'],
    researchLink: '',
    nextStep: '',
    translations: {
      zh: {
        name: '逾時展示',
        summary: '逾時繁中摘要',
        problem: '',
        solution: '',
        coreFeatures: 'Runtime timeout',
        nextStep: '',
      },
      ko: {
        name: '타임아웃 데모',
        summary: '타임아웃 한국어 요약',
        problem: '',
        solution: '',
        coreFeatures: 'Runtime timeout',
        nextStep: '',
      },
      en: {
        name: 'Timeout Demo',
        summary: 'Timeout English summary',
        problem: '',
        solution: '',
        coreFeatures: 'Runtime timeout',
        nextStep: '',
      },
    },
    updatedAt: '2026-06-12T07:40:00.000Z',
  },
  {
    id: 'demo-internal',
    slug: 'internal-demo',
    name: '站內展示',
    demoType: 'AI Tutor',
    status: 'Concept',
    version: 'v0.1',
    featured: false,
    displayOrder: 5,
    summary: '站內繁中摘要',
    problem: '',
    solution: '',
    targetUsers: ['Students'],
    coreFeatures: 'Internal registry',
    techStack: ['React'],
    launchMode: 'Internal',
    launchReady: false,
    launchActionMode: 'External',
    demoUrl: `${LOCAL_BASE_URL}/runtime-fixtures/internal-fallback.html`,
    githubUrl: '',
    coverImage: '',
    relatedModules: ['Projects'],
    researchLink: '',
    nextStep: '',
    translations: {
      zh: {
        name: '站內展示',
        summary: '站內繁中摘要',
        problem: '',
        solution: '',
        coreFeatures: 'Internal registry',
        nextStep: '',
      },
      ko: {
        name: '내부 Demo',
        summary: '내부 한국어 요약',
        problem: '',
        solution: '',
        coreFeatures: 'Internal registry',
        nextStep: '',
      },
      en: {
        name: 'Internal Demo',
        summary: 'Internal English summary',
        problem: '',
        solution: '',
        coreFeatures: 'Internal registry',
        nextStep: '',
      },
    },
    updatedAt: '2026-06-12T08:40:00.000Z',
  },
  {
    id: 'demo-invalid-url',
    slug: 'invalid-url-demo',
    name: '無效網址展示',
    demoType: 'Dashboard',
    status: 'Concept',
    version: '',
    featured: false,
    displayOrder: 6,
    summary: '無效網址繁中摘要',
    problem: '',
    solution: '',
    targetUsers: ['Researchers'],
    coreFeatures: '',
    techStack: ['Vite'],
    launchMode: 'External',
    launchReady: false,
    launchActionMode: '',
    demoUrl: 'javascript:alert(1)',
    githubUrl: '',
    coverImage: '',
    relatedModules: ['Knowledge Lab'],
    researchLink: '',
    nextStep: '',
    translations: {
      zh: {
        name: '無效網址展示',
        summary: '無效網址繁中摘要',
        problem: '',
        solution: '',
        coreFeatures: '',
        nextStep: '',
      },
      ko: {
        name: '잘못된 URL Demo',
        summary: '잘못된 URL 한국어 요약',
        problem: '',
        solution: '',
        coreFeatures: '',
        nextStep: '',
      },
      en: {
        name: 'Invalid URL Demo',
        summary: 'Invalid URL English summary',
        problem: '',
        solution: '',
        coreFeatures: '',
        nextStep: '',
      },
    },
    updatedAt: '2026-06-12T09:40:00.000Z',
  },
  {
    id: 'demo-bridge',
    slug: 'bridge-demo',
    name: '資料橋接展示',
    demoType: 'Dashboard',
    status: 'Concept',
    version: '',
    featured: false,
    displayOrder: 1,
    summary: '第二張繁中摘要',
    problem: '',
    solution: '',
    targetUsers: ['Researchers'],
    coreFeatures: '',
    techStack: ['Vite'],
    launchMode: '',
    launchReady: false,
    launchActionMode: '',
    demoUrl: '',
    githubUrl: '',
    coverImage: '',
    relatedModules: ['Knowledge Lab'],
    researchLink: 'https://example.com/bridge-research',
    nextStep: '',
    translations: {
      zh: {
        name: '資料橋接展示',
        summary: '第二張繁中摘要',
        problem: '',
        solution: '',
        coreFeatures: '',
        nextStep: '',
      },
      ko: {
        name: '데이터 브리지 Demo',
        summary: '데이터 브리지 한국어 요약',
        problem: '',
        solution: '',
        coreFeatures: '',
        nextStep: '',
      },
      en: {
        name: 'Data Bridge Demo',
        summary: 'Data bridge English summary',
        problem: '',
        solution: '',
        coreFeatures: '',
        nextStep: '',
      },
    },
    updatedAt: '2026-06-10T05:40:00.000Z',
  },
  {
    id: 'demo-archived',
    slug: 'archived-demo',
    name: '封存展示',
    demoType: 'Dashboard',
    status: 'Archived',
    version: 'v0.1',
    featured: false,
    displayOrder: 7,
    summary: '封存繁中摘要',
    problem: '',
    solution: '',
    targetUsers: ['Researchers'],
    coreFeatures: '',
    techStack: ['Vite'],
    launchMode: 'External',
    launchReady: true,
    launchActionMode: 'External',
    demoUrl: `${LOCAL_BASE_URL}/runtime-fixtures/archived-demo.html`,
    githubUrl: '',
    coverImage: '',
    relatedModules: ['Projects'],
    researchLink: '',
    nextStep: '',
    translations: {
      zh: {
        name: '封存展示',
        summary: '封存繁中摘要',
        problem: '',
        solution: '',
        coreFeatures: '',
        nextStep: '',
      },
      ko: {
        name: '아카이브 Demo',
        summary: '아카이브 한국어 요약',
        problem: '',
        solution: '',
        coreFeatures: '',
        nextStep: '',
      },
      en: {
        name: 'Archived Demo',
        summary: 'Archived English summary',
        problem: '',
        solution: '',
        coreFeatures: '',
        nextStep: '',
      },
    },
    updatedAt: '2026-06-09T05:40:00.000Z',
  },
];

const API_RESPONSES = new Map([
  ['/api/identity/profiles', () => createFallbackIdentityProfilesResponse('upstream_failed')],
  ['/api/research/literature', () => createFallbackLiteratureResponse('upstream_failed')],
  ['/api/teaching/courses', () => createApiResponse({ source: 'fallback', reason: 'upstream_failed', items: getModuleData('teaching') })],
  ['/api/knowledge/resources', () => createFallbackKnowledgeResponse('upstream_failed')],
  ['/api/modules/demos', () => createApiResponse({ source: 'airtable', reason: null, items: DEMO_SHOWCASE_FIXTURE })],
  ['/api/action/projects', () => createApiResponse({ source: 'fallback', reason: 'upstream_failed', items: getModuleData('action') })],
  ['/api/collaboration/options', () => createApiResponse({ source: 'fallback', reason: 'upstream_failed', items: getModuleData('collaboration') })],
]);

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function sendJson(res, payload, status = 200, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function readRequestBody(req, limit = 20_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('request too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function createAgentChatResponse(body) {
  const query = String(body?.query || '').toLowerCase();
  const lang = body?.lang || 'en';
  const citation = {
    sourceId: 'S1',
    title: lang === 'ko' ? '학습 데모' : lang === 'zh' ? '智慧學習展示' : 'Learning Demo',
    moduleKey: 'projects',
    moduleLabel: 'Demo Showcase',
    itemType: 'AI Tutor',
    excerpt: lang === 'ko' ? '한국어 요약' : lang === 'zh' ? '繁中摘要' : 'English summary',
    sourceRoute: '/projects/module-demos',
    sourceUrl: 'https://example.com/research',
    updatedAt: '2026-06-12T05:40:00.000Z',
  };

  if (query.includes('disabled')) {
    return { ok: true, mode: 'sources_only', answer: '', citations: [citation], suggestedQuestions: [], partialSources: false, reason: 'disabled' };
  }
  if (query.includes('forced')) {
    return {
      ok: true,
      mode: 'sources_only',
      answer: lang === 'ko'
        ? `관련 공개 소스는 다음과 같습니다.\n\n1. ${citation.title} [S1]`
        : lang === 'zh'
          ? `相關公開來源包括：\n\n1. ${citation.title} [S1]`
          : `Relevant public sources include:\n\n1. ${citation.title} [S1]`,
      citations: [citation],
      suggestedQuestions: [],
      partialSources: false,
      reason: 'forced_sources_only',
    };
  }
  if (query.includes('unavailable')) {
    const catalogAnswer = query.includes('demo')
      ? lang === 'ko'
        ? `현재 공개된 Demo는 다음과 같습니다.\n\n1. ${citation.title} [S1]`
        : lang === 'zh'
          ? `目前公開的 Demo 包括：\n\n1. ${citation.title} [S1]`
          : `The currently public demos include:\n\n1. ${citation.title} [S1]`
      : '';
    return { ok: true, mode: 'sources_only', answer: catalogAnswer, citations: [citation], suggestedQuestions: [], partialSources: false, reason: 'model_unavailable' };
  }
  if (query.includes('nosource')) {
    return { ok: true, mode: 'sources_only', answer: '', citations: [], suggestedQuestions: [], partialSources: false, reason: 'no_sources' };
  }
  if (query.includes('moderated')) {
    return {
      ok: true,
      mode: 'sources_only',
      answer: lang === 'ko'
        ? '이 질문은 현재 처리할 수 없습니다. 내용을 수정한 후 다시 시도해 주세요.'
        : lang === 'zh'
          ? '這個問題目前無法處理，請調整內容後再試一次。'
          : 'This request cannot be processed. Please revise it and try again.',
      citations: [citation],
      suggestedQuestions: [],
      partialSources: false,
      reason: 'moderated',
    };
  }

  return {
    ok: true,
    mode: 'ai',
    answer: lang === 'ko'
      ? '현재 공개된 Demo에는 학습 데모가 포함됩니다. [S1]'
      : lang === 'zh'
        ? '目前公開 Demo 包含智慧學習展示。 [S1]'
        : 'The currently public demos include Learning Demo. [S1]',
    citations: [citation],
    suggestedQuestions: lang === 'ko'
      ? ['NexAeon의 학습 코칭 철학은 무엇인가요?']
      : lang === 'zh'
        ? ['NexAeon 的學習教練理念是什麼？']
        : ['What is NexAeon’s learning coaching philosophy?'],
    partialSources: query.includes('partial'),
  };
}

function getSafeFilePath(pathname) {
  const normalized = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const relativePath = normalized === '/' ? '/index.html' : normalized;
  return join(DIST_DIR, relativePath);
}

async function serveFile(res, pathname) {
  const filePath = getSafeFilePath(pathname);
  const extension = extname(filePath);
  const contentType = CONTENT_TYPES[extension] || 'application/octet-stream';

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': body.length,
    });
    res.end(body);
  } catch {
    const indexBody = await readFile(join(DIST_DIR, 'index.html'));
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES['.html'],
      'Content-Length': indexBody.length,
    });
    res.end(indexBody);
  }
}

function sendRuntimeFixture(res, title) {
  const body = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><main><h1>${title}</h1><p>Local runtime fixture</p></main></body></html>`;
  res.writeHead(200, {
    'Content-Type': CONTENT_TYPES['.html'],
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

    if (url.pathname === '/api/agent/chat') {
      if (req.method !== 'POST') {
        sendJson(res, { ok: true, mode: 'sources_only', answer: '', citations: [], suggestedQuestions: [], partialSources: false, reason: 'invalid_request' }, 405);
        return;
      }
      const rawBody = await readRequestBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      if (String(body?.query || '').toLowerCase().includes('rate limit')) {
        sendJson(res, { ok: true, mode: 'sources_only', answer: '', citations: [], suggestedQuestions: [], partialSources: false, reason: 'invalid_request' }, 429, { 'Retry-After': '2' });
        return;
      }
      setTimeout(() => sendJson(res, createAgentChatResponse(body)), String(body?.query || '').toLowerCase().includes('slow') ? 250 : 0);
      return;
    }

    if (url.pathname === '/api/agent/health') {
      const payload = {
        ok: true,
        service: 'NexAeon Navigator',
        status: 'ready',
        mode: 'ai',
        sourceRegistryCount: 7,
        timestamp: '2026-06-14T00:00:00.000Z',
      };
      if (req.method === 'HEAD') {
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'private, no-store',
        });
        res.end();
        return;
      }
      sendJson(res, payload, 200, { 'Cache-Control': 'private, no-store' });
      return;
    }

    if (req.method !== 'GET') {
      sendJson(res, createApiResponse({ source: 'fallback', reason: 'upstream_failed', items: [] }), 405);
      return;
    }

    if (url.pathname === '/runtime-fixtures/slow-embedded-demo.html') {
      setTimeout(() => sendRuntimeFixture(res, 'Slow Embedded Demo'), 30_000);
      return;
    }

    if (url.pathname.startsWith('/runtime-fixtures/')) {
      sendRuntimeFixture(res, url.pathname.split('/').pop().replace('.html', ''));
      return;
    }

    const apiResponse = API_RESPONSES.get(url.pathname);
    if (apiResponse) {
      sendJson(res, apiResponse());
      return;
    }

    await serveFile(res, url.pathname);
  } catch {
    sendJson(res, createApiResponse({ source: 'fallback', reason: 'upstream_failed', items: [] }), 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`NexAeon e2e server listening at http://${HOST}:${PORT}`);
});
