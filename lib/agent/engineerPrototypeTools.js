import { getModuleDemos } from '../../api/modules/demos.js';
import { isPublishedVisibility } from '../content/visibility.js';
import { getValidatedDemoUrl } from '../../src/lib/demoRuntime.js';

export const ENGINEER_TOOL_NAMES = Object.freeze([
  'searchPrototypeItems',
  'getPrototypeItem',
  'filterPrototypeItems',
  'listPrototypeTopics',
  'listPrototypeStatuses',
  'comparePrototypeItems',
  'getPrototypeLinks',
]);

export const ENGINEER_TOOL_DEFINITIONS = Object.freeze([
  {
    type: 'function', name: 'searchPrototypeItems',
    description: 'Search currently public Prototype Lab demos and prototypes by keyword.',
    parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['query'], additionalProperties: false },
  },
  {
    type: 'function', name: 'getPrototypeItem',
    description: 'Retrieve one currently public prototype by its public identifier or slug.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
  },
  {
    type: 'function', name: 'filterPrototypeItems',
    description: 'Filter public prototypes by type, development status, technology, year, platform, or launch mode.',
    parameters: {
      type: 'object',
      properties: {
        prototypeType: { type: 'string' }, status: { type: 'string' }, techStack: { type: 'string' },
        year: { type: 'integer', minimum: 1900, maximum: 2200 }, platform: { type: 'string' },
        launchMode: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 12 },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function', name: 'listPrototypeTopics',
    description: 'List technologies, project types, related modules, and feature topics represented by public prototypes.',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 30 } }, additionalProperties: false },
  },
  {
    type: 'function', name: 'listPrototypeStatuses',
    description: 'List development statuses represented by currently public prototypes.',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 30 } }, additionalProperties: false },
  },
  {
    type: 'function', name: 'comparePrototypeItems',
    description: 'Compare two to four public prototypes by verified fields. Use ids when known, or a query to choose matching items.',
    parameters: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
        query: { type: 'string' }, limit: { type: 'integer', minimum: 2, maximum: 4 },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function', name: 'getPrototypeLinks',
    description: 'Return only validated public Demo and GitHub links for one public prototype.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
  },
]);

const TOOL_NAME_SET = new Set(ENGINEER_TOOL_NAMES);
const MAX_TOOL_ITEMS = 12;
const SECRET_VALUE_PATTERN = /\b(?:sk-[a-z0-9_-]{8,}|(?:api[_ -]?key|token|secret|password)\s*[:=]\s*[^\s,;]+)/giu;

function cleanText(value, limit = 2000) {
  return String(value || '').replace(SECRET_VALUE_PATTERN, '[redacted]').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function cleanStringArray(value, limit = 50) {
  const input = Array.isArray(value) ? value.flat(Infinity) : value ? [value] : [];
  const output = [];
  const seen = new Set();
  for (const raw of input) {
    const text = cleanText(raw, 240);
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    output.push(text);
    if (output.length >= limit) break;
  }
  return output;
}

function cleanLimit(value, fallback = 8, max = MAX_TOOL_ITEMS) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function getExplicitVisibility(item) {
  for (const key of ['visibility', 'publicStatus', '公開狀態', 'Public Status']) {
    if (Object.prototype.hasOwnProperty.call(item || {}, key)) return item[key];
  }
  return undefined;
}

function safeUrl(value, { githubOnly = false } = {}) {
  const validated = getValidatedDemoUrl(value, { environment: 'production' });
  if (!validated) return '';
  try {
    const url = new URL(validated);
    if (url.username || url.password) return '';
    if (/(^|\.)(?:airtable\.com|notion\.so)$/u.test(url.hostname)) return '';
    if (/^(?:localhost|127\.|10\.|192\.168\.|169\.254\.)/u.test(url.hostname)) return '';
    if (githubOnly && !/(^|\.)github\.com$/u.test(url.hostname)) return '';
    for (const key of url.searchParams.keys()) {
      if (/token|key|secret|password/iu.test(key)) return '';
    }
    return url.href;
  } catch {
    return '';
  }
}

function localizedDemoText(item, field) {
  const translations = item?.translations || {};
  const direct = item?.[field];
  return {
    zh: cleanText(translations.zh?.[field] || direct || translations.en?.[field] || translations.ko?.[field]),
    ko: cleanText(translations.ko?.[field] || translations.en?.[field] || direct || translations.zh?.[field]),
    en: cleanText(translations.en?.[field] || direct || translations.zh?.[field] || translations.ko?.[field]),
  };
}

function yearFromItem(item) {
  const match = [item?.year, item?.updatedAt, item?.createdAt]
    .map((value) => String(value || '').match(/\b(19|20|21)\d{2}\b/)?.[0])
    .find(Boolean);
  return match ? Number(match) : null;
}

export function normalizePrototypeToolItem(item, sourcePlatform = 'fallback') {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const visibility = getExplicitVisibility(item);
  if (visibility !== undefined && !isPublishedVisibility(visibility)) return null;

  const id = cleanText(item.id || item.slug, 240);
  const slug = cleanText(item.slug, 240);
  const title = localizedDemoText(item, 'name');
  const displayTitle = title.en || title.zh || title.ko || cleanText(item.title, 320);
  if (!id || !displayTitle) return null;

  const summary = localizedDemoText(item, 'summary');
  const problem = localizedDemoText(item, 'problem');
  const solution = localizedDemoText(item, 'solution');
  const coreFeatures = localizedDemoText(item, 'coreFeatures');
  const nextStep = localizedDemoText(item, 'nextStep');
  const techStack = cleanStringArray(item.techStack);
  const relatedModules = cleanStringArray(item.relatedModules);
  const targetUsers = cleanStringArray(item.targetUsers);
  const demoUrl = safeUrl(item.demoUrl);
  const githubUrl = safeUrl(item.githubUrl, { githubOnly: true });
  const researchUrl = safeUrl(item.researchLink);

  return {
    id, slug, title, displayTitle, summary, problem, solution, coreFeatures, nextStep,
    prototypeType: cleanText(item.demoType || item.prototypeType || item.type, 180) || 'prototype',
    developmentStatus: cleanText(item.status || item.developmentStatus, 160) || 'Unknown',
    version: cleanText(item.version, 80), techStack, relatedModules, targetUsers,
    platform: cleanText(item.platform || item.launchMode, 120),
    launchMode: cleanText(item.launchMode, 120), launchReady: Boolean(item.launchReady),
    demoUrl, githubUrl, researchUrl, year: yearFromItem(item),
    sourcePlatform: cleanText(sourcePlatform, 40) || 'fallback', sourceDatabase: 'demos',
    sourceRoute: '/projects/module-demos', sourceUrl: demoUrl || githubUrl || researchUrl,
    updatedAt: cleanText(item.updatedAt, 80),
  };
}

export async function loadPublicPrototypeItems({ getModuleDemosImpl = getModuleDemos } = {}) {
  const payload = await getModuleDemosImpl();
  if (!payload || !Array.isArray(payload.items || payload.data)) throw new Error('prototype_source_invalid');
  const sourcePlatform = cleanText(payload.source, 40) || 'fallback';
  return {
    sourcePlatform,
    reason: cleanText(payload.reason, 80) || null,
    items: (payload.items || payload.data).map((item) => normalizePrototypeToolItem(item, sourcePlatform)).filter(Boolean),
  };
}

function searchableText(item) {
  return [
    item.id, item.slug, item.displayTitle, ...Object.values(item.title), ...Object.values(item.summary),
    ...Object.values(item.problem), ...Object.values(item.solution), ...Object.values(item.coreFeatures),
    item.prototypeType, item.developmentStatus, item.version, ...item.techStack, ...item.relatedModules,
    ...item.targetUsers, item.platform, item.launchMode, item.year,
  ].join(' ').toLocaleLowerCase();
}

function queryTokens(value) {
  return [...new Set(cleanText(value, 500).toLocaleLowerCase().split(/[\s,，、;；:：()[\]{}]+/u).filter((token) => token.length > 1))];
}

function includesText(value, query) {
  const needle = cleanText(query, 240).toLocaleLowerCase();
  return !needle || String(value || '').toLocaleLowerCase().includes(needle);
}

export function searchPrototypeItems(data, { query = '', limit } = {}) {
  const tokens = queryTokens(query);
  const items = data.items.map((item) => ({ item, score: tokens.reduce((sum, token) => sum + (searchableText(item).includes(token) ? 1 : 0), 0) }))
    .filter(({ score }) => !tokens.length || score > 0)
    .sort((a, b) => b.score - a.score || a.item.displayTitle.localeCompare(b.item.displayTitle))
    .slice(0, cleanLimit(limit)).map(({ item }) => item);
  return { ok: true, tool: 'searchPrototypeItems', sourcePlatform: data.sourcePlatform, count: items.length, items };
}

export function getPrototypeItem(data, { id = '' } = {}) {
  const normalized = cleanText(id, 240).toLocaleLowerCase();
  const item = data.items.find((candidate) => candidate.id.toLocaleLowerCase() === normalized || candidate.slug.toLocaleLowerCase() === normalized);
  return { ok: true, tool: 'getPrototypeItem', sourcePlatform: data.sourcePlatform, count: item ? 1 : 0, items: item ? [item] : [] };
}

export function filterPrototypeItems(data, filters = {}) {
  const year = Number(filters.year);
  const items = data.items.filter((item) => (
    includesText(item.prototypeType, filters.prototypeType)
    && includesText(item.developmentStatus, filters.status)
    && includesText(item.techStack.join(' '), filters.techStack)
    && (!Number.isInteger(year) || item.year === year)
    && includesText([item.platform, item.launchMode].join(' '), filters.platform)
    && includesText(item.launchMode, filters.launchMode)
  )).slice(0, cleanLimit(filters.limit));
  return { ok: true, tool: 'filterPrototypeItems', sourcePlatform: data.sourcePlatform, count: items.length, items };
}

function countValues(values, limit) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit).map(([name, count]) => ({ name, count }));
}

export function listPrototypeTopics(data, { limit } = {}) {
  const topics = countValues(data.items.flatMap((item) => [item.prototypeType, ...item.techStack, ...item.relatedModules]), cleanLimit(limit, 20, 30));
  return { ok: true, tool: 'listPrototypeTopics', sourcePlatform: data.sourcePlatform, count: topics.length, topics, items: data.items.slice(0, MAX_TOOL_ITEMS) };
}

export function listPrototypeStatuses(data, { limit } = {}) {
  const statuses = countValues(data.items.map((item) => item.developmentStatus), cleanLimit(limit, 20, 30));
  return { ok: true, tool: 'listPrototypeStatuses', sourcePlatform: data.sourcePlatform, count: statuses.length, statuses, items: data.items.slice(0, MAX_TOOL_ITEMS) };
}

export function comparePrototypeItems(data, { ids = [], query = '', limit = 4 } = {}) {
  const safeIds = cleanStringArray(ids, 4).map((id) => id.toLocaleLowerCase());
  let items = safeIds.length
    ? data.items.filter((item) => safeIds.includes(item.id.toLocaleLowerCase()) || safeIds.includes(item.slug.toLocaleLowerCase()))
    : searchPrototypeItems(data, { query, limit: cleanLimit(limit, 2, 4) }).items;
  items = items.slice(0, cleanLimit(limit, 4, 4));
  const comparison = items.map((item) => ({
    id: item.id, title: item.displayTitle, prototypeType: item.prototypeType,
    developmentStatus: item.developmentStatus, techStack: item.techStack,
    launchMode: item.launchMode, launchReady: item.launchReady, year: item.year,
  }));
  return { ok: true, tool: 'comparePrototypeItems', sourcePlatform: data.sourcePlatform, count: items.length, items, comparison };
}

export function getPrototypeLinks(data, { id = '' } = {}) {
  const result = getPrototypeItem(data, { id });
  const item = result.items[0];
  return {
    ok: true, tool: 'getPrototypeLinks', sourcePlatform: data.sourcePlatform,
    count: item ? 1 : 0, items: item ? [item] : [],
    links: item ? { demoUrl: item.demoUrl, githubUrl: item.githubUrl, researchUrl: item.researchUrl } : {},
  };
}

export function executeEngineerPrototypeTool(name, args, data) {
  if (!TOOL_NAME_SET.has(name)) throw new Error('engineer_tool_not_allowed');
  if (!data || !Array.isArray(data.items)) throw new Error('prototype_source_invalid');
  if (name === 'searchPrototypeItems') return searchPrototypeItems(data, args);
  if (name === 'getPrototypeItem') return getPrototypeItem(data, args);
  if (name === 'filterPrototypeItems') return filterPrototypeItems(data, args);
  if (name === 'listPrototypeTopics') return listPrototypeTopics(data, args);
  if (name === 'listPrototypeStatuses') return listPrototypeStatuses(data, args);
  if (name === 'comparePrototypeItems') return comparePrototypeItems(data, args);
  return getPrototypeLinks(data, args);
}

function uniqueToolItems(toolResults) {
  const items = new Map();
  for (const result of toolResults || []) for (const item of result.items || []) items.set(item.id, item);
  return [...items.values()];
}

const ENGINEER_STRUCTURE_COPY = Object.freeze({
  zh: {
    stackMissing: '未列出技術棧',
    inferred: (values) => `比較中的原型可能在這些技術上有共同實作考量：${values}。`,
    recommended: '在確認實作、測試或部署狀態前，應檢查實際 Repository 並執行測試。',
    unknown: 'Prototype Lab 紀錄無法確認目前的 Repository 程式碼、commit、測試、API、環境與部署狀態。',
    noData: '目前沒有公開 Prototype Lab 紀錄可支持這個需求。',
    tasks: ['根據引用的公開原型事實確認範圍', '定義 MVP 架構、介面與資料流', '實作最小可測試功能切片', '執行規劃中的測試並驗證驗收條件'],
    repoRisk: 'Engineer 尚未檢查 Repository 程式碼、環境設定與部署狀態。',
    tests: ['單元與契約測試', '整合與錯誤狀態測試', '端到端驗收驗證'],
    acceptance: ['所有引用的公開需求都可追溯至 sourceIds。', '沒有執行證據時，不聲稱已完成、已通過或已部署。'],
  },
  ko: {
    stackMissing: '기술 스택이 기재되지 않음',
    inferred: (values) => `비교된 프로토타입은 다음 기술에서 공통 구현 고려사항이 있을 수 있습니다: ${values}.`,
    recommended: '구현, 테스트 또는 배포 상태를 확인하기 전에 실제 Repository를 검사하고 테스트를 실행해야 합니다.',
    unknown: 'Prototype Lab 기록만으로 현재 Repository 코드, commit, 테스트, API, 환경 및 배포 상태를 확인할 수 없습니다.',
    noData: '이 요청을 뒷받침하는 공개 Prototype Lab 기록이 없습니다.',
    tasks: ['인용된 공개 프로토타입 사실을 기준으로 범위 확인', 'MVP 아키텍처, 인터페이스 및 데이터 흐름 정의', '가장 작은 테스트 가능 기능 단위 구현', '계획된 테스트 실행 및 승인 기준 검증'],
    repoRisk: 'Engineer는 Repository 코드, 환경 설정 및 배포 상태를 검사하지 않았습니다.',
    tests: ['단위 및 계약 테스트', '통합 및 오류 상태 테스트', '엔드투엔드 승인 검증'],
    acceptance: ['인용된 모든 공개 요구사항을 sourceIds로 추적할 수 있습니다.', '실행 증거 없이 완료, 통과 또는 배포를 주장하지 않습니다.'],
  },
  en: {
    stackMissing: 'technology stack not listed',
    inferred: (values) => `The compared prototypes may share implementation concerns around: ${values}.`,
    recommended: 'Inspect the actual repository and execute tests before treating implementation, test, or deployment status as verified.',
    unknown: 'Current repository code, commit, test, API, environment, and deployment state are not confirmed by Prototype Lab records.',
    noData: 'No currently public Prototype Lab record supports this request.',
    tasks: ['Confirm scope against cited public prototype facts', 'Define MVP architecture, interfaces, and data flow', 'Implement the smallest testable feature slices', 'Run planned tests and verify acceptance criteria'],
    repoRisk: 'Repository code, environment configuration, and deployment state have not been inspected by Engineer.',
    tests: ['Unit and contract tests', 'Integration and error-state tests', 'End-to-end acceptance verification'],
    acceptance: ['All cited public requirements are traceable to sourceIds.', 'No completion, passing, or deployment claim is made without execution evidence.'],
  },
});

export function buildEngineerFactClassification(toolResults = [], { lang = 'en' } = {}) {
  const items = uniqueToolItems(toolResults);
  const copy = ENGINEER_STRUCTURE_COPY[lang] || ENGINEER_STRUCTURE_COPY.en;
  const compared = toolResults.find((result) => result.tool === 'comparePrototypeItems')?.items || [];
  const sharedTech = compared.length > 1
    ? compared[0].techStack.filter((technology) => compared.slice(1).some((item) => item.techStack.includes(technology)))
    : [];
  return {
    verified: items.map((item) => ({
      text: `${item.displayTitle} — ${item.prototypeType}; ${item.developmentStatus}; ${item.techStack.join(', ') || copy.stackMissing}`,
      sourceIds: [item.id],
    })),
    inferred: sharedTech.length ? [{ text: copy.inferred(sharedTech.join(', ')), sourceIds: compared.map((item) => item.id) }] : [],
    recommended: [{ text: copy.recommended, sourceIds: [] }],
    unknown: items.length
      ? [{ text: copy.unknown, sourceIds: [] }]
      : [{ text: copy.noData, sourceIds: [] }],
  };
}

export function isDevelopmentPlanRequest(query) {
  return /(mvp|sprint|開發計畫|开发计划|任務拆解|任务拆解|實作規格|实现规格|驗收|验收|測試方案|测试方案|개발 계획|스프린트|작업 분해|구현 사양|승인 기준|테스트 계획|development plan|implementation plan|task breakdown|acceptance criteria|test plan)/iu.test(query);
}

export function buildEngineerDevelopmentPlan(toolResults = [], { query = '', lang = 'en' } = {}) {
  if (!isDevelopmentPlanRequest(query)) return null;
  const copy = ENGINEER_STRUCTURE_COPY[lang] || ENGINEER_STRUCTURE_COPY.en;
  const items = uniqueToolItems(toolResults);
  const sourceIds = items.map((item) => item.id);
  const technologies = [...new Set(items.flatMap((item) => item.techStack))];
  return {
    objective: cleanText(query, 500),
    scope: items.map((item) => ({ sourceId: item.id, title: item.displayTitle })),
    requirements: items.flatMap((item) => [item.coreFeatures.en || item.coreFeatures.zh || item.coreFeatures.ko].filter(Boolean).map((text) => ({ text, sourceIds: [item.id], verificationStatus: 'verified' }))),
    tasks: copy.tasks.map((title, index) => ({ id: `task-${index + 1}`, title, status: 'planned' })),
    dependencies: technologies.map((name) => ({ name, verificationStatus: 'unverified' })),
    risks: [{ text: copy.repoRisk, verificationStatus: 'unverified' }],
    tests: copy.tests.map((title) => ({ title, status: 'planned' })),
    acceptanceCriteria: copy.acceptance.map((text) => ({ text, status: 'planned' })),
    sourceIds,
    verificationStatus: 'unverified',
  };
}
