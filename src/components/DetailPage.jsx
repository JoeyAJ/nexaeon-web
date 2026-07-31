import { useCallback, useMemo, useRef, useState } from 'react';
import { getModuleData } from '../data/moduleData.js';
import { getDetailItem, getLocalizedSite } from '../lib/contentSource.js';
import {
  createFallbackLiteratureResponse,
  getLiteratureStatusText,
  getLiteratureSummary,
  LITERATURE_UI,
} from '../data/literatureData.js';
import {
  createFallbackKnowledgeResponse,
  getKnowledgeStatusText,
  getKnowledgeSummary,
  getKnowledgeTitle,
  KNOWLEDGE_RESOURCE_UI,
} from '../data/knowledgeResourceData.js';
import { createFallbackIdentityProfilesResponse } from '../data/identityProfileData.js';
import ResourceStateNotice from './ResourceStateNotice.jsx';
import { getGuardrailCopy, GuardrailStatePage } from './AppErrorBoundary.jsx';
import { usePublicApiResource } from '../hooks/usePublicApiResource.js';
import { PUBLIC_RESOURCE_STATUS } from '../lib/publicApiClient.js';
import ModuleDataLayer, { ModuleDataPanel } from './ModuleDataLayer.jsx';
import NeuralBackground from './NeuralBackground.jsx';
import { LangSwitcher, NexLogo, NexWordmark } from './Logo.jsx';
import { toDetailPath } from '../utils/router.js';
import NexAeonNavigatorPage from './NexAeonNavigatorPage.jsx';
import {
  EXPLORER_AGENT_PAGE,
  EXPLORER_ASSISTANT_UI,
  getExplorerDetailItem,
} from '../data/explorerAgent.js';
import { createPrincessModuleActivityAdapter } from '../lib/princessModuleActivity.ts';
import { getNavigatorSourceRoute } from '../lib/companionActionConfig.js';

const INTRO_SEEN_KEY = 'nexaeon_intro_seen';

function Badge({ children }) {
  return <span className="content-tag">{children}</span>;
}

function suppressIntroReplay() {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch {
    // Navigation should still work if storage is unavailable.
  }
}

function DetailTopbar({ common, lang, setLang, theme, setTheme, navigate }) {
  return (
    <header className="subpage-topbar">
      <div className="container subpage-topbar-inner">
        <button
          className="main-logo-link"
          onClick={() => {
            suppressIntroReplay();
            navigate('/');
          }}
          aria-label={common.backHome}
          type="button"
        >
          <NexLogo size={28} />
          <NexWordmark size={22} />
        </button>
        <div className="nav-actions">
          <button
            className="theme-toggle"
            data-princess-passive-control="true"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            type="button"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '◑'}
          </button>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>
      </div>
    </header>
  );
}

function renderBody(body) {
  if (Array.isArray(body)) {
    return (
      <ul className="detail-section-list">
        {body.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    );
  }

  return <p>{body}</p>;
}

function ModuleDataSkeleton({ item, common, lang, navigate, activityAdapter }) {
  return <ModuleDataLayer item={item} common={common} lang={lang} navigate={navigate} activityAdapter={activityAdapter} />;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return value || '';
}

function normalizeSearchText(value) {
  if (Array.isArray(value)) return value.join(' ').toLowerCase();
  if (value && typeof value === 'object') return Object.values(value).join(' ').toLowerCase();
  return String(value || '').toLowerCase();
}

function scrollResultsIntoView(ref) {
  ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const ACTION_PAGE_UI = {
  zh: {
    dataSource: '資料來源',
    publicProjects: '公開專案',
    lastUpdated: '最後更新時間',
    currentResults: '目前篩選結果',
    connected: 'AIRTABLE PROJECTS CONNECTED',
    fallback: 'FALLBACK ACTIVE',
    allPublicProjects: '全部公開專案',
    inProgress: '進行中',
    done: '已完成',
    blocked: '受阻',
    averageProgress: '平均進度',
    searchPlaceholder: '搜尋專案、階段、下一步、自動化狀態或公開摘要',
    sort: '排序',
    recent: '最近更新',
    prioritySort: '優先度',
    progressHigh: '進度高到低',
    progressLow: '進度低到高',
    dueDate: '截止日期',
    nameAz: '名稱 A-Z',
    projectType: '專案類型',
    status: '狀態',
    priority: '優先度',
    automationStatus: '自動化狀態',
    progress: '進度',
    currentPhase: '目前階段',
    nextAction: '下一步',
    startDate: '開始日期',
    publicSummary: '公開摘要',
    expand: '展開詳情',
    collapse: '收合詳情',
    viewDeployment: '查看部署',
    viewGithub: '查看 GitHub',
    viewEvidence: '查看證據',
    loadMore: '載入更多',
    empty: '目前沒有符合條件的公開專案。',
    showing: '目前顯示',
    of: ' / ',
  },
  en: {
    dataSource: 'Data Source',
    publicProjects: 'Public Projects',
    lastUpdated: 'Last Updated',
    currentResults: 'Current Results',
    connected: 'AIRTABLE PROJECTS CONNECTED',
    fallback: 'FALLBACK ACTIVE',
    allPublicProjects: 'All Public Projects',
    inProgress: 'In Progress',
    done: 'Done',
    blocked: 'Blocked',
    averageProgress: 'Average Progress',
    searchPlaceholder: 'Search projects, phases, next actions, automation status, or public summaries',
    sort: 'Sort',
    recent: 'Latest update',
    prioritySort: 'Priority',
    progressHigh: 'Progress high to low',
    progressLow: 'Progress low to high',
    dueDate: 'Due Date',
    nameAz: 'Name A-Z',
    projectType: 'Project Type',
    status: 'Status',
    priority: 'Priority',
    automationStatus: 'Automation Status',
    progress: 'Progress',
    currentPhase: 'Current Phase',
    nextAction: 'Next Action',
    startDate: 'Start Date',
    publicSummary: 'Public Summary',
    expand: 'Expand details',
    collapse: 'Collapse details',
    viewDeployment: 'View Deployment',
    viewGithub: 'View GitHub',
    viewEvidence: 'View Evidence',
    loadMore: 'Load more',
    empty: 'No public projects match the current filters.',
    showing: 'Showing',
    of: ' of ',
  },
  ko: {
    dataSource: '데이터 출처',
    publicProjects: '공개 프로젝트',
    lastUpdated: '최종 업데이트',
    currentResults: '현재 결과',
    connected: 'AIRTABLE PROJECTS CONNECTED',
    fallback: 'FALLBACK ACTIVE',
    allPublicProjects: '전체 공개 프로젝트',
    inProgress: '진행 중',
    done: '완료',
    blocked: '차단됨',
    averageProgress: '평균 진행률',
    searchPlaceholder: '프로젝트, 단계, 다음 작업, 자동화 상태 또는 공개 요약 검색',
    sort: '정렬',
    recent: '최근 업데이트',
    prioritySort: '우선순위',
    progressHigh: '진행률 높은순',
    progressLow: '진행률 낮은순',
    dueDate: '마감일',
    nameAz: '이름 A-Z',
    projectType: '프로젝트 유형',
    status: '상태',
    priority: '우선순위',
    automationStatus: '자동화 상태',
    progress: '진행률',
    currentPhase: '현재 단계',
    nextAction: '다음 작업',
    startDate: '시작일',
    publicSummary: '공개 요약',
    expand: '자세히 보기',
    collapse: '접기',
    viewDeployment: '배포 보기',
    viewGithub: 'GitHub 보기',
    viewEvidence: '증거 보기',
    loadMore: '더 보기',
    empty: '현재 필터와 일치하는 공개 프로젝트가 없다.',
    showing: '표시 중',
    of: ' / ',
  },
};

const ACTION_PROJECT_TYPE_FILTERS = [
  { value: 'all', label: { zh: '全部類型', en: 'All Types', ko: '전체 유형' } },
  { value: 'Product', label: { zh: 'Product', en: 'Product', ko: 'Product' } },
  { value: 'Research', label: { zh: 'Research', en: 'Research', ko: 'Research' } },
  { value: 'Website', label: { zh: 'Website', en: 'Website', ko: 'Website' } },
  { value: 'Automation', label: { zh: 'Automation', en: 'Automation', ko: 'Automation' } },
  { value: 'Operations', label: { zh: 'Operations', en: 'Operations', ko: 'Operations' } },
  { value: 'Other', label: { zh: 'Other', en: 'Other', ko: 'Other' } },
];

const ACTION_STATUS_FILTERS = [
  { value: 'all', label: { zh: '全部狀態', en: 'All Status', ko: '전체 상태' } },
  { value: 'Backlog', label: { zh: 'Backlog', en: 'Backlog', ko: 'Backlog' } },
  { value: 'Planned', label: { zh: 'Planned', en: 'Planned', ko: 'Planned' } },
  { value: 'In Progress', label: { zh: 'In Progress', en: 'In Progress', ko: 'In Progress' } },
  { value: 'Blocked', label: { zh: 'Blocked', en: 'Blocked', ko: 'Blocked' } },
  { value: 'Review', label: { zh: 'Review', en: 'Review', ko: 'Review' } },
  { value: 'Done', label: { zh: 'Done', en: 'Done', ko: 'Done' } },
  { value: 'Paused', label: { zh: 'Paused', en: 'Paused', ko: 'Paused' } },
];

const ACTION_PRIORITY_FILTERS = [
  { value: 'all', label: { zh: '全部優先度', en: 'All Priority', ko: '전체 우선순위' } },
  { value: 'High', label: { zh: 'High', en: 'High', ko: 'High' } },
  { value: 'Medium', label: { zh: 'Medium', en: 'Medium', ko: 'Medium' } },
  { value: 'Low', label: { zh: 'Low', en: 'Low', ko: 'Low' } },
];

const ACTION_AUTOMATION_FILTERS = [
  { value: 'all', label: { zh: '全部自動化狀態', en: 'All Automation Status', ko: '전체 자동화 상태' } },
  { value: 'Not Connected', label: { zh: 'Not Connected', en: 'Not Connected', ko: 'Not Connected' } },
  { value: 'Planned', label: { zh: 'Planned', en: 'Planned', ko: 'Planned' } },
  { value: 'Active', label: { zh: 'Active', en: 'Active', ko: 'Active' } },
  { value: 'Error', label: { zh: 'Error', en: 'Error', ko: 'Error' } },
];

const ACTION_PROGRESS_FILTERS = [
  { value: 'all', label: { zh: '全部進度', en: 'All Progress', ko: '전체 진행률' }, min: 0, max: 100 },
  { value: '0-25', label: { zh: '0-25%', en: '0-25%', ko: '0-25%' }, min: 0, max: 25 },
  { value: '26-50', label: { zh: '26-50%', en: '26-50%', ko: '26-50%' }, min: 26, max: 50 },
  { value: '51-75', label: { zh: '51-75%', en: '51-75%', ko: '51-75%' }, min: 51, max: 75 },
  { value: '76-99', label: { zh: '76-99%', en: '76-99%', ko: '76-99%' }, min: 76, max: 99 },
  { value: '100', label: { zh: '100%', en: '100%', ko: '100%' }, min: 100, max: 100 },
];

function normalizeActionProjectResponse(reason = 'upstream_failed') {
  return {
    source: 'fallback',
    reason,
    count: 0,
    updatedAt: '',
    items: [],
    data: [],
  };
}

function getLocalizedActionFallbackTitle(item, lang) {
  if (lang === 'zh') return item.titleZh || item.titleEn || item.titleKo || 'Untitled Project';
  if (lang === 'ko') return item.titleKo || item.titleEn || item.titleZh || 'Untitled Project';
  return item.titleEn || item.titleZh || item.titleKo || 'Untitled Project';
}

function getLocalizedActionFallbackDescription(item, lang) {
  if (lang === 'zh') return item.descriptionZh || item.descriptionEn || item.descriptionKo || '';
  if (lang === 'ko') return item.descriptionKo || item.descriptionEn || item.descriptionZh || '';
  return item.descriptionEn || item.descriptionZh || item.descriptionKo || '';
}

function normalizeActionFallbackProject(item, lang) {
  const projectTypeMap = {
    website: 'Website',
    research_system: 'Research',
    mvp: 'Product',
    automation: 'Automation',
    backend: 'Operations',
  };

  return {
    id: item.id,
    name: getLocalizedActionFallbackTitle(item, lang),
    projectType: projectTypeMap[item.type] || projectTypeMap[item.category] || 'Other',
    status: item.status || 'Planned',
    priority: 'Medium',
    startDate: '',
    dueDate: '',
    progress: 0,
    currentPhase: item.category || item.status || '',
    nextAction: '',
    publicSummary: getLocalizedActionFallbackDescription(item, lang),
    githubUrl: '',
    deploymentUrl: item.actionUrl || '',
    automationStatus: 'Planned',
    evidenceUrl: '',
    updatedAt: item.updatedAt || '',
  };
}

function createClientActionFallbackResponse(reason, lang) {
  const items = getModuleData('action').map((item) => normalizeActionFallbackProject(item, lang));
  return {
    ...normalizeActionProjectResponse(reason),
    count: items.length,
    updatedAt: getActionLatestUpdatedAt({ updatedAt: '' }, items),
    items,
    data: items,
  };
}

function useActionProjects(lang, activityAdapter) {
  const createClientFallbackPayload = useCallback(
    () => createClientActionFallbackResponse('upstream_failed', lang),
    [lang],
  );
  return usePublicApiResource('/api/action/projects', { createClientFallbackPayload, companionEventAdapter: activityAdapter });
}

function hasActionValue(value) {
  if (value === undefined || value === null) return false;
  return String(value).trim().length > 0;
}

function normalizeActionSearchValue(value) {
  return String(value || '').toLowerCase();
}

function getActionSearchBody(project) {
  return [
    project.name,
    project.projectType,
    project.status,
    project.priority,
    project.currentPhase,
    project.nextAction,
    project.publicSummary,
    project.automationStatus,
  ].map(normalizeActionSearchValue).join(' ');
}

function getActionProgress(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function getActionUpdatedTime(project) {
  const time = new Date(project.updatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getActionDueTime(project) {
  if (!project.dueDate) return Number.POSITIVE_INFINITY;
  const time = new Date(project.dueDate).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

function getActionPriorityRank(priority) {
  const ranks = { High: 0, Medium: 1, Low: 2 };
  return ranks[priority] ?? 9;
}

function formatActionDate(value) {
  if (!hasActionValue(value)) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isActionFilterMatch(value, activeValue) {
  return activeValue === 'all' || String(value || '') === activeValue;
}

function isProgressFilterMatch(value, activeValue) {
  if (activeValue === 'all') return true;
  const filter = ACTION_PROGRESS_FILTERS.find((item) => item.value === activeValue);
  if (!filter) return true;
  const progress = getActionProgress(value);
  return progress >= filter.min && progress <= filter.max;
}

function getActionLatestUpdatedAt(projectState, items) {
  if (projectState.updatedAt) return projectState.updatedAt;
  const latest = items
    .map((project) => project.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return latest || '';
}

function ActionFilterGroup({ label, filters, activeValue, onSelect, lang }) {
  return (
    <div className="action-filter-section">
      <span>{label}</span>
      <div className="action-filter-row">
        {filters.map((filter) => (
          <button
            key={filter.value}
            className="action-filter-chip"
            data-active={activeValue === filter.value ? 'true' : 'false'}
            type="button"
            onClick={() => { if (activeValue !== filter.value) onSelect(filter.value); }}
          >
            {filter.label[lang] || filter.label.zh}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionDetailField({ label, value }) {
  if (!hasActionValue(value)) return null;

  return (
    <div className="action-detail-field">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function ActionProjectDashboard({ item, common, lang, activityAdapter }) {
  const projectState = useActionProjects(lang, activityAdapter);
  const ui = ACTION_PAGE_UI[lang] || ACTION_PAGE_UI.zh;
  const [searchQuery, setSearchQuery] = useState('');
  const [projectTypeFilter, setProjectTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [automationFilter, setAutomationFilter] = useState('all');
  const [progressFilter, setProgressFilter] = useState('all');
  const [sortMode, setSortMode] = useState('recent');
  const [visibleCount, setVisibleCount] = useState(8);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const resultsRef = useRef(null);
  const projects = useMemo(() => projectState.data || projectState.items || [], [projectState.data, projectState.items]);
  const actionResourceStatus = projectState.resourceStatus || PUBLIC_RESOURCE_STATUS.LOADING;

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = projects.filter((project) => {
      const matchesSearch = !normalizedQuery || getActionSearchBody(project).includes(normalizedQuery);
      return matchesSearch
        && isActionFilterMatch(project.projectType, projectTypeFilter)
        && isActionFilterMatch(project.status, statusFilter)
        && isActionFilterMatch(project.priority, priorityFilter)
        && isActionFilterMatch(project.automationStatus, automationFilter)
        && isProgressFilterMatch(project.progress, progressFilter);
    });

    return filtered.slice().sort((a, b) => {
      if (sortMode === 'priority') {
        const priorityDifference = getActionPriorityRank(a.priority) - getActionPriorityRank(b.priority);
        if (priorityDifference) return priorityDifference;
      }
      if (sortMode === 'progress-high') return getActionProgress(b.progress) - getActionProgress(a.progress);
      if (sortMode === 'progress-low') return getActionProgress(a.progress) - getActionProgress(b.progress);
      if (sortMode === 'due-date') {
        const dueDifference = getActionDueTime(a) - getActionDueTime(b);
        if (dueDifference) return dueDifference;
      }
      if (sortMode === 'name') return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
      return getActionUpdatedTime(b) - getActionUpdatedTime(a);
    });
  }, [automationFilter, priorityFilter, progressFilter, projectTypeFilter, projects, searchQuery, sortMode, statusFilter]);

  const visibleProjects = filteredProjects.slice(0, visibleCount);
  const latestUpdatedAt = getActionLatestUpdatedAt(projectState, projects);
  const totalProgress = filteredProjects.reduce((sum, project) => sum + getActionProgress(project.progress), 0);
  const averageProgress = filteredProjects.length ? Math.round(totalProgress / filteredProjects.length) : 0;
  const summaryItems = [
    { label: ui.allPublicProjects, value: filteredProjects.length },
    { label: ui.inProgress, value: filteredProjects.filter((project) => project.status === 'In Progress').length },
    { label: ui.done, value: filteredProjects.filter((project) => project.status === 'Done').length },
    { label: ui.blocked, value: filteredProjects.filter((project) => project.status === 'Blocked').length },
    { label: ui.averageProgress, value: `${averageProgress}%` },
  ];

  function toggleExpanded(id) {
    const opening = !expandedIds.has(id);
    activityAdapter?.dispatch(opening ? 'project-opened' : 'item-closed', { entityType: 'project' });
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetVisibleCount() {
    setVisibleCount(8);
  }

  function updateSearchQuery(value) {
    setSearchQuery(value);
    resetVisibleCount();
  }

  function updateFilter(setter, value) {
    setter(value);
    resetVisibleCount();
    activityAdapter?.dispatch('filter-applied', { entityType: 'project-filter' });
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Enter' && searchQuery.trim()) {
      activityAdapter?.search(filteredProjects.length, { entityType: 'project', key: 'action-search' });
      scrollResultsIntoView(resultsRef);
    }
  }

  return (
    <article className="content-detail-card module-detail-card action-project-dashboard">
      <div className="detail-badge-row">
        <Badge>{common.moduleLabel}: {item.category}</Badge>
        <Badge>{item.status}</Badge>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>Field Lab</h1>
      <p className="detail-subtitle">{item.subtitle}</p>

      <div className="action-state-row" aria-label={item.title}>
        <span>{ui.dataSource}: {projectState.source || '...'}</span>
        <span>{ui.publicProjects}: {projectState.count ?? projects.length}</span>
        <span>{ui.lastUpdated}: {formatActionDate(latestUpdatedAt)}</span>
        <span>{ui.currentResults}: {filteredProjects.length}</span>
      </div>

      <ResourceStateNotice
        lang={lang}
        status={actionResourceStatus}
        isRefreshing={projectState.isRefreshing}
        onRetry={projectState.retry}
        retryDisabled={projectState.isLoading || projectState.isRefreshing}
      />

      {projectState.source && actionResourceStatus !== PUBLIC_RESOURCE_STATUS.LOADING && actionResourceStatus !== PUBLIC_RESOURCE_STATUS.ERROR ? (
        <div className="action-source-card" data-source={projectState.source === 'airtable' ? 'airtable' : 'fallback'}>
          <span>{projectState.source === 'airtable' ? ui.connected : ui.fallback}</span>
        </div>
      ) : null}

      <section className="action-summary-grid" aria-label={ui.progress}>
        {summaryItems.map((summary) => (
          <div key={summary.label} className="action-summary-card">
            <span>{summary.label}</span>
            <strong>{summary.value}</strong>
          </div>
        ))}
      </section>

      <section className="action-toolbar" aria-label={ui.searchPlaceholder}>
        <input
          className="action-search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => updateSearchQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={ui.searchPlaceholder}
          aria-label={ui.searchPlaceholder}
        />

        <label className="action-sort-control">
          <span>{ui.sort}</span>
          <select value={sortMode} onChange={(event) => updateFilter(setSortMode, event.target.value)}>
            <option value="recent">{ui.recent}</option>
            <option value="priority">{ui.prioritySort}</option>
            <option value="progress-high">{ui.progressHigh}</option>
            <option value="progress-low">{ui.progressLow}</option>
            <option value="due-date">{ui.dueDate}</option>
            <option value="name">{ui.nameAz}</option>
          </select>
        </label>
      </section>

      <section className="action-filter-panel" aria-label={ui.projectType}>
        <ActionFilterGroup label={ui.projectType} filters={ACTION_PROJECT_TYPE_FILTERS} activeValue={projectTypeFilter} onSelect={(value) => updateFilter(setProjectTypeFilter, value)} lang={lang} />
        <ActionFilterGroup label={ui.status} filters={ACTION_STATUS_FILTERS} activeValue={statusFilter} onSelect={(value) => updateFilter(setStatusFilter, value)} lang={lang} />
        <ActionFilterGroup label={ui.priority} filters={ACTION_PRIORITY_FILTERS} activeValue={priorityFilter} onSelect={(value) => updateFilter(setPriorityFilter, value)} lang={lang} />
        <ActionFilterGroup label={ui.automationStatus} filters={ACTION_AUTOMATION_FILTERS} activeValue={automationFilter} onSelect={(value) => updateFilter(setAutomationFilter, value)} lang={lang} />
        <ActionFilterGroup label={ui.progress} filters={ACTION_PROGRESS_FILTERS} activeValue={progressFilter} onSelect={(value) => updateFilter(setProgressFilter, value)} lang={lang} />
      </section>

      <section ref={resultsRef} className="action-project-list" aria-label={ui.publicProjects}>
        {visibleProjects.map((project) => {
          const isExpanded = expandedIds.has(project.id);
          const progress = getActionProgress(project.progress);
          const statusTone = project.status === 'Blocked' || project.automationStatus === 'Error' ? 'attention' : 'normal';
          const detailFields = [
            { label: ui.projectType, value: project.projectType },
            { label: ui.status, value: project.status },
            { label: ui.priority, value: project.priority },
            { label: ui.startDate, value: formatActionDate(project.startDate) },
            { label: ui.dueDate, value: formatActionDate(project.dueDate) },
            { label: ui.progress, value: `${progress}%` },
            { label: ui.currentPhase, value: project.currentPhase },
            { label: ui.nextAction, value: project.nextAction },
            { label: ui.publicSummary, value: project.publicSummary },
            { label: ui.automationStatus, value: project.automationStatus },
            { label: ui.lastUpdated, value: formatActionDate(project.updatedAt) },
          ];

          return (
            <article key={project.id} className="action-project-card" data-tone={statusTone}>
              <div className="action-project-card-main">
                <div className="module-data-card-top action-project-top">
                  {hasActionValue(project.projectType) ? <span className="content-tag">{project.projectType}</span> : null}
                  {hasActionValue(project.status) ? <span className="module-data-status">{project.status}</span> : null}
                  {hasActionValue(project.priority) ? <span className="module-data-status">{project.priority}</span> : null}
                </div>

                <h2>{project.name || 'Untitled Project'}</h2>

                <div className="action-compact-meta">
                  {hasActionValue(project.currentPhase) ? <span>{ui.currentPhase}: {project.currentPhase}</span> : null}
                  {hasActionValue(project.automationStatus) ? <span>{ui.automationStatus}: {project.automationStatus}</span> : null}
                  {hasActionValue(project.updatedAt) ? <span>{ui.lastUpdated}: {formatActionDate(project.updatedAt)}</span> : null}
                </div>

                <div className="action-progress">
                  <div className="action-progress-top">
                    <span>{ui.progress}</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="action-progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {hasActionValue(project.publicSummary) ? <p className="action-project-summary">{project.publicSummary}</p> : null}

                <div className="action-project-actions">
                  <button
                    className="action-action-button"
                    type="button"
                    onClick={() => toggleExpanded(project.id)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? ui.collapse : ui.expand}
                  </button>
                  {hasActionValue(project.deploymentUrl) ? (
                    <a className="action-action-button" href={project.deploymentUrl} target="_blank" rel="noopener noreferrer">
                      {ui.viewDeployment}
                    </a>
                  ) : null}
                  {hasActionValue(project.githubUrl) ? (
                    <a className="action-action-button" href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                      {ui.viewGithub}
                    </a>
                  ) : null}
                  {hasActionValue(project.evidenceUrl) ? (
                    <a className="action-action-button" href={project.evidenceUrl} target="_blank" rel="noopener noreferrer">
                      {ui.viewEvidence}
                    </a>
                  ) : null}
                </div>
              </div>

              {isExpanded ? (
                <div className="action-detail-panel">
                  <div className="action-detail-grid">
                    {detailFields.map((field) => (
                      <ActionDetailField key={field.label} label={field.label} value={field.value} />
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {!filteredProjects.length && actionResourceStatus !== PUBLIC_RESOURCE_STATUS.LOADING ? (
          <article className="action-empty-state">
            <p>{ui.empty}</p>
          </article>
        ) : null}
      </section>

      {filteredProjects.length > visibleCount ? (
        <div className="action-load-more-row">
          <span>{ui.showing} {visibleProjects.length}{ui.of}{filteredProjects.length}</span>
          <button
            className="action-load-more"
            type="button"
            onClick={() => setVisibleCount((count) => count + 8)}
          >
            {ui.loadMore}
          </button>
        </div>
      ) : null}
    </article>
  );
}

const COLLABORATION_CONTEXT_UI = {
  zh: {
    dataSource: '資料來源',
    publicContexts: '公開合作情境',
    lastUpdated: '最後更新時間',
    currentResults: '目前篩選結果',
    connected: 'AIRTABLE COLLABORATION CONTEXTS CONNECTED',
    fallback: 'FALLBACK ACTIVE',
    allPublicContexts: '全部公開情境',
    open: 'Open',
    exploring: 'Exploring',
    inDevelopment: 'In Development',
    active: 'Active',
    completed: 'Completed',
    typeOverview: '合作類型數量',
    searchPlaceholder: '搜尋合作情境、合作類型、機構類型或公開摘要',
    sort: '排序',
    recommended: '推薦順序',
    recentlyUpdated: '最近更新',
    nameAz: '名稱 A-Z',
    stageSort: '合作階段',
    collaborationType: '合作類型',
    organizationType: '機構類型',
    collaborationStage: '合作階段',
    publicSummary: '公開摘要',
    featured: 'Featured',
    expand: '展開詳情',
    collapse: '收合詳情',
    viewReference: '查看參考頁面',
    loadMore: '載入更多',
    empty: '目前沒有公開的合作情境。',
    showing: '目前顯示',
    of: ' / ',
  },
  en: {
    dataSource: 'Data Source',
    publicContexts: 'Public Collaboration Contexts',
    lastUpdated: 'Last Updated',
    currentResults: 'Current Results',
    connected: 'AIRTABLE COLLABORATION CONTEXTS CONNECTED',
    fallback: 'FALLBACK ACTIVE',
    allPublicContexts: 'All Public Contexts',
    open: 'Open',
    exploring: 'Exploring',
    inDevelopment: 'In Development',
    active: 'Active',
    completed: 'Completed',
    typeOverview: 'Collaboration Type Count',
    searchPlaceholder: 'Search collaboration contexts, types, organization categories, or public summaries',
    sort: 'Sort',
    recommended: 'Recommended',
    recentlyUpdated: 'Recently Updated',
    nameAz: 'Name A-Z',
    stageSort: 'Collaboration Stage',
    collaborationType: 'Collaboration Type',
    organizationType: 'Organization Type',
    collaborationStage: 'Collaboration Stage',
    publicSummary: 'Public Summary',
    featured: 'Featured',
    expand: 'Expand details',
    collapse: 'Collapse details',
    viewReference: 'View Reference',
    loadMore: 'Load more',
    empty: 'No public collaboration contexts are available yet.',
    showing: 'Showing',
    of: ' of ',
  },
  ko: {
    dataSource: '데이터 출처',
    publicContexts: '공개 협력 맥락',
    lastUpdated: '최종 업데이트',
    currentResults: '현재 결과',
    connected: 'AIRTABLE COLLABORATION CONTEXTS CONNECTED',
    fallback: 'FALLBACK ACTIVE',
    allPublicContexts: '전체 공개 맥락',
    open: 'Open',
    exploring: 'Exploring',
    inDevelopment: 'In Development',
    active: 'Active',
    completed: 'Completed',
    typeOverview: '협력 유형 수',
    searchPlaceholder: '협력 맥락, 협력 유형, 기관 유형 또는 공개 요약 검색',
    sort: '정렬',
    recommended: '추천 순서',
    recentlyUpdated: '최근 업데이트',
    nameAz: '이름 A-Z',
    stageSort: '협력 단계',
    collaborationType: '협력 유형',
    organizationType: '기관 유형',
    collaborationStage: '협력 단계',
    publicSummary: '공개 요약',
    featured: 'Featured',
    expand: '자세히 보기',
    collapse: '접기',
    viewReference: '참고 페이지 보기',
    loadMore: '더 보기',
    empty: '현재 공개된 협력 맥락이 없다.',
    showing: '표시 중',
    of: ' / ',
  },
};

const COLLABORATION_TYPE_FILTERS = [
  { value: 'all', label: { zh: '全部類型', en: 'All Types', ko: '전체 유형' } },
  { value: 'Research', label: { zh: 'Research', en: 'Research', ko: 'Research' } },
  { value: 'Lecture', label: { zh: 'Lecture', en: 'Lecture', ko: 'Lecture' } },
  { value: 'Workshop', label: { zh: 'Workshop', en: 'Workshop', ko: 'Workshop' } },
  { value: 'AI Education Consulting', label: { zh: 'AI Education Consulting', en: 'AI Education Consulting', ko: 'AI Education Consulting' } },
  { value: 'Product Pilot', label: { zh: 'Product Pilot', en: 'Product Pilot', ko: 'Product Pilot' } },
  { value: 'Data / Automation', label: { zh: 'Data / Automation', en: 'Data / Automation', ko: 'Data / Automation' } },
  { value: 'Sponsorship', label: { zh: 'Sponsorship', en: 'Sponsorship', ko: 'Sponsorship' } },
  { value: 'Other', label: { zh: 'Other', en: 'Other', ko: 'Other' } },
];

const COLLABORATION_ORG_FILTERS = [
  { value: 'all', label: { zh: '全部機構', en: 'All Organizations', ko: '전체 기관' } },
  { value: 'University', label: { zh: 'University', en: 'University', ko: 'University' } },
  { value: 'Professor', label: { zh: 'Professor', en: 'Professor', ko: 'Professor' } },
  { value: 'Student Team', label: { zh: 'Student Team', en: 'Student Team', ko: 'Student Team' } },
  { value: 'Company', label: { zh: 'Company', en: 'Company', ko: 'Company' } },
  { value: 'NGO', label: { zh: 'NGO', en: 'NGO', ko: 'NGO' } },
  { value: 'Government', label: { zh: 'Government', en: 'Government', ko: 'Government' } },
  { value: 'Other', label: { zh: 'Other', en: 'Other', ko: 'Other' } },
];

const COLLABORATION_STAGE_FILTERS = [
  { value: 'all', label: { zh: '全部階段', en: 'All Stages', ko: '전체 단계' } },
  { value: 'Open', label: { zh: 'Open', en: 'Open', ko: 'Open' } },
  { value: 'Exploring', label: { zh: 'Exploring', en: 'Exploring', ko: 'Exploring' } },
  { value: 'In Development', label: { zh: 'In Development', en: 'In Development', ko: 'In Development' } },
  { value: 'Active', label: { zh: 'Active', en: 'Active', ko: 'Active' } },
  { value: 'Completed', label: { zh: 'Completed', en: 'Completed', ko: 'Completed' } },
];

function createEmptyCollaborationSummary(items = []) {
  return {
    total: items.length,
    open: items.filter((item) => item.publicStage === 'Open').length,
    exploring: items.filter((item) => item.publicStage === 'Exploring').length,
    inDevelopment: items.filter((item) => item.publicStage === 'In Development').length,
    active: items.filter((item) => item.publicStage === 'Active').length,
    completed: items.filter((item) => item.publicStage === 'Completed').length,
  };
}

function getLocalizedCollaborationFallbackTitle(item, lang) {
  if (lang === 'zh') return item.titleZh || item.titleEn || item.titleKo || 'Untitled Collaboration Context';
  if (lang === 'ko') return item.titleKo || item.titleEn || item.titleZh || 'Untitled Collaboration Context';
  return item.titleEn || item.titleZh || item.titleKo || 'Untitled Collaboration Context';
}

function getLocalizedCollaborationFallbackDescription(item, lang) {
  if (lang === 'zh') return item.descriptionZh || item.descriptionEn || item.descriptionKo || '';
  if (lang === 'ko') return item.descriptionKo || item.descriptionEn || item.descriptionZh || '';
  return item.descriptionEn || item.descriptionZh || item.descriptionKo || '';
}

function normalizeCollaborationFallbackContext(item, lang) {
  const organizationTypeMap = {
    academic: 'University',
    workshop: 'University',
    consulting: 'Company',
    enterprise: 'Company',
    education_partnership: 'Other',
  };
  const typeMap = {
    academic: ['Research'],
    workshop: ['Workshop', 'Lecture'],
    consulting: ['AI Education Consulting'],
    enterprise: ['Data / Automation'],
    education_partnership: ['Product Pilot'],
  };

  return {
    id: item.id,
    title: getLocalizedCollaborationFallbackTitle(item, lang),
    summary: getLocalizedCollaborationFallbackDescription(item, lang),
    organizationType: organizationTypeMap[item.type] || organizationTypeMap[item.category] || 'Other',
    collaborationTypes: typeMap[item.type] || typeMap[item.category] || ['Other'],
    publicStage: item.featured ? 'Exploring' : 'Open',
    featured: Boolean(item.featured),
    displayOrder: Number.isFinite(Number(item.order)) ? Number(item.order) : 0,
    websiteUrl: '',
    updatedAt: item.updatedAt || '',
  };
}

function createClientCollaborationFallbackResponse(reason, lang) {
  const items = getModuleData('collaboration').map((item) => normalizeCollaborationFallbackContext(item, lang));
  return {
    source: 'fallback',
    reason,
    count: items.length,
    updatedAt: getCollaborationLatestUpdatedAt({ updatedAt: '' }, items),
    summary: createEmptyCollaborationSummary(items),
    items,
    data: items,
  };
}

function useCollaborationContexts(lang) {
  const createClientFallbackPayload = useCallback(
    () => createClientCollaborationFallbackResponse('upstream_failed', lang),
    [lang],
  );
  return usePublicApiResource('/api/collaboration/options', { createClientFallbackPayload });
}

function hasCollaborationValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value === undefined || value === null) return false;
  return String(value).trim().length > 0;
}

function formatCollaborationList(value) {
  if (!Array.isArray(value)) return hasCollaborationValue(value) ? String(value) : '';
  return value.filter(Boolean).join(', ');
}

function getCollaborationSearchBody(context) {
  return [
    context.title,
    context.summary,
    context.organizationType,
    formatCollaborationList(context.collaborationTypes),
    context.publicStage,
  ].map((value) => String(value || '').toLowerCase()).join(' ');
}

function getCollaborationUpdatedTime(context) {
  const time = new Date(context.updatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getCollaborationLatestUpdatedAt(contextState, items) {
  if (contextState.updatedAt) return contextState.updatedAt;
  const latest = items
    .map((context) => context.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return latest || '';
}

function getCollaborationStageRank(stage) {
  const ranks = { Open: 0, Exploring: 1, 'In Development': 2, Active: 3, Completed: 4 };
  return ranks[stage] ?? 9;
}

function formatCollaborationDate(value) {
  if (!hasCollaborationValue(value)) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function doesCollaborationTypeMatch(context, activeValue) {
  if (activeValue === 'all') return true;
  return Array.isArray(context.collaborationTypes) && context.collaborationTypes.includes(activeValue);
}

function doesCollaborationFieldMatch(value, activeValue) {
  return activeValue === 'all' || String(value || '') === activeValue;
}

function CollaborationFilterGroup({ label, filters, activeValue, onSelect, lang }) {
  return (
    <div className="collaboration-filter-section">
      <span>{label}</span>
      <div className="collaboration-filter-row">
        {filters.map((filter) => (
          <button
            key={filter.value}
            className="collaboration-filter-chip"
            data-active={activeValue === filter.value ? 'true' : 'false'}
            type="button"
            onClick={() => { if (activeValue !== filter.value) onSelect(filter.value); }}
          >
            {filter.label[lang] || filter.label.zh}
          </button>
        ))}
      </div>
    </div>
  );
}

function CollaborationDetailField({ label, value, isLink = false, linkLabel = '' }) {
  if (!hasCollaborationValue(value)) return null;

  return (
    <div className="collaboration-detail-field">
      <span>{label}</span>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer">{linkLabel || value}</a>
      ) : (
        <p>{Array.isArray(value) ? formatCollaborationList(value) : value}</p>
      )}
    </div>
  );
}

function FutureCollaborationContextDashboard({ item, common, lang }) {
  const contextState = useCollaborationContexts(lang);
  const ui = COLLABORATION_CONTEXT_UI[lang] || COLLABORATION_CONTEXT_UI.zh;
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [sortMode, setSortMode] = useState('recommended');
  const [visibleCount, setVisibleCount] = useState(8);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const resultsRef = useRef(null);
  const contexts = useMemo(() => contextState.data || contextState.items || [], [contextState.data, contextState.items]);
  const collaborationResourceStatus = contextState.resourceStatus || PUBLIC_RESOURCE_STATUS.LOADING;

  const filteredContexts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = contexts.filter((context) => {
      const matchesSearch = !normalizedQuery || getCollaborationSearchBody(context).includes(normalizedQuery);
      return matchesSearch
        && doesCollaborationTypeMatch(context, typeFilter)
        && doesCollaborationFieldMatch(context.organizationType, orgFilter)
        && doesCollaborationFieldMatch(context.publicStage, stageFilter);
    });

    return filtered.slice().sort((a, b) => {
      if (sortMode === 'recent') return getCollaborationUpdatedTime(b) - getCollaborationUpdatedTime(a);
      if (sortMode === 'name') return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });
      if (sortMode === 'stage') {
        const stageDifference = getCollaborationStageRank(a.publicStage) - getCollaborationStageRank(b.publicStage);
        if (stageDifference) return stageDifference;
      }
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      const updatedDifference = getCollaborationUpdatedTime(b) - getCollaborationUpdatedTime(a);
      if (updatedDifference) return updatedDifference;
      return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });
    });
  }, [contexts, orgFilter, searchQuery, sortMode, stageFilter, typeFilter]);

  const visibleContexts = filteredContexts.slice(0, visibleCount);
  const latestUpdatedAt = getCollaborationLatestUpdatedAt(contextState, contexts);
  const typeCounts = COLLABORATION_TYPE_FILTERS
    .filter((filter) => filter.value !== 'all')
    .map((filter) => ({
      label: filter.value,
      count: filteredContexts.filter((context) => Array.isArray(context.collaborationTypes) && context.collaborationTypes.includes(filter.value)).length,
    }));
  const summaryItems = [
    { label: ui.allPublicContexts, value: filteredContexts.length },
    { label: ui.open, value: filteredContexts.filter((context) => context.publicStage === 'Open').length },
    { label: ui.exploring, value: filteredContexts.filter((context) => context.publicStage === 'Exploring').length },
    { label: ui.inDevelopment, value: filteredContexts.filter((context) => context.publicStage === 'In Development').length },
    { label: ui.active, value: filteredContexts.filter((context) => context.publicStage === 'Active').length },
    { label: ui.completed, value: filteredContexts.filter((context) => context.publicStage === 'Completed').length },
  ];

  function resetVisibleCount() {
    setVisibleCount(8);
  }

  function updateSearchQuery(value) {
    setSearchQuery(value);
    resetVisibleCount();
  }

  function updateFilter(setter, value) {
    setter(value);
    resetVisibleCount();
  }

  function toggleExpanded(id) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Enter') {
      scrollResultsIntoView(resultsRef);
    }
  }

  return (
    <article className="content-detail-card module-detail-card collaboration-context-dashboard">
      <div className="detail-badge-row">
        <Badge>{common.moduleLabel}: {item.category}</Badge>
        <Badge>{item.status}</Badge>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{item.title}</h1>
      <p className="detail-subtitle">{item.subtitle}</p>

      <div className="collaboration-state-row" aria-label={item.title}>
        <span>{ui.dataSource}: {contextState.source || '...'}</span>
        <span>{ui.publicContexts}: {contextState.count ?? contexts.length}</span>
        <span>{ui.lastUpdated}: {formatCollaborationDate(latestUpdatedAt)}</span>
        <span>{ui.currentResults}: {filteredContexts.length}</span>
      </div>

      <ResourceStateNotice
        lang={lang}
        status={collaborationResourceStatus}
        isRefreshing={contextState.isRefreshing}
        onRetry={contextState.retry}
        retryDisabled={contextState.isLoading || contextState.isRefreshing}
      />

      {contextState.source && collaborationResourceStatus !== PUBLIC_RESOURCE_STATUS.LOADING && collaborationResourceStatus !== PUBLIC_RESOURCE_STATUS.ERROR ? (
        <div className="collaboration-source-card" data-source={contextState.source === 'airtable' ? 'airtable' : 'fallback'}>
          <span>{contextState.source === 'airtable' ? ui.connected : ui.fallback}</span>
        </div>
      ) : null}

      <section className="collaboration-summary-grid" aria-label={ui.publicContexts}>
        {summaryItems.map((summaryItem) => (
          <div key={summaryItem.label} className="collaboration-summary-card">
            <span>{summaryItem.label}</span>
            <strong>{summaryItem.value}</strong>
          </div>
        ))}
      </section>

      <section className="collaboration-type-summary" aria-label={ui.typeOverview}>
        <span>{ui.typeOverview}</span>
        <div>
          {typeCounts.map((type) => (
            <span key={type.label}>{type.label}: {type.count}</span>
          ))}
        </div>
      </section>

      <section className="collaboration-toolbar" aria-label={ui.searchPlaceholder}>
        <input
          className="collaboration-search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => updateSearchQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={ui.searchPlaceholder}
          aria-label={ui.searchPlaceholder}
        />

        <label className="collaboration-sort-control">
          <span>{ui.sort}</span>
          <select value={sortMode} onChange={(event) => updateFilter(setSortMode, event.target.value)}>
            <option value="recommended">{ui.recommended}</option>
            <option value="recent">{ui.recentlyUpdated}</option>
            <option value="name">{ui.nameAz}</option>
            <option value="stage">{ui.stageSort}</option>
          </select>
        </label>
      </section>

      <section className="collaboration-filter-panel" aria-label={ui.collaborationType}>
        <CollaborationFilterGroup label={ui.collaborationType} filters={COLLABORATION_TYPE_FILTERS} activeValue={typeFilter} onSelect={(value) => updateFilter(setTypeFilter, value)} lang={lang} />
        <CollaborationFilterGroup label={ui.organizationType} filters={COLLABORATION_ORG_FILTERS} activeValue={orgFilter} onSelect={(value) => updateFilter(setOrgFilter, value)} lang={lang} />
        <CollaborationFilterGroup label={ui.collaborationStage} filters={COLLABORATION_STAGE_FILTERS} activeValue={stageFilter} onSelect={(value) => updateFilter(setStageFilter, value)} lang={lang} />
      </section>

      <section ref={resultsRef} className="collaboration-context-list" aria-label={ui.publicContexts}>
        {visibleContexts.map((context) => {
          const isExpanded = expandedIds.has(context.id);
          const detailFields = [
            { label: ui.publicSummary, value: context.summary },
            { label: ui.organizationType, value: context.organizationType },
            { label: ui.collaborationType, value: context.collaborationTypes },
            { label: ui.collaborationStage, value: context.publicStage },
            { label: ui.lastUpdated, value: formatCollaborationDate(context.updatedAt) },
          ];

          return (
            <article key={context.id} className="collaboration-context-card" data-featured={context.featured ? 'true' : 'false'}>
              <div className="module-data-card-top collaboration-context-top">
                {hasCollaborationValue(context.organizationType) ? <span className="content-tag">{context.organizationType}</span> : null}
                {hasCollaborationValue(context.publicStage) ? <span className="module-data-status">{context.publicStage}</span> : null}
                {context.featured ? <span className="module-data-status">{ui.featured}</span> : null}
              </div>

              <h2>{context.title || 'Untitled Collaboration Context'}</h2>

              <div className="collaboration-compact-meta">
                {hasCollaborationValue(context.collaborationTypes) ? <span>{ui.collaborationType}: {formatCollaborationList(context.collaborationTypes)}</span> : null}
                {hasCollaborationValue(context.updatedAt) ? <span>{ui.lastUpdated}: {formatCollaborationDate(context.updatedAt)}</span> : null}
              </div>

              {hasCollaborationValue(context.summary) ? <p className="collaboration-context-summary">{context.summary}</p> : null}

              <div className="collaboration-actions">
                <button
                  className="collaboration-action-button"
                  type="button"
                  onClick={() => toggleExpanded(context.id)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? ui.collapse : ui.expand}
                </button>
                {hasCollaborationValue(context.websiteUrl) ? (
                  <a className="collaboration-action-button" href={context.websiteUrl} target="_blank" rel="noopener noreferrer">
                    {ui.viewReference}
                  </a>
                ) : null}
              </div>

              {isExpanded ? (
                <div className="collaboration-detail-panel">
                  <div className="collaboration-detail-grid">
                    {detailFields.map((field) => (
                      <CollaborationDetailField key={field.label} label={field.label} value={field.value} />
                    ))}
                    <CollaborationDetailField label="Website URL" value={context.websiteUrl} isLink linkLabel={ui.viewReference} />
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {!filteredContexts.length && collaborationResourceStatus !== PUBLIC_RESOURCE_STATUS.LOADING ? (
          <article className="collaboration-empty-state">
            <p>{ui.empty}</p>
          </article>
        ) : null}
      </section>

      {filteredContexts.length > visibleCount ? (
        <div className="collaboration-load-more-row">
          <span>{ui.showing} {visibleContexts.length}{ui.of}{filteredContexts.length}</span>
          <button
            className="collaboration-load-more"
            type="button"
            onClick={() => setVisibleCount((count) => count + 8)}
          >
            {ui.loadMore}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function getLiteratureSearchBody(literature, lang) {
  return [
    literature.title,
    literature.authors,
    literature.year,
    literature.theoryModels,
    literature.researchMethod,
    literature.variables,
    getLiteratureSummary(literature, lang),
    literature.summary,
    literature.usage,
    literature.status,
  ].map(normalizeSearchText).join(' ');
}

function parseLiteratureYear(year) {
  const match = String(year || '').match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : 0;
}

function getLatestLiteratureUpdate(literatureState) {
  if (literatureState.updatedAt) return literatureState.updatedAt;
  const dates = (literatureState.data || [])
    .map((literature) => literature.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return dates[0] || '';
}

function doesLiteratureMatchFilter(literature, filter) {
  if (filter.value === 'all') return true;
  const haystack = [
    literature.title,
    literature.authors,
    literature.theoryModels,
    literature.researchMethod,
    literature.variables,
    literature.summary,
    literature.summaryZh,
    literature.summaryKo,
    literature.summaryEn,
    literature.usage,
    literature.status,
  ].map(normalizeSearchText).join(' ');

  return filter.matches.some((match) => haystack.includes(match.toLowerCase()));
}

const LITERATURE_DATABASE_UI = {
  zh: {
    dataSource: '資料來源',
    count: '文獻數量',
    updatedAt: '最後更新時間',
    filteredCount: '目前篩選結果',
    searchPlaceholder: '搜尋標題、作者、理論模型、變數或摘要',
    topicFilter: '主題 / 理論模型',
    methodFilter: '研究方法',
    statusFilter: '狀態',
    sort: '排序',
    all: '全部',
    allMethods: '全部方法',
    allStatus: '全部狀態',
    newest: '最新更新',
    yearDesc: '年份新到舊',
    yearAsc: '年份舊到新',
    titleAsc: '標題 A-Z',
    expand: '展開詳情',
    collapse: '收合詳情',
    loadMore: '載入更多',
    empty: '沒有符合條件的文獻。',
    showing: '目前顯示',
    of: ' / ',
  },
  en: {
    dataSource: 'Data Source',
    count: 'Literature Count',
    updatedAt: 'Last Updated',
    filteredCount: 'Filtered Results',
    searchPlaceholder: 'Search title, author, theory, variables, or summary',
    topicFilter: 'Topic / Theory Model',
    methodFilter: 'Research Method',
    statusFilter: 'Status',
    sort: 'Sort',
    all: 'All',
    allMethods: 'All Methods',
    allStatus: 'All Status',
    newest: 'Latest update',
    yearDesc: 'Year newest first',
    yearAsc: 'Year oldest first',
    titleAsc: 'Title A-Z',
    expand: 'Expand details',
    collapse: 'Collapse details',
    loadMore: 'Load more',
    empty: 'No literature matches the current filters.',
    showing: 'Showing',
    of: ' of ',
  },
  ko: {
    dataSource: '데이터 출처',
    count: '문헌 수',
    updatedAt: '마지막 업데이트',
    filteredCount: '현재 필터 결과',
    searchPlaceholder: '제목, 저자, 이론, 변수 또는 요약 검색',
    topicFilter: '주제 / 이론 모델',
    methodFilter: '연구 방법',
    statusFilter: '상태',
    sort: '정렬',
    all: '전체',
    allMethods: '전체 방법',
    allStatus: '전체 상태',
    newest: '최신 업데이트',
    yearDesc: '연도 최신순',
    yearAsc: '연도 오래된순',
    titleAsc: '제목 A-Z',
    expand: '자세히 보기',
    collapse: '접기',
    loadMore: '더 보기',
    empty: '현재 필터와 일치하는 문헌이 없다.',
    showing: '표시 중',
    of: ' / ',
  },
};

const LITERATURE_TOPIC_FILTERS = [
  { value: 'all', label: { zh: '全部', en: 'All', ko: '전체' }, matches: [] },
  { value: 'tam', label: { zh: 'TAM', en: 'TAM', ko: 'TAM' }, matches: ['TAM', 'Technology Acceptance'] },
  { value: 'vark', label: { zh: 'VARK', en: 'VARK', ko: 'VARK' }, matches: ['VARK'] },
  { value: 'srl', label: { zh: 'SRL', en: 'SRL', ko: 'SRL' }, matches: ['SRL', 'Self-Regulated', 'Self Regulated', '自我調節', '자기조절'] },
  { value: 'ai-tutor', label: { zh: 'AI Tutor', en: 'AI Tutor', ko: 'AI Tutor' }, matches: ['AI Tutor', 'AI Tutoring', 'Tutor', '튜터'] },
  { value: 'learning-engagement', label: { zh: 'Learning Engagement', en: 'Learning Engagement', ko: 'Learning Engagement' }, matches: ['Learning Engagement', 'Engagement', '學習參與', '참여'] },
  { value: 'learning-satisfaction', label: { zh: 'Learning Satisfaction', en: 'Learning Satisfaction', ko: 'Learning Satisfaction' }, matches: ['Learning Satisfaction', 'Satisfaction', '滿意度', '만족'] },
  { value: 'continuance-intention', label: { zh: 'Continuance Intention', en: 'Continuance Intention', ko: 'Continuance Intention' }, matches: ['Continuance Intention', 'Continuance', '持續使用', '지속 사용'] },
  { value: 'self-efficacy', label: { zh: 'Self-Efficacy', en: 'Self-Efficacy', ko: 'Self-Efficacy' }, matches: ['Self-Efficacy', 'Self Efficacy', '自我效能', '자기효능'] },
  { value: 'ai-literacy', label: { zh: 'AI Literacy', en: 'AI Literacy', ko: 'AI Literacy' }, matches: ['AI Literacy', 'AI 素養', 'AI 리터러시'] },
];

const LITERATURE_METHOD_FILTERS = [
  { value: 'all', label: { zh: '全部方法', en: 'All Methods', ko: '전체 방법' }, matches: [] },
  { value: 'quantitative', label: { zh: '量化', en: 'Quantitative', ko: '양적' }, matches: ['量化', 'quantitative', 'survey', 'questionnaire', 'SEM', '실증'] },
  { value: 'qualitative', label: { zh: '質性', en: 'Qualitative', ko: '질적' }, matches: ['質性', 'qualitative', 'interview', 'case study', '사례', '면담'] },
  { value: 'mixed', label: { zh: '混合方法', en: 'Mixed Methods', ko: '혼합 방법' }, matches: ['混合', 'mixed', 'mixed methods', '혼합'] },
  { value: 'review', label: { zh: '文獻回顧', en: 'Literature Review', ko: '문헌 검토' }, matches: ['文獻回顧', 'literature review', 'review', 'systematic review', '문헌'] },
  { value: 'experiment', label: { zh: '實驗研究', en: 'Experimental Study', ko: '실험 연구' }, matches: ['實驗', 'experiment', 'experimental', '실험'] },
];

const LITERATURE_STATUS_FILTERS = [
  { value: 'all', label: { zh: '全部狀態', en: 'All Status', ko: '전체 상태' }, matches: [] },
  { value: 'read', label: { zh: '已精讀', en: 'Closely Read', ko: '정독 완료' }, matches: ['已精讀', 'closely read', 'read', '精讀', '정독'] },
  { value: 'to-read', label: { zh: '待閱讀', en: 'To Read', ko: '읽기 예정' }, matches: ['待閱讀', 'to read', 'todo', '읽기'] },
  { value: 'cite-ready', label: { zh: '可引用', en: 'Citation Ready', ko: '인용 가능' }, matches: ['可引用', 'citation ready', 'cite', '引用', '인용'] },
  { value: 'core', label: { zh: '博士核心', en: 'Doctoral Core', ko: '박사 핵심' }, matches: ['博士核心', 'doctoral core', 'core', '核心', '박사'] },
  { value: 'organized', label: { zh: '已整理', en: 'Organized', ko: '정리 완료' }, matches: ['已整理', 'organized', '整理', '정리'] },
];

const KNOWLEDGE_DATABASE_UI = {
  zh: {
    dataSource: '資料來源',
    count: '知識資源總數',
    updatedAt: '最後更新時間',
    filteredCount: '目前篩選結果',
    sourceOverview: '資料來源統計',
    sourceDatabase: '資料來源',
    contentType: '內容類型',
    relatedModule: '關聯模塊',
    status: '狀態',
    language: '語言',
    tags: '標籤',
    summary: '摘要',
    primaryMeta: '主要資訊',
    secondaryMeta: '補充資訊',
    link: '連結',
    fileLink: '檔案連結',
    createdAt: '建立日期',
    expand: '展開詳情',
    collapse: '收合詳情',
    loadMore: '載入更多',
    empty: '沒有符合條件的知識資源。',
    searchPlaceholder: '搜尋文獻、教材、靈感、品牌內容、標籤或摘要',
    showing: '目前顯示',
    of: ' / ',
    openLink: '開啟連結',
    openFile: '開啟檔案',
    emptyValue: '未填寫',
  },
  en: {
    dataSource: 'Data Source',
    count: 'Knowledge Resources',
    updatedAt: 'Last Updated',
    filteredCount: 'Current Results',
    sourceOverview: 'Source Overview',
    sourceDatabase: 'Data Source',
    contentType: 'Content Type',
    relatedModule: 'Related Module',
    status: 'Status',
    language: 'Language',
    tags: 'Tags',
    summary: 'Summary',
    primaryMeta: 'Primary Info',
    secondaryMeta: 'Secondary Info',
    link: 'Link',
    fileLink: 'File Link',
    createdAt: 'Created At',
    expand: 'Expand details',
    collapse: 'Collapse details',
    loadMore: 'Load more',
    empty: 'No knowledge resources match the current filters.',
    searchPlaceholder: 'Search literature, teaching materials, ideas, brand content, tags, or summaries',
    showing: 'Showing',
    of: ' of ',
    openLink: 'Open link',
    openFile: 'Open file',
    emptyValue: 'Not filled',
  },
  ko: {
    dataSource: '데이터 출처',
    count: '지식 리소스',
    updatedAt: '최종 업데이트',
    filteredCount: '현재 결과',
    sourceOverview: '출처 개요',
    sourceDatabase: '데이터 출처',
    contentType: '콘텐츠 유형',
    relatedModule: '관련 모듈',
    status: '상태',
    language: '언어',
    tags: '태그',
    summary: '요약',
    primaryMeta: '주요 정보',
    secondaryMeta: '보조 정보',
    link: '링크',
    fileLink: '파일 링크',
    createdAt: '생성일',
    expand: '자세히 보기',
    collapse: '접기',
    loadMore: '더 보기',
    empty: '현재 필터와 일치하는 지식 리소스가 없다.',
    searchPlaceholder: '문헌, 수업 자료, 아이디어, 브랜드 콘텐츠, 태그 또는 요약 검색',
    showing: '표시 중',
    of: ' / ',
    openLink: '링크 열기',
    openFile: '파일 열기',
    emptyValue: '미입력',
  },
};

const KNOWLEDGE_SOURCE_FILTERS = [
  { value: 'all', label: { zh: '全部', en: 'All', ko: '전체' }, matches: [] },
  { value: 'research', label: { zh: 'Research', en: 'Research', ko: 'Research' }, matches: ['research'] },
  { value: 'teaching', label: { zh: 'Teaching', en: 'Teaching', ko: 'Teaching' }, matches: ['teaching'] },
  { value: 'inspiration', label: { zh: 'Inspiration', en: 'Inspiration', ko: 'Inspiration' }, matches: ['inspiration'] },
  { value: 'brand', label: { zh: 'Brand', en: 'Brand', ko: 'Brand' }, matches: ['brand'] },
];

const KNOWLEDGE_TYPE_FILTERS = [
  { value: 'all', label: { zh: '全部類型', en: 'All Types', ko: '전체 유형' }, matches: [] },
  { value: 'literature', label: { zh: 'Literature', en: 'Literature', ko: 'Literature' }, matches: ['Literature'] },
  { value: 'teaching-material', label: { zh: 'Teaching Material', en: 'Teaching Material', ko: 'Teaching Material' }, matches: ['Teaching Material'] },
  { value: 'inspiration', label: { zh: 'Inspiration', en: 'Inspiration', ko: 'Inspiration' }, matches: ['Inspiration'] },
  { value: 'brand-content', label: { zh: 'Brand Content', en: 'Brand Content', ko: 'Brand Content' }, matches: ['Brand Content'] },
];

const KNOWLEDGE_MODULE_FILTERS = [
  { value: 'all', label: { zh: '全部模塊', en: 'All Modules', ko: '전체 모듈' }, matches: [] },
  { value: 'research', label: { zh: 'Research', en: 'Research', ko: 'Research' }, matches: ['Research'] },
  { value: 'learning-coaching', label: { zh: 'Learning Coaching', en: 'Learning Coaching', ko: 'Learning Coaching' }, matches: ['Learning Coaching'] },
  { value: 'knowledge-lab', label: { zh: 'Knowledge Lab', en: 'Knowledge Lab', ko: 'Knowledge Lab' }, matches: ['Knowledge Lab'] },
  { value: 'brand-publishing', label: { zh: 'Brand / Publishing', en: 'Brand / Publishing', ko: 'Brand / Publishing' }, matches: ['Brand / Publishing'] },
];

const KNOWLEDGE_STATUS_FILTERS = [
  { value: 'all', label: { zh: '全部狀態', en: 'All Status', ko: '전체 상태' }, matches: [] },
  { value: 'not-started', label: { zh: '未開始', en: 'Not Started', ko: '시작 전' }, matches: ['未開始', 'Not Started', '시작 전'] },
  { value: 'in-progress', label: { zh: '進行中', en: 'In Progress', ko: '진행 중' }, matches: ['進行中', 'In Progress', '진행 중'] },
  { value: 'complete', label: { zh: '完成', en: 'Complete', ko: '완료' }, matches: ['完成', 'Complete', 'Done', '완료'] },
  { value: 'organized', label: { zh: '已整理', en: 'Organized', ko: '정리 완료' }, matches: ['已整理', 'Organized', '정리 완료'] },
  { value: 'cite-ready', label: { zh: '可引用', en: 'Citation Ready', ko: '인용 가능' }, matches: ['可引用', 'Citation Ready', '인용 가능'] },
  { value: 'to-read', label: { zh: '待閱讀', en: 'To Read', ko: '읽기 예정' }, matches: ['待閱讀', 'To Read', '읽기 예정'] },
  { value: 'draft', label: { zh: '草稿', en: 'Draft', ko: '초안' }, matches: ['草稿', 'Draft', '초안'] },
];

const KNOWLEDGE_LANGUAGE_FILTERS = [
  { value: 'all', label: { zh: '全部語言', en: 'All Languages', ko: '전체 언어' }, matches: [] },
  { value: 'zh', label: { zh: '中文', en: 'Chinese', ko: '중국어' }, matches: ['中文', 'Chinese', 'zh', '繁中', '중국어'] },
  { value: 'ko', label: { zh: '韓文', en: 'Korean', ko: '한국어' }, matches: ['韓文', 'Korean', 'ko', '한국어'] },
  { value: 'en', label: { zh: '英文', en: 'English', ko: '영어' }, matches: ['英文', 'English', 'en', '영어'] },
];

function getKnowledgeSearchBody(resource, lang) {
  return [
    getKnowledgeTitle(resource, lang),
    resource.category,
    resource.type,
    resource.status,
    resource.language,
    resource.tags,
    getKnowledgeSummary(resource, lang),
    resource.relatedModule,
    resource.primaryMeta,
    resource.secondaryMeta,
  ].map(normalizeSearchText).join(' ');
}

function doesKnowledgeMatchFilter(resource, filter, field) {
  if (filter.value === 'all') return true;
  const value = String(resource[field] || '').trim().toLowerCase();
  return filter.matches.some((match) => value === match.toLowerCase());
}

function doesKnowledgeLanguageMatch(resource, filter) {
  if (filter.value === 'all') return true;
  const value = normalizeSearchText(resource.language);
  return filter.matches.some((match) => value.includes(match.toLowerCase()));
}

function hasDisplayValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  if (value === 0) return true;
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function formatDisplayValue(value, emptyValue) {
  if (!hasDisplayValue(value)) return emptyValue;
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value);
}

function KnowledgeFilterGroup({ label, filters, activeValue, onSelect, lang }) {
  return (
    <div className="knowledge-filter-section">
      <span>{label}</span>
      <div className="knowledge-filter-row">
        {filters.map((filter) => (
          <button
            key={filter.value}
            className="knowledge-filter-chip"
            data-active={activeValue === filter.value ? 'true' : 'false'}
            onClick={() => onSelect(filter.value)}
            type="button"
          >
            {filter.label[lang] || filter.label.zh}
          </button>
        ))}
      </div>
    </div>
  );
}

function KnowledgeDetailField({ label, value, emptyValue }) {
  return (
    <div className="knowledge-detail-field">
      <span>{label}</span>
      <p>{formatDisplayValue(value, emptyValue)}</p>
    </div>
  );
}

function KnowledgeLinkField({ label, value, emptyValue, linkLabel }) {
  return (
    <div className="knowledge-detail-field">
      <span>{label}</span>
      <p>
        {hasDisplayValue(value) ? (
          <a className="knowledge-inline-link" href={value} target="_blank" rel="noreferrer">
            {linkLabel}
          </a>
        ) : emptyValue}
      </p>
    </div>
  );
}

function useResearchLiterature(activityAdapter) {
  const createClientFallbackPayload = useCallback(() => createFallbackLiteratureResponse('upstream_failed'), []);
  return usePublicApiResource('/api/research/literature', { createClientFallbackPayload, companionEventAdapter: activityAdapter });
}

function useKnowledgeResources(activityAdapter) {
  const createClientFallbackPayload = useCallback(() => createFallbackKnowledgeResponse('upstream_failed'), []);
  return usePublicApiResource('/api/knowledge/resources', { createClientFallbackPayload, companionEventAdapter: activityAdapter });
}

function LiteratureStatusCard({ source, lang }) {
  const status = getLiteratureStatusText(source, lang);

  return (
    <section className="module-data-source-card literature-status-card">
      <div>
        <div className="label">{status.source}</div>
        <p>{status.connection}</p>
      </div>
      <span className="module-data-endpoint">/api/research/literature</span>
    </section>
  );
}

function LiteratureDatabase({ item, common, lang, activityAdapter }) {
  const literatureState = useResearchLiterature(activityAdapter);
  const ui = LITERATURE_UI[lang] || LITERATURE_UI.zh;
  const databaseUi = LITERATURE_DATABASE_UI[lang] || LITERATURE_DATABASE_UI.zh;
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortMode, setSortMode] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const resultsRef = useRef(null);

  const topicOption = LITERATURE_TOPIC_FILTERS.find((filter) => filter.value === topicFilter) || LITERATURE_TOPIC_FILTERS[0];
  const methodOption = LITERATURE_METHOD_FILTERS.find((filter) => filter.value === methodFilter) || LITERATURE_METHOD_FILTERS[0];
  const statusOption = LITERATURE_STATUS_FILTERS.find((filter) => filter.value === statusFilter) || LITERATURE_STATUS_FILTERS[0];
  const literatureItems = useMemo(() => literatureState.data || [], [literatureState.data]);
  const literatureResourceStatus = literatureState.resourceStatus || PUBLIC_RESOURCE_STATUS.LOADING;

  const filteredLiterature = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = literatureItems.filter((literature) => {
      const matchesSearch = !normalizedQuery || getLiteratureSearchBody(literature, lang).includes(normalizedQuery);
      return matchesSearch
        && doesLiteratureMatchFilter(literature, topicOption)
        && doesLiteratureMatchFilter(literature, methodOption)
        && doesLiteratureMatchFilter(literature, statusOption);
    });

    return filtered.slice().sort((a, b) => {
      if (sortMode === 'year-desc') return parseLiteratureYear(b.year) - parseLiteratureYear(a.year);
      if (sortMode === 'year-asc') return parseLiteratureYear(a.year) - parseLiteratureYear(b.year);
      if (sortMode === 'title-asc') return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
  }, [literatureItems, lang, methodOption, searchQuery, sortMode, statusOption, topicOption]);

  const visibleLiterature = filteredLiterature.slice(0, visibleCount);
  const latestUpdatedAt = getLatestLiteratureUpdate(literatureState);

  function toggleExpanded(id) {
    activityAdapter?.dispatch(expandedIds.has(id) ? 'item-closed' : 'item-opened', { entityType: 'literature' });
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateSearchQuery(value) {
    setSearchQuery(value);
    setVisibleCount(10);
  }

  function updateTopicFilter(value) {
    if (value === topicFilter) return;
    setTopicFilter(value);
    setVisibleCount(10);
    activityAdapter?.dispatch('filter-applied', { entityType: 'literature-filter' });
  }

  function updateMethodFilter(value) {
    if (value === methodFilter) return;
    setMethodFilter(value);
    setVisibleCount(10);
    activityAdapter?.dispatch('filter-applied', { entityType: 'literature-filter' });
  }

  function updateStatusFilter(value) {
    if (value === statusFilter) return;
    setStatusFilter(value);
    setVisibleCount(10);
    activityAdapter?.dispatch('filter-applied', { entityType: 'literature-filter' });
  }

  function updateSortMode(value) {
    setSortMode(value);
    setVisibleCount(10);
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Enter' && searchQuery.trim()) {
      activityAdapter?.search(filteredLiterature.length, { entityType: 'literature', key: 'research-search' });
      scrollResultsIntoView(resultsRef);
    }
  }

  return (
    <article className="content-detail-card module-detail-card literature-database-card">
      <div className="detail-badge-row">
        <Badge>{common.moduleLabel}: {item.category}</Badge>
        <Badge>{item.status}</Badge>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{ui.title}</h1>
      <p className="detail-subtitle">{item.subtitle}</p>

      <div className="literature-state-row" aria-label={ui.title}>
        <span>{databaseUi.dataSource}: {literatureState.source || '...'}</span>
        <span>{databaseUi.count}: {literatureState.count ?? literatureItems.length}</span>
        <span>{databaseUi.updatedAt}: {latestUpdatedAt}</span>
        <span>{databaseUi.filteredCount}: {filteredLiterature.length}</span>
      </div>

      <ResourceStateNotice
        lang={lang}
        status={literatureResourceStatus}
        isRefreshing={literatureState.isRefreshing}
        onRetry={literatureState.retry}
        retryDisabled={literatureState.isLoading || literatureState.isRefreshing}
      />

      {literatureState.source && literatureResourceStatus !== PUBLIC_RESOURCE_STATUS.LOADING && literatureResourceStatus !== PUBLIC_RESOURCE_STATUS.ERROR ? (
        <LiteratureStatusCard source={literatureState.source} lang={lang} />
      ) : null}

      <section className="literature-toolbar" aria-label={ui.title}>
        <input
          className="literature-search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => updateSearchQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={databaseUi.searchPlaceholder}
          aria-label={databaseUi.searchPlaceholder}
        />

        <label className="literature-sort-control">
          <span>{databaseUi.sort}</span>
          <select value={sortMode} onChange={(event) => updateSortMode(event.target.value)}>
            <option value="newest">{databaseUi.newest}</option>
            <option value="year-desc">{databaseUi.yearDesc}</option>
            <option value="year-asc">{databaseUi.yearAsc}</option>
            <option value="title-asc">{databaseUi.titleAsc}</option>
          </select>
        </label>
      </section>

      <section className="literature-filter-panel" aria-label={databaseUi.topicFilter}>
        <div className="literature-filter-section">
          <span>{databaseUi.topicFilter}</span>
          <div className="literature-filter-row">
            {LITERATURE_TOPIC_FILTERS.map((filter) => (
              <button
                key={filter.value}
                className="literature-filter-chip"
                data-active={topicFilter === filter.value ? 'true' : 'false'}
                type="button"
                onClick={() => updateTopicFilter(filter.value)}
              >
                {filter.label[lang] || filter.label.zh}
              </button>
            ))}
          </div>
        </div>

        <div className="literature-filter-section">
          <span>{databaseUi.methodFilter}</span>
          <div className="literature-filter-row">
            {LITERATURE_METHOD_FILTERS.map((filter) => (
              <button
                key={filter.value}
                className="literature-filter-chip"
                data-active={methodFilter === filter.value ? 'true' : 'false'}
                type="button"
                onClick={() => updateMethodFilter(filter.value)}
              >
                {filter.label[lang] || filter.label.zh}
              </button>
            ))}
          </div>
        </div>

        <div className="literature-filter-section">
          <span>{databaseUi.statusFilter}</span>
          <div className="literature-filter-row">
            {LITERATURE_STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                className="literature-filter-chip"
                data-active={statusFilter === filter.value ? 'true' : 'false'}
                type="button"
                onClick={() => updateStatusFilter(filter.value)}
              >
                {filter.label[lang] || filter.label.zh}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section ref={resultsRef} className="literature-compact-list" aria-label={ui.title}>
        {visibleLiterature.map((literature) => {
          const isExpanded = expandedIds.has(literature.id);
          const summary = getLiteratureSummary(literature, lang);

          return (
            <article key={literature.id} className="literature-compact-card">
              <div className="literature-compact-main">
                <div>
                  <div className="module-data-card-top literature-compact-top">
                    <span className="content-tag">{literature.sourceType}</span>
                    <span className="module-data-status">{literature.status}</span>
                  </div>
                  <h2>{literature.title}</h2>
                  <p className="literature-authors-line">{normalizeList(literature.authors)} · {literature.year}</p>
                </div>

                <button
                  className="literature-expand-button"
                  type="button"
                  onClick={() => toggleExpanded(literature.id)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? databaseUi.collapse : databaseUi.expand}
                </button>
              </div>

              <div className="literature-tag-row">
                {Array.isArray(literature.theoryModels) && literature.theoryModels.length
                  ? literature.theoryModels.map((model) => <span key={model}>{model}</span>)
                  : <span>{normalizeList(literature.theoryModels)}</span>}
              </div>

              <div className="literature-compact-meta">
                <span>{ui.researchMethod}: {literature.researchMethod}</span>
                <span>{ui.status}: {literature.status}</span>
              </div>

              <p className="literature-card-summary">{summary}</p>

              {isExpanded && (
                <div className="literature-detail-panel">
                  <div className="literature-field">
                    <span>{ui.researchMethod}</span>
                    <p>{literature.researchMethod}</p>
                  </div>
                  <div className="literature-field">
                    <span>{ui.variables}</span>
                    <p>{normalizeList(literature.variables)}</p>
                  </div>
                  <div className="literature-field literature-summary">
                    <span>{ui.summary}</span>
                    <p>{summary}</p>
                  </div>
                  <div className="literature-field">
                    <span>{ui.usage}</span>
                    <p>{literature.usage}</p>
                  </div>
                  <div className="literature-card-footer">
                    <span>{ui.sourceType}: {literature.sourceType}</span>
                    <span>{ui.updatedAt}: {literature.updatedAt}</span>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {!filteredLiterature.length && literatureResourceStatus !== PUBLIC_RESOURCE_STATUS.LOADING && (
          <article className="literature-empty-state">
            <p>{databaseUi.empty}</p>
          </article>
        )}
      </section>

      {filteredLiterature.length > visibleCount && (
        <div className="literature-load-more-row">
          <span>{databaseUi.showing} {visibleLiterature.length}{databaseUi.of}{filteredLiterature.length}</span>
          <button
            className="literature-load-more"
            type="button"
            onClick={() => setVisibleCount((count) => count + 10)}
          >
            {databaseUi.loadMore}
          </button>
        </div>
      )}
    </article>
  );
}

function KnowledgeStatusCard({ source, lang }) {
  const status = getKnowledgeStatusText(source, lang);

  return (
    <section className="module-data-source-card literature-status-card knowledge-status-card">
      <div>
        <div className="label">{status.source}</div>
        <p>{status.connection}</p>
      </div>
      <span className="module-data-endpoint">/api/knowledge/resources</span>
    </section>
  );
}

function KnowledgeResourceDatabase({ item, common, lang, activityAdapter }) {
  const knowledgeState = useKnowledgeResources(activityAdapter);
  const ui = KNOWLEDGE_RESOURCE_UI[lang] || KNOWLEDGE_RESOURCE_UI.zh;
  const databaseUi = KNOWLEDGE_DATABASE_UI[lang] || KNOWLEDGE_DATABASE_UI.zh;
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const resultsRef = useRef(null);
  const resources = useMemo(() => knowledgeState.items || knowledgeState.data || [], [knowledgeState.data, knowledgeState.items]);
  const sourceStats = knowledgeState.meta?.sources || {};
  const latestUpdatedAt = knowledgeState.updatedAt || '';
  const knowledgeResourceStatus = knowledgeState.resourceStatus || PUBLIC_RESOURCE_STATUS.LOADING;

  const filteredResources = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const activeSource = KNOWLEDGE_SOURCE_FILTERS.find((filter) => filter.value === sourceFilter) || KNOWLEDGE_SOURCE_FILTERS[0];
    const activeType = KNOWLEDGE_TYPE_FILTERS.find((filter) => filter.value === typeFilter) || KNOWLEDGE_TYPE_FILTERS[0];
    const activeModule = KNOWLEDGE_MODULE_FILTERS.find((filter) => filter.value === moduleFilter) || KNOWLEDGE_MODULE_FILTERS[0];
    const activeStatus = KNOWLEDGE_STATUS_FILTERS.find((filter) => filter.value === statusFilter) || KNOWLEDGE_STATUS_FILTERS[0];
    const activeLanguage = KNOWLEDGE_LANGUAGE_FILTERS.find((filter) => filter.value === languageFilter) || KNOWLEDGE_LANGUAGE_FILTERS[0];

    return resources.filter((resource) => {
      const matchesSearch = !normalizedQuery || getKnowledgeSearchBody(resource, lang).includes(normalizedQuery);
      return matchesSearch
        && doesKnowledgeMatchFilter(resource, activeSource, 'sourceDatabase')
        && doesKnowledgeMatchFilter(resource, activeType, 'sourceType')
        && doesKnowledgeMatchFilter(resource, activeModule, 'relatedModule')
        && doesKnowledgeMatchFilter(resource, activeStatus, 'status')
        && doesKnowledgeLanguageMatch(resource, activeLanguage);
    });
  }, [languageFilter, lang, moduleFilter, resources, searchQuery, sourceFilter, statusFilter, typeFilter]);

  const visibleResources = filteredResources.slice(0, visibleCount);

  function resetVisibleCount() {
    setVisibleCount(12);
  }

  function updateSearchQuery(value) {
    setSearchQuery(value);
    resetVisibleCount();
  }

  function updateSourceFilter(value) {
    if (value === sourceFilter) return;
    setSourceFilter(value);
    resetVisibleCount();
    activityAdapter?.dispatch('filter-applied', { entityType: 'resource-filter' });
  }

  function updateTypeFilter(value) {
    if (value === typeFilter) return;
    setTypeFilter(value);
    resetVisibleCount();
    activityAdapter?.dispatch('filter-applied', { entityType: 'resource-filter' });
  }

  function updateModuleFilter(value) {
    if (value === moduleFilter) return;
    setModuleFilter(value);
    resetVisibleCount();
    activityAdapter?.dispatch('filter-applied', { entityType: 'resource-filter' });
  }

  function updateStatusFilter(value) {
    if (value === statusFilter) return;
    setStatusFilter(value);
    resetVisibleCount();
    activityAdapter?.dispatch('filter-applied', { entityType: 'resource-filter' });
  }

  function updateLanguageFilter(value) {
    if (value === languageFilter) return;
    setLanguageFilter(value);
    resetVisibleCount();
    activityAdapter?.dispatch('filter-applied', { entityType: 'resource-filter' });
  }

  function toggleExpanded(id) {
    activityAdapter?.dispatch(expandedIds.has(id) ? 'item-closed' : 'resource-opened', { entityType: 'resource' });
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Enter' && searchQuery.trim()) {
      activityAdapter?.search(filteredResources.length, { entityType: 'resource', key: 'knowledge-search' });
      scrollResultsIntoView(resultsRef);
    }
  }

  return (
    <article className="content-detail-card module-detail-card knowledge-resource-database-card">
      <div className="detail-badge-row">
        <Badge>{common.moduleLabel}: {item.category}</Badge>
        <Badge>{item.status}</Badge>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{ui.title}</h1>
      <p className="detail-subtitle">{ui.subtitle}</p>

      <div className="knowledge-state-row" aria-label={ui.title}>
        <span>{databaseUi.dataSource}: {knowledgeState.source || '...'}</span>
        <span>{databaseUi.count}: {knowledgeState.count ?? resources.length}</span>
        <span>{databaseUi.updatedAt}: {latestUpdatedAt}</span>
        <span>{databaseUi.filteredCount}: {filteredResources.length}</span>
      </div>

      <ResourceStateNotice
        lang={lang}
        status={knowledgeResourceStatus}
        isRefreshing={knowledgeState.isRefreshing}
        onRetry={knowledgeState.retry}
        retryDisabled={knowledgeState.isLoading || knowledgeState.isRefreshing}
      />

      {knowledgeState.source && knowledgeResourceStatus !== PUBLIC_RESOURCE_STATUS.LOADING && knowledgeResourceStatus !== PUBLIC_RESOURCE_STATUS.ERROR ? (
        <KnowledgeStatusCard source={knowledgeState.source} lang={lang} />
      ) : null}

      <section className="knowledge-source-overview" aria-label={databaseUi.sourceOverview}>
        <span>{databaseUi.sourceOverview}</span>
        <div className="knowledge-source-stat-grid">
          {[
            ['research', 'Research'],
            ['teaching', 'Teaching'],
            ['inspiration', 'Inspiration'],
            ['brand', 'Brand'],
          ].map(([key, label]) => (
            <article key={key} className="knowledge-source-stat-card">
              <span>{label}</span>
              <strong>{sourceStats[key]?.count ?? 0}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="knowledge-toolbar" aria-label={databaseUi.searchPlaceholder}>
        <input
          className="knowledge-search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => updateSearchQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={databaseUi.searchPlaceholder}
          aria-label={databaseUi.searchPlaceholder}
        />
      </section>

      <section className="knowledge-filter-panel" aria-label={databaseUi.sourceDatabase}>
        <KnowledgeFilterGroup label={databaseUi.sourceDatabase} filters={KNOWLEDGE_SOURCE_FILTERS} activeValue={sourceFilter} onSelect={updateSourceFilter} lang={lang} />
        <KnowledgeFilterGroup label={databaseUi.contentType} filters={KNOWLEDGE_TYPE_FILTERS} activeValue={typeFilter} onSelect={updateTypeFilter} lang={lang} />
        <KnowledgeFilterGroup label={databaseUi.relatedModule} filters={KNOWLEDGE_MODULE_FILTERS} activeValue={moduleFilter} onSelect={updateModuleFilter} lang={lang} />
        <KnowledgeFilterGroup label={databaseUi.status} filters={KNOWLEDGE_STATUS_FILTERS} activeValue={statusFilter} onSelect={updateStatusFilter} lang={lang} />
        <KnowledgeFilterGroup label={databaseUi.language} filters={KNOWLEDGE_LANGUAGE_FILTERS} activeValue={languageFilter} onSelect={updateLanguageFilter} lang={lang} />
      </section>

      <section ref={resultsRef} className="knowledge-compact-list" aria-label={ui.title}>
        {visibleResources.map((resource) => {
          const isExpanded = expandedIds.has(resource.id);
          const summary = getKnowledgeSummary(resource, lang);

          return (
            <article key={resource.id} className="knowledge-compact-card">
              <div className="knowledge-compact-main">
                <div>
                  <div className="module-data-card-top knowledge-compact-top">
                    <span className="content-tag">{formatDisplayValue(resource.sourceType, databaseUi.emptyValue)}</span>
                    {hasDisplayValue(resource.status) ? <span className="module-data-status">{resource.status}</span> : null}
                  </div>
                  <h2>{getKnowledgeTitle(resource, lang)}</h2>
                  <p className="knowledge-meta-line">{formatDisplayValue(resource.relatedModule, databaseUi.emptyValue)}</p>
                </div>

                <button
                  className="knowledge-expand-button"
                  type="button"
                  onClick={() => toggleExpanded(resource.id)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? databaseUi.collapse : databaseUi.expand}
                </button>
              </div>

              <div className="knowledge-compact-meta">
                <span>{ui.category}: {formatDisplayValue(resource.category, databaseUi.emptyValue)}</span>
                <span>{ui.type}: {formatDisplayValue(resource.type, databaseUi.emptyValue)}</span>
                <span>{databaseUi.status}: {formatDisplayValue(resource.status, databaseUi.emptyValue)}</span>
              </div>

              <div className="knowledge-tag-row">
                {Array.isArray(resource.tags) && resource.tags.length
                  ? resource.tags.map((tag) => <span key={tag}>{tag}</span>)
                  : <span>{databaseUi.emptyValue}</span>}
              </div>

              <p className="knowledge-card-summary">{formatDisplayValue(summary, databaseUi.emptyValue)}</p>

              {isExpanded && (
                <div className="knowledge-detail-panel">
                  <div className="knowledge-detail-grid">
                    <KnowledgeDetailField label={databaseUi.primaryMeta} value={resource.primaryMeta} emptyValue={databaseUi.emptyValue} />
                    <KnowledgeDetailField label={databaseUi.secondaryMeta} value={resource.secondaryMeta} emptyValue={databaseUi.emptyValue} />
                    <KnowledgeDetailField label={databaseUi.language} value={resource.language} emptyValue={databaseUi.emptyValue} />
                    <KnowledgeLinkField label={databaseUi.link} value={resource.url} emptyValue={databaseUi.emptyValue} linkLabel={databaseUi.openLink} />
                    <KnowledgeLinkField label={databaseUi.fileLink} value={resource.fileUrl} emptyValue={databaseUi.emptyValue} linkLabel={databaseUi.openFile} />
                    <KnowledgeDetailField label={databaseUi.createdAt} value={resource.createdAt} emptyValue={databaseUi.emptyValue} />
                    <KnowledgeDetailField label={databaseUi.updatedAt} value={resource.updatedAt} emptyValue={databaseUi.emptyValue} />
                    <KnowledgeDetailField label={databaseUi.sourceDatabase} value={resource.sourceDatabase} emptyValue={databaseUi.emptyValue} />
                  </div>
                  <div className="knowledge-full-summary">
                    <span>{databaseUi.summary}</span>
                    <p>{formatDisplayValue(summary, databaseUi.emptyValue)}</p>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {!filteredResources.length && knowledgeResourceStatus !== PUBLIC_RESOURCE_STATUS.LOADING ? (
          <article className="knowledge-empty-state">
            <p>{databaseUi.empty}</p>
          </article>
        ) : null}
      </section>

      {filteredResources.length > visibleCount ? (
        <div className="knowledge-load-more-row">
          <span>{databaseUi.showing} {visibleResources.length}{databaseUi.of}{filteredResources.length}</span>
          <button className="knowledge-load-more" type="button" onClick={() => setVisibleCount((count) => count + 12)}>
            {databaseUi.loadMore}
          </button>
        </div>
      ) : null}
    </article>
  );
}

const IDENTITY_PROFILES_UI = {
  zh: {
    title: 'Identity Profiles｜身份節點資料',
    subtitle: '從 Notion 讀取 Joey、NexAeon 與研究角色的公開身份節點，建立可持續更新的身份導航。',
    dataSource: '資料來源',
    count: '公開身份節點',
    updatedAt: '最後更新時間',
    filteredCount: '目前篩選結果',
    connected: 'NOTION IDENTITY PROFILES CONNECTED',
    fallback: 'FALLBACK ACTIVE',
    loading: '載入中',
    fetchError: '資料暫時無法載入，已顯示安全 fallback。',
    retry: '重新載入',
    searchPlaceholder: '搜尋身份、角色、理念、定位或對應模塊',
    identityType: '身份類型',
    roleTags: '角色標籤',
    relatedModules: '對應模塊',
    allIdentityTypes: '全部身份',
    allRoles: '全部角色',
    allModules: '全部模塊',
    shortPositioning: '簡短定位',
    fullIntroduction: '完整介紹',
    corePhilosophy: '核心理念',
    featured: '精選',
    sort: '排序',
    recommended: '推薦順序',
    recent: '最近更新',
    nameAz: '名稱 A-Z',
    displayOrder: '顯示順序',
    createdAt: '建立日期',
    expand: '展開詳情',
    collapse: '收合詳情',
    viewLink: '查看連結',
    loadMore: '載入更多',
    empty: '目前沒有符合條件的公開身份節點。',
    showing: '目前顯示',
    of: ' / ',
  },
  en: {
    title: 'Identity Profiles',
    subtitle: 'Public identity nodes for Joey, NexAeon, and related research roles, synchronized from Notion.',
    dataSource: 'Data Source',
    count: 'Public Identity Nodes',
    updatedAt: 'Last Updated',
    filteredCount: 'Current Results',
    connected: 'NOTION IDENTITY PROFILES CONNECTED',
    fallback: 'FALLBACK ACTIVE',
    loading: 'Loading',
    fetchError: 'The data request failed, so a safe fallback is shown.',
    retry: 'Retry',
    searchPlaceholder: 'Search identities, roles, philosophies, positioning, or related modules',
    identityType: 'Identity Type',
    roleTags: 'Role Tags',
    relatedModules: 'Related Modules',
    allIdentityTypes: 'All Identities',
    allRoles: 'All Roles',
    allModules: 'All Modules',
    shortPositioning: 'Short Positioning',
    fullIntroduction: 'Full Introduction',
    corePhilosophy: 'Core Philosophy',
    featured: 'Featured',
    sort: 'Sort',
    recommended: 'Recommended',
    recent: 'Recently Updated',
    nameAz: 'Name A-Z',
    displayOrder: 'Display Order',
    createdAt: 'Created At',
    expand: 'Expand details',
    collapse: 'Collapse details',
    viewLink: 'View Link',
    loadMore: 'Load more',
    empty: 'No public identity nodes match the current filters.',
    showing: 'Showing',
    of: ' of ',
  },
  ko: {
    title: 'Identity Profiles｜정체성 데이터 노드',
    subtitle: 'Notion에서 Joey, NexAeon 및 관련 연구 역할의 공개 정체성 노드를 불러온다.',
    dataSource: '데이터 출처',
    count: '공개 정체성 노드',
    updatedAt: '최종 업데이트',
    filteredCount: '현재 결과',
    connected: 'NOTION IDENTITY PROFILES CONNECTED',
    fallback: 'FALLBACK ACTIVE',
    loading: '불러오는 중',
    fetchError: '데이터 요청에 실패해 안전한 fallback을 표시합니다.',
    retry: '다시 불러오기',
    searchPlaceholder: '정체성, 역할, 철학, 포지셔닝 또는 관련 모듈 검색',
    identityType: '정체성 유형',
    roleTags: '역할 태그',
    relatedModules: '관련 모듈',
    allIdentityTypes: '전체 정체성',
    allRoles: '전체 역할',
    allModules: '전체 모듈',
    shortPositioning: '간략한 포지셔닝',
    fullIntroduction: '전체 소개',
    corePhilosophy: '핵심 철학',
    featured: '추천',
    sort: '정렬',
    recommended: '추천 순서',
    recent: '최근 업데이트',
    nameAz: '이름 A-Z',
    displayOrder: '표시 순서',
    createdAt: '생성일',
    expand: '자세히 보기',
    collapse: '접기',
    viewLink: '링크 보기',
    loadMore: '더 보기',
    empty: '현재 필터와 일치하는 공개 정체성 노드가 없다.',
    showing: '표시 중',
    of: ' / ',
  },
};

function hasIdentityValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  if (value === 0) return true;
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function formatIdentityList(value) {
  if (!Array.isArray(value)) return hasIdentityValue(value) ? String(value) : '';
  return value.filter(Boolean).join(', ');
}

function formatIdentityDate(value) {
  if (!hasIdentityValue(value)) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function getIdentityUpdatedTime(profile) {
  const time = new Date(profile.updatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getIdentityDisplayOrder(profile) {
  const order = Number(profile.displayOrder);
  return Number.isFinite(order) ? order : 0;
}

function getIdentitySearchBody(profile) {
  return [
    profile.name,
    profile.identityType,
    profile.shortPositioning,
    profile.fullIntroduction,
    profile.corePhilosophy,
    profile.roleTags,
    profile.relatedModules,
  ].map(normalizeSearchText).join(' ');
}

function createIdentityFilterOptions(items, field, allLabel) {
  const values = [...new Set(items.flatMap((item) => {
    const value = item[field];
    return Array.isArray(value) ? value : [value];
  }).map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  return [
    { value: 'all', label: allLabel },
    ...values.map((value) => ({ value, label: value })),
  ];
}

function IdentityFilterGroup({ label, filters, activeValue, onSelect }) {
  return (
    <div className="identity-filter-section">
      <span>{label}</span>
      <div className="identity-filter-row">
        {filters.map((filter) => (
          <button
            key={filter.value}
            className="identity-filter-chip"
            data-active={activeValue === filter.value ? 'true' : 'false'}
            type="button"
            onClick={() => { if (activeValue !== filter.value) onSelect(filter.value); }}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function IdentityDetailField({ label, value }) {
  if (!hasIdentityValue(value)) return null;

  return (
    <div className="identity-detail-field">
      <span>{label}</span>
      <p>{Array.isArray(value) ? formatIdentityList(value) : value}</p>
    </div>
  );
}

function IdentityProfileImage({ profile }) {
  const [isHidden, setIsHidden] = useState(false);
  const imageUrl = profile.image?.url;

  if (!imageUrl || isHidden) return null;

  return (
    <div className="identity-profile-image">
      <img
        src={imageUrl}
        alt={`${profile.name || 'Untitled Identity'} identity image`}
        loading="lazy"
        onError={() => setIsHidden(true)}
      />
    </div>
  );
}

function useIdentityProfiles(activityAdapter) {
  const createClientFallbackPayload = useCallback(() => createFallbackIdentityProfilesResponse('upstream_failed'), []);
  return usePublicApiResource('/api/identity/profiles', { createClientFallbackPayload, companionEventAdapter: activityAdapter });
}

function IdentityProfilesDatabase({ item, common, lang, activityAdapter }) {
  const profileState = useIdentityProfiles(activityAdapter);
  const ui = IDENTITY_PROFILES_UI[lang] || IDENTITY_PROFILES_UI.zh;
  const [searchQuery, setSearchQuery] = useState('');
  const [identityTypeFilter, setIdentityTypeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [sortMode, setSortMode] = useState('recommended');
  const [visibleCount, setVisibleCount] = useState(8);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const resultsRef = useRef(null);
  const profiles = useMemo(() => profileState.items || profileState.data || [], [profileState.data, profileState.items]);
  const identityTypeOptions = useMemo(() => createIdentityFilterOptions(profiles, 'identityType', ui.allIdentityTypes), [profiles, ui.allIdentityTypes]);
  const roleOptions = useMemo(() => createIdentityFilterOptions(profiles, 'roleTags', ui.allRoles), [profiles, ui.allRoles]);
  const moduleOptions = useMemo(() => createIdentityFilterOptions(profiles, 'relatedModules', ui.allModules), [profiles, ui.allModules]);
  const latestUpdatedAt = profileState.updatedAt || '';
  const identityResourceStatus = profileState.resourceStatus || PUBLIC_RESOURCE_STATUS.LOADING;

  const filteredProfiles = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = profiles.filter((profile) => {
      const matchesSearch = !normalizedQuery || getIdentitySearchBody(profile).includes(normalizedQuery);
      const matchesType = identityTypeFilter === 'all' || profile.identityType === identityTypeFilter;
      const matchesRole = roleFilter === 'all' || (Array.isArray(profile.roleTags) && profile.roleTags.includes(roleFilter));
      const matchesModule = moduleFilter === 'all' || (Array.isArray(profile.relatedModules) && profile.relatedModules.includes(moduleFilter));
      return matchesSearch && matchesType && matchesRole && matchesModule;
    });

    return filtered.slice().sort((a, b) => {
      if (sortMode === 'recent') return getIdentityUpdatedTime(b) - getIdentityUpdatedTime(a);
      if (sortMode === 'name') return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
      if (sortMode === 'display-order') return getIdentityDisplayOrder(a) - getIdentityDisplayOrder(b);
      if (a.featured !== b.featured) return a.featured ? -1 : 1;

      const orderDifference = getIdentityDisplayOrder(a) - getIdentityDisplayOrder(b);
      if (orderDifference) return orderDifference;

      const updatedDifference = getIdentityUpdatedTime(b) - getIdentityUpdatedTime(a);
      if (updatedDifference) return updatedDifference;

      return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
    });
  }, [identityTypeFilter, moduleFilter, profiles, roleFilter, searchQuery, sortMode]);

  const visibleProfiles = filteredProfiles.slice(0, visibleCount);

  function resetVisibleCount() {
    setVisibleCount(8);
  }

  function updateSearchQuery(value) {
    setSearchQuery(value);
    resetVisibleCount();
  }

  function updateFilter(setter, value) {
    setter(value);
    resetVisibleCount();
    activityAdapter?.dispatch('filter-applied', { entityType: 'identity-filter' });
  }

  function toggleExpanded(id) {
    activityAdapter?.dispatch(expandedIds.has(id) ? 'item-closed' : 'item-opened', { entityType: 'identity' });
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Enter' && searchQuery.trim()) {
      activityAdapter?.search(filteredProfiles.length, { entityType: 'identity', key: 'identity-search' });
      scrollResultsIntoView(resultsRef);
    }
  }

  return (
    <article className="content-detail-card module-detail-card identity-profiles-database">
      <div className="detail-badge-row">
        <Badge>{common.moduleLabel}: {item.category}</Badge>
        <Badge>{item.status}</Badge>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{ui.title}</h1>
      <p className="detail-subtitle">{ui.subtitle}</p>

      <div className="identity-status-bar" aria-label={ui.title}>
        <span>{ui.dataSource}: {profileState.source || '...'}{profileState.isRefreshing ? ` (${ui.loading})` : ''}</span>
        <span>{ui.count}: {profileState.count ?? profiles.length}</span>
        <span>{ui.updatedAt}: {formatIdentityDate(latestUpdatedAt)}</span>
        <span>{ui.filteredCount}: {filteredProfiles.length}</span>
      </div>

      <ResourceStateNotice
        lang={lang}
        status={identityResourceStatus}
        isRefreshing={profileState.isRefreshing}
        onRetry={profileState.retry}
        retryDisabled={profileState.isLoading || profileState.isRefreshing}
      />

      {profileState.source && identityResourceStatus !== PUBLIC_RESOURCE_STATUS.LOADING && identityResourceStatus !== PUBLIC_RESOURCE_STATUS.ERROR ? (
        <div className="identity-source-card" data-source={profileState.source === 'notion' ? 'notion' : 'fallback'}>
          <span>{profileState.source === 'notion' ? ui.connected : ui.fallback}</span>
        </div>
      ) : null}

      <section className="identity-toolbar" aria-label={ui.searchPlaceholder}>
        <input
          className="identity-search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => updateSearchQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={ui.searchPlaceholder}
          aria-label={ui.searchPlaceholder}
        />

        <label className="identity-sort-control">
          <span>{ui.sort}</span>
          <select value={sortMode} onChange={(event) => updateFilter(setSortMode, event.target.value)}>
            <option value="recommended">{ui.recommended}</option>
            <option value="recent">{ui.recent}</option>
            <option value="name">{ui.nameAz}</option>
            <option value="display-order">{ui.displayOrder}</option>
          </select>
        </label>
      </section>

      <section className="identity-filter-panel" aria-label={ui.identityType}>
        <IdentityFilterGroup label={ui.identityType} filters={identityTypeOptions} activeValue={identityTypeFilter} onSelect={(value) => updateFilter(setIdentityTypeFilter, value)} />
        <IdentityFilterGroup label={ui.roleTags} filters={roleOptions} activeValue={roleFilter} onSelect={(value) => updateFilter(setRoleFilter, value)} />
        <IdentityFilterGroup label={ui.relatedModules} filters={moduleOptions} activeValue={moduleFilter} onSelect={(value) => updateFilter(setModuleFilter, value)} />
      </section>

      <section ref={resultsRef} className="identity-profile-list" aria-label={ui.count}>
        {visibleProfiles.map((profile) => {
          const isExpanded = expandedIds.has(profile.id);
          const detailFields = [
            { label: ui.fullIntroduction, value: profile.fullIntroduction },
            { label: ui.corePhilosophy, value: profile.corePhilosophy },
            { label: ui.identityType, value: profile.identityType },
            { label: ui.roleTags, value: profile.roleTags },
            { label: ui.relatedModules, value: profile.relatedModules },
            { label: ui.createdAt, value: formatIdentityDate(profile.createdAt) },
            { label: ui.updatedAt, value: formatIdentityDate(profile.updatedAt) },
          ];

          return (
            <article key={profile.id} className="identity-profile-card" data-featured={profile.featured ? 'true' : 'false'}>
              <IdentityProfileImage profile={profile} />

              <div className="identity-profile-summary">
                <div className="module-data-card-top identity-profile-top">
                  {hasIdentityValue(profile.identityType) ? <span className="content-tag">{profile.identityType}</span> : null}
                  {profile.featured ? <span className="module-data-status">{ui.featured}</span> : null}
                </div>

                <h2>{profile.name || 'Untitled Identity'}</h2>

                {hasIdentityValue(profile.shortPositioning) ? (
                  <p className="identity-short-positioning">{profile.shortPositioning}</p>
                ) : null}

                <div className="identity-tag-row">
                  {(profile.roleTags || []).map((tag) => <span key={`role-${profile.id}-${tag}`}>{tag}</span>)}
                  {(profile.relatedModules || []).map((module) => <span key={`module-${profile.id}-${module}`}>{module}</span>)}
                </div>

                <div className="identity-compact-meta">
                  {hasIdentityValue(profile.updatedAt) ? <span>{ui.updatedAt}: {formatIdentityDate(profile.updatedAt)}</span> : null}
                </div>

                <div className="identity-actions">
                  <button
                    className="identity-action-button"
                    type="button"
                    onClick={() => toggleExpanded(profile.id)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? ui.collapse : ui.expand}
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="identity-detail-panel">
                  <div className="identity-detail-grid">
                    {detailFields.map((field) => (
                      <IdentityDetailField key={field.label} label={field.label} value={field.value} />
                    ))}
                  </div>
                  {hasIdentityValue(profile.externalUrl) ? (
                    <div className="identity-actions">
                      <a className="identity-action-button" href={profile.externalUrl} target="_blank" rel="noopener noreferrer">
                        {ui.viewLink}
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}

        {!filteredProfiles.length && identityResourceStatus !== PUBLIC_RESOURCE_STATUS.LOADING ? (
          <article className="identity-empty-state">
            <p>{ui.empty}</p>
          </article>
        ) : null}
      </section>

      {filteredProfiles.length > visibleCount ? (
        <div className="identity-load-more-row">
          <span>{ui.showing} {visibleProfiles.length}{ui.of}{filteredProfiles.length}</span>
          <button
            className="identity-load-more"
            type="button"
            onClick={() => setVisibleCount((count) => count + 8)}
          >
            {ui.loadMore}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function TheoryModelLibrary({ item, common, parentPath, navigate, navigateBack, lang }) {
  const goToResearch = () => {
    suppressIntroReplay();
    navigateBack(parentPath);
  };

  const goToMethods = () => {
    navigate(toDetailPath('research', 'personalized-ai-tutoring'));
  };

  return (
    <article className="content-detail-card module-detail-card theory-library-card">
      <div className="detail-badge-row">
        <Badge>{common.moduleLabel}: {item.category}</Badge>
        <Badge>{item.status}</Badge>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{item.title}</h1>
      <p className="detail-subtitle">{item.subtitle}</p>

      <section className="theory-library-intro">
        <p>{item.summary}</p>
      </section>

      <ModuleDataPanel moduleKey={item.moduleKey} endpoint={item.dataEndpoint} lang={lang} />

      <section className="theory-relationship-card">
        <div className="label">{item.relationship.title}</div>
        <p>{item.relationship.body}</p>
      </section>

      <div className="theory-library-actions">
        <button className="btn btn-ghost" onClick={goToResearch} type="button">
          {item.actions.back}
        </button>
        <button className="btn btn-glass" onClick={goToMethods} type="button">
          {item.actions.methods}
        </button>
      </div>
    </article>
  );
}

function NotFound({ navigate, navigateBack, lang, setLang, theme, setTheme }) {
  const copy = getGuardrailCopy(lang);
  const parentPath = '/';

  function goHome() {
    suppressIntroReplay();
    navigate('/');
  }

  return (
    <GuardrailStatePage
      lang={lang}
      setLang={setLang}
      theme={theme}
      setTheme={setTheme}
      title={copy.unavailableTitle}
      body={copy.unavailableBody}
      primaryLabel={copy.backPrevious}
      secondaryLabel={copy.backHome}
      onPrimary={() => navigateBack(parentPath)}
      onSecondary={goHome}
      testId="detail-unavailable"
    />
  );
}

export default function DetailPage({ type, id, navigate, navigateBack, lang, setLang, theme, setTheme, princessEventBridge, navigatorActivity, nexonFusionOrchestrator }) {
  const content = getLocalizedSite(lang);
  const { common } = content;
  const item = getDetailItem(type, id, lang)
    || (type === 'research' && id === 'nexaeon-explorer' ? getExplorerDetailItem(lang) : null);
  const contextId = ({ teaching: 'coaching', projects: 'prototype', action: 'action', research: 'research', knowledge: 'knowledge', identity: 'identity' })[type] || 'research';
  const activityAdapter = useMemo(() => createPrincessModuleActivityAdapter(princessEventBridge, contextId), [contextId, princessEventBridge]);
  const parentPath = `/#${type}`;
  const goToParent = () => {
    suppressIntroReplay();
    navigateBack(item?.id === 'nexaeon-navigator' ? getNavigatorSourceRoute(window) : parentPath);
  };

  if (!item) {
    return (
      <NotFound
        navigate={navigate}
        navigateBack={navigateBack}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  return (
    <main className="direction-shell subpage-shell" style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <NeuralBackground />
      <DetailTopbar common={common} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} navigate={navigate} />
      <div className="container subpage-content">
        <button className="btn btn-ghost" onClick={goToParent} type="button">
          {common.backPrevious}
        </button>

        {item.id === 'nexaeon-explorer' ? (
          <NexAeonNavigatorPage
            item={item}
            common={common}
            lang={lang}
            navigate={navigate}
            activityAdapter={activityAdapter}
            runtime={EXPLORER_AGENT_PAGE}
            assistantUi={EXPLORER_ASSISTANT_UI}
          />
        ) : item.id === 'nexaeon-navigator' ? (
          <NexAeonNavigatorPage
            item={item}
            common={common}
            lang={lang}
            navigate={navigate}
            eventBridge={princessEventBridge}
            activityAdapter={navigatorActivity}
            fusionOrchestrator={nexonFusionOrchestrator}
          />
        ) : item.template === 'theory-model-library' ? (
          <TheoryModelLibrary
            item={item}
            common={common}
            parentPath={parentPath}
            navigate={navigate}
            navigateBack={navigateBack}
            lang={lang}
            activityAdapter={activityAdapter}
          />
        ) : item.template === 'knowledge-resources' ? (
          <KnowledgeResourceDatabase
            item={item}
            common={common}
            lang={lang}
            activityAdapter={activityAdapter}
          />
        ) : item.template === 'identity-profiles' ? (
          <IdentityProfilesDatabase
            item={item}
            common={common}
            lang={lang}
            activityAdapter={activityAdapter}
          />
        ) : item.id === 'action-projects' ? (
          <ActionProjectDashboard
            item={item}
            common={common}
            lang={lang}
            activityAdapter={activityAdapter}
          />
        ) : item.id === 'future-collaboration-context' ? (
          <FutureCollaborationContextDashboard
            item={item}
            common={common}
            lang={lang}
          />
        ) : item.template === 'module-data-skeleton' ? (
          <ModuleDataSkeleton
            item={item}
            common={common}
            lang={lang}
            navigate={navigate}
            activityAdapter={activityAdapter}
          />
        ) : item.template === 'literature-database' ? (
          <LiteratureDatabase
            item={item}
            common={common}
            lang={lang}
            activityAdapter={activityAdapter}
          />
        ) : (
          <article className="content-detail-card module-detail-card">
            <div className="detail-badge-row">
              <Badge>{common.moduleLabel}: {item.category}</Badge>
              <Badge>{item.status}</Badge>
            </div>

            <div className="detail-module-label">{item.moduleLabel}</div>
            <h1>{item.title}</h1>
            <p className="detail-subtitle">{item.subtitle}</p>
            <p className="detail-summary">{item.summary}</p>

            <div className="detail-section-grid">
              {item.sections.map((section) => (
                <section key={section.label} className="detail-section-card">
                  <div className="label">{section.label}</div>
                  {renderBody(section.body)}
                </section>
              ))}
            </div>

            {item.tags?.length ? (
              <section className="detail-tags">
                <div className="label">{common.tags}</div>
                <div>
                  {item.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </section>
            ) : null}
          </article>
        )}
      </div>
    </main>
  );
}
