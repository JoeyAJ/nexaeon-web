import { getActionProjects } from '../../api/action/projects.js';
import { isPublishedVisibility } from '../content/visibility.js';
import { getValidatedDemoUrl } from '../../src/lib/demoRuntime.js';

export const ORCHESTRATOR_TOOL_NAMES = Object.freeze([
  'searchActionItems',
  'getActionItem',
  'filterActionItems',
  'listActionStatuses',
  'listActionPriorities',
  'findBlockedActions',
  'groupActionsByProject',
  'buildExecutionPlan',
]);

export const ORCHESTRATOR_TOOL_DEFINITIONS = Object.freeze([
  {
    type: 'function', name: 'searchActionItems',
    description: 'Search currently public Action Center projects and action items by keyword.',
    parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['query'], additionalProperties: false },
  },
  {
    type: 'function', name: 'getActionItem',
    description: 'Retrieve one currently public Action Center item by its public identifier.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
  },
  {
    type: 'function', name: 'filterActionItems',
    description: 'Filter public Action Center items by status, priority, project, public owner, due date, or type when those fields exist.',
    parameters: {
      type: 'object', properties: {
        status: { type: 'string' }, priority: { type: 'string' }, project: { type: 'string' }, owner: { type: 'string' },
        dueBefore: { type: 'string' }, dueAfter: { type: 'string' }, actionType: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 12 },
      }, additionalProperties: false,
    },
  },
  {
    type: 'function', name: 'listActionStatuses',
    description: 'List statuses represented by currently public Action Center items.',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 30 } }, additionalProperties: false },
  },
  {
    type: 'function', name: 'listActionPriorities',
    description: 'List priorities represented by currently public Action Center items.',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 30 } }, additionalProperties: false },
  },
  {
    type: 'function', name: 'findBlockedActions',
    description: 'Find public actions with an explicit blocked status, explicit blocker, or unresolved public dependency.',
    parameters: { type: 'object', properties: { project: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 12 } }, additionalProperties: false },
  },
  {
    type: 'function', name: 'groupActionsByProject',
    description: 'Group currently public Action Center items by their public project identity.',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 12 } }, additionalProperties: false },
  },
  {
    type: 'function', name: 'buildExecutionPlan',
    description: 'Build a read-only proposed execution plan from public Action Center records without creating or updating tasks.',
    parameters: { type: 'object', properties: { objective: { type: 'string' }, project: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['objective'], additionalProperties: false },
  },
]);

const TOOL_NAME_SET = new Set(ORCHESTRATOR_TOOL_NAMES);
const MAX_TOOL_ITEMS = 12;
const SECRET_VALUE_PATTERN = /\b(?:sk-[a-z0-9_-]{8,}|(?:api[_ -]?key|token|secret|password)\s*[:=]\s*[^\s,;]+)/giu;
const PRIVATE_CONTACT_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const TERMINAL_STATUS_PATTERN = /^(?:done|complete|completed|closed|finished)$/iu;

function cleanText(value, limit = 2000) {
  return String(value || '').replace(SECRET_VALUE_PATTERN, '[redacted]').replace(PRIVATE_CONTACT_PATTERN, '[redacted]').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function cleanStringArray(value, limit = 40) {
  const input = Array.isArray(value) ? value.flat(Infinity) : value ? [value] : [];
  const output = [];
  const seen = new Set();
  for (const raw of input) {
    const text = cleanText(typeof raw === 'object' ? raw?.id || raw?.name || '' : raw, 240);
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key); output.push(text);
    if (output.length >= limit) break;
  }
  return output;
}

function cleanLimit(value, fallback = 8, max = MAX_TOOL_ITEMS) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function safeDate(value) {
  const text = cleanText(value, 80);
  if (!text) return '';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : text;
}

function safeUrl(value, { githubOnly = false } = {}) {
  const validated = getValidatedDemoUrl(value, { environment: 'production' });
  if (!validated) return '';
  try {
    const url = new URL(validated);
    if (url.username || url.password) return '';
    if (/(^|\.)(?:airtable\.com|notion\.so)$/u.test(url.hostname)) return '';
    if (/^(?:localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/u.test(url.hostname) || /^(?:\[?::1\]?)$/u.test(url.hostname)) return '';
    if (githubOnly && !/(^|\.)github\.com$/u.test(url.hostname)) return '';
    for (const key of url.searchParams.keys()) if (/token|key|secret|password/iu.test(key)) return '';
    return url.href;
  } catch {
    return '';
  }
}

function getExplicitVisibility(item) {
  for (const key of ['visibility', 'publicStatus', '公開狀態', 'Public Status']) {
    if (Object.prototype.hasOwnProperty.call(item || {}, key)) return item[key];
  }
  return undefined;
}

export function normalizeActionToolItem(item, sourcePlatform = 'fallback') {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const visibility = getExplicitVisibility(item);
  if (visibility !== undefined && !isPublishedVisibility(visibility)) return null;
  const id = cleanText(item.id, 240);
  const title = cleanText(item.name || item.title, 320);
  if (!id || !title) return null;
  const githubUrl = safeUrl(item.githubUrl, { githubOnly: true });
  const deploymentUrl = safeUrl(item.deploymentUrl);
  const evidenceUrl = safeUrl(item.evidenceUrl);
  const projectName = cleanText(item.projectName || item.project || title, 320);
  return {
    id, title, summary: cleanText(item.publicSummary || item.summary, 1600),
    actionType: cleanText(item.actionType || item.projectType || item.type, 160) || 'Action',
    status: cleanText(item.status, 120) || 'Unknown', priority: cleanText(item.priority, 120) || 'Unknown',
    startDate: safeDate(item.startDate), dueDate: safeDate(item.dueDate),
    progress: Number.isFinite(Number(item.progress)) ? Math.max(0, Math.min(100, Math.round(Number(item.progress)))) : null,
    currentPhase: cleanText(item.currentPhase, 240), nextAction: cleanText(item.nextAction, 800),
    owner: cleanText(item.publicOwner || item.owner, 240),
    dependencies: cleanStringArray(item.dependencies || item.dependencyIds || item.dependency),
    blockers: cleanStringArray(item.publicBlockers || item.blockers),
    milestones: cleanStringArray(item.milestones),
    projectId: cleanText(item.projectId, 240) || id, projectName,
    automationStatus: cleanText(item.automationStatus, 160),
    githubUrl, deploymentUrl, evidenceUrl,
    sourcePlatform: cleanText(sourcePlatform, 40) || 'fallback', sourceDatabase: 'action-projects',
    sourceRoute: '/field-lab', sourceUrl: evidenceUrl || deploymentUrl || githubUrl,
    updatedAt: safeDate(item.updatedAt),
  };
}

export async function loadPublicActionItems({ getActionProjectsImpl = getActionProjects } = {}) {
  const payload = await getActionProjectsImpl();
  if (!payload || !Array.isArray(payload.items || payload.data)) throw new Error('action_source_invalid');
  const sourcePlatform = cleanText(payload.source, 40) || 'fallback';
  return {
    sourcePlatform, reason: cleanText(payload.reason, 80) || null,
    items: (payload.items || payload.data).map((item) => normalizeActionToolItem(item, sourcePlatform)).filter(Boolean),
  };
}

function searchableText(item) {
  return [item.id, item.title, item.summary, item.actionType, item.status, item.priority, item.currentPhase,
    item.nextAction, item.owner, ...item.dependencies, ...item.blockers, ...item.milestones,
    item.projectId, item.projectName, item.automationStatus].join(' ').toLocaleLowerCase();
}

function queryTokens(value) {
  return [...new Set(cleanText(value, 500).toLocaleLowerCase().split(/[\s,，、;；:：()[\]{}]+/u).filter((token) => token.length > 1))];
}

function includesText(value, query) {
  const needle = cleanText(query, 240).toLocaleLowerCase();
  return !needle || String(value || '').toLocaleLowerCase().includes(needle);
}

function dateTime(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function priorityRank(value) {
  return ({ urgent: 0, critical: 0, high: 1, medium: 2, normal: 2, low: 3 })[String(value || '').toLocaleLowerCase()] ?? 9;
}

export function searchActionItems(data, { query = '', limit } = {}) {
  const tokens = queryTokens(query);
  const items = data.items.map((item) => ({ item, score: tokens.reduce((sum, token) => sum + (searchableText(item).includes(token) ? 1 : 0), 0) }))
    .filter(({ score }) => !tokens.length || score > 0)
    .sort((a, b) => b.score - a.score || priorityRank(a.item.priority) - priorityRank(b.item.priority) || a.item.title.localeCompare(b.item.title))
    .slice(0, cleanLimit(limit)).map(({ item }) => item);
  return { ok: true, tool: 'searchActionItems', sourcePlatform: data.sourcePlatform, count: items.length, items };
}

export function getActionItem(data, { id = '' } = {}) {
  const normalized = cleanText(id, 240).toLocaleLowerCase();
  const item = data.items.find((candidate) => candidate.id.toLocaleLowerCase() === normalized);
  return { ok: true, tool: 'getActionItem', sourcePlatform: data.sourcePlatform, count: item ? 1 : 0, items: item ? [item] : [] };
}

export function filterActionItems(data, filters = {}) {
  const before = dateTime(filters.dueBefore); const after = dateTime(filters.dueAfter);
  const items = data.items.filter((item) => {
    const due = dateTime(item.dueDate);
    return includesText(item.status, filters.status) && includesText(item.priority, filters.priority)
      && includesText(`${item.projectId} ${item.projectName}`, filters.project) && includesText(item.owner, filters.owner)
      && includesText(item.actionType, filters.actionType)
      && (before === null || (due !== null && due <= before)) && (after === null || (due !== null && due >= after));
  }).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || (dateTime(a.dueDate) ?? Infinity) - (dateTime(b.dueDate) ?? Infinity))
    .slice(0, cleanLimit(filters.limit));
  return { ok: true, tool: 'filterActionItems', sourcePlatform: data.sourcePlatform, count: items.length, items };
}

function countValues(values, limit) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([name, count]) => ({ name, count }));
}

export function listActionStatuses(data, { limit } = {}) {
  const statuses = countValues(data.items.map((item) => item.status), cleanLimit(limit, 20, 30));
  return { ok: true, tool: 'listActionStatuses', sourcePlatform: data.sourcePlatform, count: statuses.length, statuses, items: data.items.slice(0, MAX_TOOL_ITEMS) };
}

export function listActionPriorities(data, { limit } = {}) {
  const priorities = countValues(data.items.map((item) => item.priority), cleanLimit(limit, 20, 30));
  return { ok: true, tool: 'listActionPriorities', sourcePlatform: data.sourcePlatform, count: priorities.length, priorities, items: data.items.slice().sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).slice(0, MAX_TOOL_ITEMS) };
}

function blockerReasons(item, byId) {
  const reasons = [...item.blockers];
  if (/block|blocked|阻塞|卡住|차단|보류/iu.test(item.status)) reasons.push(`Explicit status: ${item.status}`);
  for (const dependencyId of item.dependencies) {
    const dependency = byId.get(dependencyId.toLocaleLowerCase());
    if (dependency && !TERMINAL_STATUS_PATTERN.test(dependency.status)) reasons.push(`Unresolved dependency: ${dependency.id}`);
  }
  return [...new Set(reasons)];
}

export function findBlockedActions(data, { project = '', limit } = {}) {
  const byId = new Map(data.items.map((item) => [item.id.toLocaleLowerCase(), item]));
  const blocked = data.items.filter((item) => includesText(`${item.projectId} ${item.projectName}`, project))
    .map((item) => ({ item, reasons: blockerReasons(item, byId) })).filter(({ reasons }) => reasons.length)
    .slice(0, cleanLimit(limit));
  return { ok: true, tool: 'findBlockedActions', sourcePlatform: data.sourcePlatform, count: blocked.length, items: blocked.map(({ item }) => item), blocked: blocked.map(({ item, reasons }) => ({ id: item.id, title: item.title, reasons })) };
}

export function groupActionsByProject(data, { limit } = {}) {
  const groups = new Map();
  for (const item of data.items) {
    const key = item.projectId || item.id;
    if (!groups.has(key)) groups.set(key, { projectId: key, projectName: item.projectName || item.title, itemIds: [], count: 0 });
    const group = groups.get(key); group.itemIds.push(item.id); group.count += 1;
  }
  const projects = [...groups.values()].sort((a, b) => b.count - a.count || a.projectName.localeCompare(b.projectName)).slice(0, cleanLimit(limit));
  const ids = new Set(projects.flatMap((project) => project.itemIds));
  return { ok: true, tool: 'groupActionsByProject', sourcePlatform: data.sourcePlatform, count: projects.length, projects, items: data.items.filter((item) => ids.has(item.id)) };
}

export function buildActionToolExecutionPlan(data, { objective = '', project = '', limit } = {}) {
  const items = data.items.filter((item) => includesText(`${item.projectId} ${item.projectName}`, project))
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || (dateTime(a.dueDate) ?? Infinity) - (dateTime(b.dueDate) ?? Infinity))
    .slice(0, cleanLimit(limit));
  return {
    ok: true, tool: 'buildExecutionPlan', sourcePlatform: data.sourcePlatform, count: items.length, items,
    proposedPlan: {
      objective: cleanText(objective, 500),
      tasks: items.map((item, index) => ({ id: `proposed-${index + 1}`, title: item.nextAction || `Review ${item.title}`, status: 'proposed', sourceIds: [item.id] })),
      sourceIds: items.map((item) => item.id), verificationStatus: 'unverified',
    },
  };
}

export function executeOrchestratorActionTool(name, args, data) {
  if (!TOOL_NAME_SET.has(name)) throw new Error('orchestrator_tool_not_allowed');
  if (!data || !Array.isArray(data.items)) throw new Error('action_source_invalid');
  if (name === 'searchActionItems') return searchActionItems(data, args);
  if (name === 'getActionItem') return getActionItem(data, args);
  if (name === 'filterActionItems') return filterActionItems(data, args);
  if (name === 'listActionStatuses') return listActionStatuses(data, args);
  if (name === 'listActionPriorities') return listActionPriorities(data, args);
  if (name === 'findBlockedActions') return findBlockedActions(data, args);
  if (name === 'groupActionsByProject') return groupActionsByProject(data, args);
  return buildActionToolExecutionPlan(data, args);
}

function uniqueToolItems(toolResults) {
  const items = new Map();
  for (const result of toolResults) for (const item of result.items || []) if (!items.has(item.id)) items.set(item.id, item);
  return [...items.values()];
}

const COPY = Object.freeze({
  zh: {
    verified: (item) => `${item.title} — 狀態：${item.status}；優先級：${item.priority}；期限：${item.dueDate || '未公開'}`,
    inferred: '依公開優先級與期限排序後，可作為建議執行順序；這不是已排定或已指派的工作。',
    recommended: '執行前應確認負責人、依賴與截止日期，並由人員在正式任務系統核准。',
    unknown: 'Action Center 公開資料無法確認所有負責人、依賴、阻塞、通知與實際執行結果。', noData: '目前沒有公開 Action Center 紀錄支持此要求。',
    risk: '公開 Action Center 欄位可能缺少負責人、依賴或阻塞資訊。',
    acceptance: ['所有任務與狀態均可追溯至 sourceIds。', '沒有外部執行證據時，不聲稱已建立、已指派、已通知或已完成。'],
    milestone: '由人員確認範圍、負責人與日期後，才可建立正式里程碑。', next: '確認 proposed plan，再於授權的任務系統中由人員建立或更新任務。',
  },
  ko: {
    verified: (item) => `${item.title} — 상태: ${item.status}; 우선순위: ${item.priority}; 기한: ${item.dueDate || '공개되지 않음'}`,
    inferred: '공개 우선순위와 기한에 따른 정렬은 제안 실행 순서로 사용할 수 있지만, 확정되거나 배정된 작업은 아닙니다.',
    recommended: '실행 전에 담당자, 의존성과 기한을 확인하고 정식 작업 시스템에서 사람이 승인해야 합니다.',
    unknown: 'Action Center 공개 데이터만으로 모든 담당자, 의존성, 차단 요소, 알림 및 실제 실행 결과를 확인할 수 없습니다.', noData: '이 요청을 뒷받침하는 공개 Action Center 기록이 없습니다.',
    risk: '공개 Action Center 필드에 담당자, 의존성 또는 차단 정보가 없을 수 있습니다.',
    acceptance: ['모든 작업과 상태를 sourceIds로 추적할 수 있습니다.', '외부 실행 증거 없이 생성, 배정, 알림 또는 완료를 주장하지 않습니다.'],
    milestone: '범위, 담당자와 날짜를 사람이 확인한 후에만 정식 마일스톤을 생성할 수 있습니다.', next: 'proposed plan을 확인한 뒤 승인된 작업 시스템에서 사람이 작업을 생성하거나 업데이트합니다.',
  },
  en: {
    verified: (item) => `${item.title} — status: ${item.status}; priority: ${item.priority}; due: ${item.dueDate || 'not public'}`,
    inferred: 'Ordering by public priority and due date can be used as a proposed sequence; it is not scheduled or assigned work.',
    recommended: 'Confirm owners, dependencies, and deadlines before execution, then obtain human approval in the official task system.',
    unknown: 'Public Action Center data does not confirm every owner, dependency, blocker, notification, or execution result.', noData: 'No currently public Action Center record supports this request.',
    risk: 'Public Action Center fields may omit owners, dependencies, or blocker information.',
    acceptance: ['Every task and status is traceable to sourceIds.', 'No task is claimed as created, assigned, notified, or completed without external execution evidence.'],
    milestone: 'Create a formal milestone only after a person confirms scope, owner, and date.', next: 'Review the proposed plan, then have a person create or update tasks in an authorized task system.',
  },
});

export function buildOrchestratorFactClassification(toolResults = [], { lang = 'en' } = {}) {
  const items = uniqueToolItems(toolResults); const copy = COPY[lang] || COPY.en;
  return {
    verified: items.map((item) => ({ text: copy.verified(item), sourceIds: [item.id] })),
    inferred: items.length > 1 ? [{ text: copy.inferred, sourceIds: items.map((item) => item.id) }] : [],
    recommended: [{ text: copy.recommended, sourceIds: [] }],
    unknown: [{ text: items.length ? copy.unknown : copy.noData, sourceIds: [] }],
  };
}

export function isExecutionPlanRequest(query) {
  return /(執行計畫|执行计划|行動計畫|行动计划|任務拆解|任务拆解|優先|优先|依賴|依赖|阻塞|里程碑|驗收|跨模組|실행 계획|행동 계획|작업 분해|우선순위|의존성|차단|마일스톤|승인 기준|모듈 간|execution plan|action plan|task breakdown|priorit|dependenc|blocker|milestone|acceptance|cross.module)/iu.test(query);
}

function proposedModule(item) {
  const text = searchableText(item);
  if (/research|研究|연구/iu.test(text)) return 'Research';
  if (/learning|course|teaching|學習|課程|학습|과정/iu.test(text)) return 'Learning';
  if (/knowledge|note|知識|筆記|지식|노트/iu.test(text)) return 'Knowledge';
  if (/prototype|mvp|demo|原型|프로토타입/iu.test(text)) return 'Prototype';
  return 'Action Center';
}

export function buildOrchestratorExecutionPlan(toolResults = [], { query = '', lang = 'en' } = {}) {
  if (!isExecutionPlanRequest(query)) return null;
  const items = uniqueToolItems(toolResults); const copy = COPY[lang] || COPY.en;
  const byId = new Map(items.map((item) => [item.id.toLocaleLowerCase(), item]));
  const blockers = items.flatMap((item) => blockerReasons(item, byId).map((text) => ({ text: `${item.title}: ${text}`, sourceIds: [item.id], verificationStatus: 'inferred' })));
  return {
    objective: cleanText(query, 500),
    currentState: items.map((item) => ({ text: copy.verified(item), sourceIds: [item.id], verificationStatus: 'verified' })),
    tasks: items.map((item, index) => ({ id: `proposed-${index + 1}`, title: item.nextAction || `Review ${item.title}`, status: 'proposed', priority: item.priority, sourceIds: [item.id] })),
    priority: items.map((item) => ({ title: item.title, priority: item.priority, status: 'proposed', sourceIds: [item.id] })),
    dependencies: items.flatMap((item) => item.dependencies.map((dependency) => ({ taskId: item.id, dependency, verificationStatus: 'verified', sourceIds: [item.id] }))),
    blockers,
    milestones: [{ title: copy.milestone, status: 'proposed' }],
    risks: [{ text: copy.risk, verificationStatus: 'unverified' }],
    acceptanceCriteria: copy.acceptance.map((text) => ({ text, status: 'planned' })),
    nextActions: [{ text: copy.next, status: 'proposed' }],
    crossModulePlan: items.map((item) => ({ module: proposedModule(item), title: item.nextAction || item.title, status: 'proposed', sourceIds: [item.id] })),
    sourceIds: items.map((item) => item.id), verificationStatus: 'unverified',
  };
}
