import { useEffect, useMemo, useState } from 'react';
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
  KNOWLEDGE_FILTERS,
  KNOWLEDGE_RESOURCE_UI,
} from '../data/knowledgeResourceData.js';
import ModuleDataLayer, { ModuleDataPanel } from './ModuleDataLayer.jsx';
import NeuralBackground from './NeuralBackground.jsx';
import { LangSwitcher, NexLogo, NexWordmark } from './Logo.jsx';
import { toDetailPath } from '../utils/router.js';

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

function ModuleDataSkeleton({ item, common, lang }) {
  return <ModuleDataLayer item={item} common={common} lang={lang} />;
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

function useResearchLiterature() {
  const [literatureState, setLiteratureState] = useState(() => createFallbackLiteratureResponse('client_initial_fallback'));

  useEffect(() => {
    let isMounted = true;

    async function loadLiterature() {
      try {
        const response = await fetch('/api/research/literature');
        if (!response.ok) throw new Error(`Literature API failed with status ${response.status}`);
        const payload = await response.json();
        if (isMounted) setLiteratureState(payload);
      } catch {
        if (isMounted) setLiteratureState(createFallbackLiteratureResponse('client_fetch_failed'));
      }
    }

    loadLiterature();

    return () => {
      isMounted = false;
    };
  }, []);

  return literatureState;
}

function useKnowledgeResources() {
  const [knowledgeState, setKnowledgeState] = useState(() => createFallbackKnowledgeResponse('client_initial_fallback'));

  useEffect(() => {
    let isMounted = true;

    async function loadKnowledgeResources() {
      try {
        const response = await fetch('/api/knowledge/resources');
        if (!response.ok) throw new Error(`Knowledge API failed with status ${response.status}`);
        const payload = await response.json();
        if (isMounted) setKnowledgeState(payload);
      } catch {
        if (isMounted) setKnowledgeState(createFallbackKnowledgeResponse('client_fetch_failed'));
      }
    }

    loadKnowledgeResources();

    return () => {
      isMounted = false;
    };
  }, []);

  return knowledgeState;
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

function LiteratureDatabase({ item, common, lang }) {
  const literatureState = useResearchLiterature();
  const ui = LITERATURE_UI[lang] || LITERATURE_UI.zh;
  const databaseUi = LITERATURE_DATABASE_UI[lang] || LITERATURE_DATABASE_UI.zh;
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortMode, setSortMode] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const topicOption = LITERATURE_TOPIC_FILTERS.find((filter) => filter.value === topicFilter) || LITERATURE_TOPIC_FILTERS[0];
  const methodOption = LITERATURE_METHOD_FILTERS.find((filter) => filter.value === methodFilter) || LITERATURE_METHOD_FILTERS[0];
  const statusOption = LITERATURE_STATUS_FILTERS.find((filter) => filter.value === statusFilter) || LITERATURE_STATUS_FILTERS[0];
  const literatureItems = useMemo(() => literatureState.data || [], [literatureState.data]);

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
    setTopicFilter(value);
    setVisibleCount(10);
  }

  function updateMethodFilter(value) {
    setMethodFilter(value);
    setVisibleCount(10);
  }

  function updateStatusFilter(value) {
    setStatusFilter(value);
    setVisibleCount(10);
  }

  function updateSortMode(value) {
    setSortMode(value);
    setVisibleCount(10);
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
        <span>{databaseUi.dataSource}: {literatureState.source}</span>
        <span>{databaseUi.count}: {literatureState.count ?? literatureItems.length}</span>
        <span>{databaseUi.updatedAt}: {latestUpdatedAt}</span>
        <span>{databaseUi.filteredCount}: {filteredLiterature.length}</span>
      </div>

      <LiteratureStatusCard source={literatureState.source} lang={lang} />

      <section className="literature-toolbar" aria-label={ui.title}>
        <input
          className="literature-search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => updateSearchQuery(event.target.value)}
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

      <section className="literature-compact-list" aria-label={ui.title}>
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

        {!filteredLiterature.length && (
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

function KnowledgeResourceDatabase({ item, common, lang }) {
  const knowledgeState = useKnowledgeResources();
  const ui = KNOWLEDGE_RESOURCE_UI[lang] || KNOWLEDGE_RESOURCE_UI.zh;
  const [activeFilter, setActiveFilter] = useState('all');
  const resources = knowledgeState.items || [];
  const filteredResources = activeFilter === 'all'
    ? resources
    : resources.filter((resource) => resource.type === activeFilter);

  return (
    <article className="content-detail-card module-detail-card knowledge-resource-database-card">
      <div className="detail-badge-row">
        <Badge>{common.moduleLabel}: {item.category}</Badge>
        <Badge>{item.status}</Badge>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{ui.title}</h1>
      <p className="detail-subtitle">{ui.subtitle}</p>

      <div className="knowledge-filter-row" role="group" aria-label={ui.title}>
        {KNOWLEDGE_FILTERS.map((filter) => (
          <button
            key={filter}
            className="knowledge-filter-chip"
            data-active={activeFilter === filter ? 'true' : 'false'}
            onClick={() => setActiveFilter(filter)}
            type="button"
          >
            {ui.filters[filter]}
          </button>
        ))}
      </div>

      <section className="knowledge-resource-grid" aria-label={ui.title}>
        {filteredResources.map((resource) => (
          <article key={resource.id} className="knowledge-resource-card">
            <div className="module-data-card-top">
              <span className="content-tag">{resource.type}</span>
              <span className="module-data-status">{resource.status}</span>
            </div>
            <h2>{getKnowledgeTitle(resource, lang)}</h2>

            <div className="knowledge-resource-field">
              <span>{ui.type}</span>
              <p>{resource.type}</p>
            </div>
            <div className="knowledge-resource-field">
              <span>{ui.category}</span>
              <p>{resource.category}</p>
            </div>
            <div className="knowledge-resource-field">
              <span>{ui.tags}</span>
              <p>{normalizeList(resource.tags)}</p>
            </div>
            <div className="knowledge-resource-field">
              <span>{ui.relatedModule}</span>
              <p>{resource.relatedModule}</p>
            </div>
            <div className="knowledge-resource-field knowledge-resource-summary">
              <span>{ui.summary}</span>
              <p>{getKnowledgeSummary(resource, lang)}</p>
            </div>
            <div className="knowledge-resource-footer">
              <span>{ui.status}: {resource.status}</span>
              <span>{ui.sourceType}: {resource.sourceType}</span>
              <span>{ui.updatedAt}: {resource.updatedAt}</span>
            </div>
          </article>
        ))}
      </section>

      <KnowledgeStatusCard source={knowledgeState.source} lang={lang} />
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

function NotFound({ navigate, navigateBack, content, lang, setLang, theme, setTheme }) {
  const { common } = content;

  return (
    <main className="direction-shell subpage-shell" style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <NeuralBackground />
      <DetailTopbar common={common} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} navigate={navigate} />
      <div className="container subpage-content">
        <div className="content-detail-card detail-empty-card">
          <div className="detail-empty-title">{common.notFoundTitle}</div>
          <p>{common.notFoundBody}</p>
          <button className="btn btn-ghost" onClick={() => navigateBack('/')} type="button">
            {common.backPrevious}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function DetailPage({ type, id, navigate, navigateBack, lang, setLang, theme, setTheme }) {
  const content = getLocalizedSite(lang);
  const { common } = content;
  const item = getDetailItem(type, id, lang);
  const parentPath = `/#${type}`;
  const goToParent = () => {
    suppressIntroReplay();
    navigateBack(parentPath);
  };

  if (!item) {
    return (
      <NotFound
        navigate={navigate}
        navigateBack={navigateBack}
        content={content}
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

        {item.template === 'theory-model-library' ? (
          <TheoryModelLibrary
            item={item}
            common={common}
            parentPath={parentPath}
            navigate={navigate}
            navigateBack={navigateBack}
            lang={lang}
          />
        ) : item.template === 'knowledge-resources' ? (
          <KnowledgeResourceDatabase
            item={item}
            common={common}
            lang={lang}
          />
        ) : item.template === 'module-data-skeleton' ? (
          <ModuleDataSkeleton
            item={item}
            common={common}
            lang={lang}
          />
        ) : item.template === 'literature-database' ? (
          <LiteratureDatabase
            item={item}
            common={common}
            lang={lang}
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
