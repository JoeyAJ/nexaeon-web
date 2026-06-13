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

const API_RESPONSES = new Map([
  ['/api/identity/profiles', () => createFallbackIdentityProfilesResponse('upstream_failed')],
  ['/api/research/literature', () => createFallbackLiteratureResponse('upstream_failed')],
  ['/api/teaching/courses', () => createApiResponse({ source: 'fallback', reason: 'upstream_failed', items: getModuleData('teaching') })],
  ['/api/knowledge/resources', () => createFallbackKnowledgeResponse('upstream_failed')],
  ['/api/modules/demos', () => createApiResponse({ source: 'fallback', reason: 'upstream_failed', items: getModuleData('modules') })],
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
