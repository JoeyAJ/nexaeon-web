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
    launchMode: 'External URL',
    demoUrl: 'https://example.com/demo',
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
        name: '',
        summary: '',
        problem: '',
        solution: '',
        coreFeatures: '',
        nextStep: '',
      },
      en: {
        name: 'Data Bridge Demo',
        summary: '',
        problem: '',
        solution: '',
        coreFeatures: '',
        nextStep: '',
      },
    },
    updatedAt: '2026-06-10T05:40:00.000Z',
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

function sendJson(res, payload, status = 200) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
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

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

    if (req.method !== 'GET') {
      sendJson(res, createApiResponse({ source: 'fallback', reason: 'upstream_failed', items: [] }), 405);
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
