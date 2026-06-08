/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react';
import {
  getLocalizedModuleField,
  getLocalizedModuleStatus,
  getModuleData,
  getModuleEndpoint,
  getModuleFilterLabel,
  getModuleFilters,
  getModulePageUi,
  MODULE_DATA_LABELS,
} from '../data/moduleData.js';

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return value || '';
}

function normalizeSearchText(value) {
  if (Array.isArray(value)) return value.join(' ').toLowerCase();
  if (value && typeof value === 'object') return Object.values(value).join(' ').toLowerCase();
  return String(value || '').toLowerCase();
}

function createFallbackModuleResponse(moduleKey, reason = 'client_initial_fallback') {
  const items = getModuleData(moduleKey);

  return {
    source: 'fallback',
    reason,
    moduleKey,
    endpoint: getModuleEndpoint(moduleKey),
    count: items.length,
    items,
    data: items,
    updatedAt: new Date().toISOString(),
  };
}

const BACKEND_READINESS_LABELS = {
  zh: {
    title: '後台接入準備狀態',
    intro: '目前使用本地備用資料，後台尚未正式接入。',
    currentApiRoute: '目前 API route',
    plannedBackend: '預計後台',
    status: '狀態',
    missingEnvKeys: '缺少的 env keys',
    missingFields: '缺少的資料欄位',
    fallbackAvailable: 'fallback 是否可用',
    noMissingEnv: '沒有缺少的 env keys',
    fallbackYes: '可用',
    fallbackNo: '不可用',
    statusText: {
      'fallback-ready': '備用資料可用',
      'backend-not-connected': '後台尚未接入',
      'waiting-for-env': '等待環境變數',
      'ready-for-integration': '可準備接入',
      connected: '已接入',
    },
  },
  en: {
    title: 'Backend Readiness Status',
    intro: 'Currently using local fallback data. Backend integration has not been connected yet.',
    currentApiRoute: 'Current API route',
    plannedBackend: 'Planned backend',
    status: 'Status',
    missingEnvKeys: 'Missing env keys',
    missingFields: 'Missing data fields',
    fallbackAvailable: 'Fallback available',
    noMissingEnv: 'No missing env keys',
    fallbackYes: 'Available',
    fallbackNo: 'Unavailable',
    statusText: {
      'fallback-ready': 'Fallback ready',
      'backend-not-connected': 'Backend not connected',
      'waiting-for-env': 'Waiting for environment variables',
      'ready-for-integration': 'Ready for integration',
      connected: 'Connected',
    },
  },
  ko: {
    title: '백엔드 연동 준비 상태',
    intro: '현재 로컬 예비 데이터를 사용 중이며, 백엔드 연동은 아직 연결되지 않았다.',
    currentApiRoute: '현재 API route',
    plannedBackend: '예정 백엔드',
    status: '상태',
    missingEnvKeys: '누락된 env keys',
    missingFields: '누락된 데이터 필드',
    fallbackAvailable: 'fallback 사용 가능 여부',
    noMissingEnv: '누락된 env keys 없음',
    fallbackYes: '사용 가능',
    fallbackNo: '사용 불가',
    statusText: {
      'fallback-ready': '예비 데이터 준비됨',
      'backend-not-connected': '백엔드 미연동',
      'waiting-for-env': '환경 변수 대기 중',
      'ready-for-integration': '연동 준비 가능',
      connected: '연결됨',
    },
  },
};

const BACKEND_READINESS_FALLBACK = [
  {
    id: 'identity',
    moduleTitleZh: '身份導航',
    moduleTitleEn: 'Identity',
    moduleTitleKo: '정체성',
    currentApiRoute: '/api/identity/profile',
    plannedBackendZh: 'Notion 品牌與身份資料庫',
    plannedBackendEn: 'Notion Brand / Identity Database',
    plannedBackendKo: 'Notion 브랜드 및 정체성 데이터베이스',
    requiredEnvKeys: ['NOTION_API_KEY', 'NOTION_IDENTITY_DATABASE_ID'],
    configuredEnvKeys: [],
    missingEnvKeys: ['NOTION_API_KEY', 'NOTION_IDENTITY_DATABASE_ID'],
    missingFields: ['profileTitle', 'researchIdentity', 'knowledgeSystem', 'summary', 'updatedAt'],
    readinessStatus: 'backend-not-connected',
    fallbackAvailable: true,
  },
  {
    id: 'research',
    moduleTitleZh: '研究地圖',
    moduleTitleEn: 'Research Map',
    moduleTitleKo: '연구 지도',
    currentApiRoute: ['/api/research/literature', '/api/research/models'],
    plannedBackendZh: 'Notion 研究文獻資料庫',
    plannedBackendEn: 'Notion Research Literature Database',
    plannedBackendKo: 'Notion 연구 문헌 데이터베이스',
    requiredEnvKeys: ['NOTION_API_KEY', 'NOTION_RESEARCH_DATABASE_ID'],
    configuredEnvKeys: [],
    missingEnvKeys: ['NOTION_API_KEY', 'NOTION_RESEARCH_DATABASE_ID'],
    missingFields: ['title', 'author', 'source', 'theoryModel', 'citation', 'status', 'updatedAt'],
    readinessStatus: 'backend-not-connected',
    fallbackAvailable: true,
  },
  {
    id: 'learning-coaching',
    moduleTitleZh: '學習教練',
    moduleTitleEn: 'Learning Coaching',
    moduleTitleKo: '학습 코칭',
    currentApiRoute: '/api/teaching/courses',
    plannedBackendZh: 'Notion 學習教練與課程素材資料庫',
    plannedBackendEn: 'Notion Teaching Materials Database',
    plannedBackendKo: 'Notion 학습 코칭 및 수업 자료 데이터베이스',
    requiredEnvKeys: ['NOTION_API_KEY', 'NOTION_TEACHING_DATABASE_ID'],
    configuredEnvKeys: [],
    missingEnvKeys: ['NOTION_API_KEY', 'NOTION_TEACHING_DATABASE_ID'],
    missingFields: ['courseTitle', 'learningTask', 'reflectionFlow', 'aiCollaboration', 'materials', 'updatedAt'],
    readinessStatus: 'backend-not-connected',
    fallbackAvailable: true,
  },
  {
    id: 'knowledge-system',
    moduleTitleZh: '知識系統',
    moduleTitleEn: 'Knowledge System',
    moduleTitleKo: '지식 시스템',
    currentApiRoute: '/api/knowledge/resources',
    plannedBackendZh: 'Notion 知識、靈感與文獻資料庫',
    plannedBackendEn: 'Notion Knowledge / Inspiration / Literature Databases',
    plannedBackendKo: 'Notion 지식, 영감, 문헌 데이터베이스',
    requiredEnvKeys: ['NOTION_API_KEY', 'NOTION_KNOWLEDGE_DATABASE_ID', 'NOTION_INSPIRATION_DATABASE_ID', 'NOTION_RESEARCH_DATABASE_ID'],
    configuredEnvKeys: [],
    missingEnvKeys: ['NOTION_API_KEY', 'NOTION_KNOWLEDGE_DATABASE_ID', 'NOTION_INSPIRATION_DATABASE_ID', 'NOTION_RESEARCH_DATABASE_ID'],
    missingFields: ['title', 'category', 'source', 'relatedModule', 'summary', 'tags', 'updatedAt'],
    readinessStatus: 'backend-not-connected',
    fallbackAvailable: true,
  },
  {
    id: 'practice-projects',
    moduleTitleZh: '實踐項目',
    moduleTitleEn: 'Practice Projects',
    moduleTitleKo: '실천 프로젝트',
    currentApiRoute: '/api/modules/demos',
    plannedBackendZh: 'Airtable 或 Notion MVP 項目資料庫',
    plannedBackendEn: 'Airtable or Notion MVP Projects Database',
    plannedBackendKo: 'Airtable 또는 Notion MVP 프로젝트 데이터베이스',
    requiredEnvKeys: ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID', 'AIRTABLE_MODULES_TABLE_ID'],
    configuredEnvKeys: [],
    missingEnvKeys: ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID', 'AIRTABLE_MODULES_TABLE_ID'],
    missingFields: ['projectName', 'problem', 'solution', 'techStack', 'status', 'nextStep', 'updatedAt'],
    readinessStatus: 'backend-not-connected',
    fallbackAvailable: true,
  },
  {
    id: 'field-experiment',
    moduleTitleZh: '現場實驗',
    moduleTitleEn: 'Field Experiment',
    moduleTitleKo: '현장 실험',
    currentApiRoute: '/api/action/projects',
    plannedBackendZh: 'Airtable 項目與 Action Center 資料庫',
    plannedBackendEn: 'Airtable Project / Action Center Database',
    plannedBackendKo: 'Airtable 프로젝트 및 Action Center 데이터베이스',
    requiredEnvKeys: ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID', 'AIRTABLE_PROJECTS_TABLE_ID'],
    configuredEnvKeys: [],
    missingEnvKeys: ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID', 'AIRTABLE_PROJECTS_TABLE_ID'],
    missingFields: ['actionTitle', 'context', 'stakeholder', 'practiceFocus', 'evidence', 'updatedAt'],
    readinessStatus: 'backend-not-connected',
    fallbackAvailable: true,
  },
];

function getLocalizedReadinessField(source, field, lang) {
  return source[`${field}${lang.charAt(0).toUpperCase()}${lang.slice(1)}`] || source[`${field}En`] || '';
}

function formatApiRoute(route) {
  return Array.isArray(route) ? route.join(', ') : route;
}

const TEACHING_DATABASE_UI = {
  zh: {
    dataSource: '資料來源',
    count: '教學素材數量',
    updatedAt: '最後更新時間',
    filteredCount: '目前篩選結果',
    searchPlaceholder: '搜尋課程、教材、主題、Prompt 或學習目標',
    typeFilter: '教材類型',
    statusFilter: '使用狀態',
    languageFilter: '語言',
    expand: '展開詳情',
    collapse: '收合詳情',
    loadMore: '載入更多',
    empty: '沒有符合條件的教學素材。',
    showing: '目前顯示',
    of: ' / ',
    courseTypeTopic: '類型 / 主題',
    targetAudience: '目標對象',
    learningGoals: '學習目標',
    materials: '教學素材',
    promptExamples: 'Prompt 範例',
    assessment: '評量設計',
    usage: '使用目的',
    language: '語言',
    source: {
      notion: '資料來源：Notion 教學素材庫',
      fallback: '資料來源：Fallback Teaching Data',
    },
    connection: {
      notion: '連接狀態：已連接真實教學素材資料源',
      fallback: '連接狀態：尚未連接 Notion，正在使用本地備用教學資料',
    },
  },
  en: {
    dataSource: 'Data Source',
    count: 'Teaching Material Count',
    updatedAt: 'Last Updated',
    filteredCount: 'Filtered Results',
    searchPlaceholder: 'Search courses, materials, topics, prompts, or learning goals',
    typeFilter: 'Material Type',
    statusFilter: 'Status',
    languageFilter: 'Language',
    expand: 'Expand details',
    collapse: 'Collapse details',
    loadMore: 'Load more',
    empty: 'No teaching materials match the current filters.',
    showing: 'Showing',
    of: ' of ',
    courseTypeTopic: 'Type / Topic',
    targetAudience: 'Target Audience',
    learningGoals: 'Learning Goals',
    materials: 'Teaching Materials',
    promptExamples: 'Prompt Examples',
    assessment: 'Assessment',
    usage: 'Usage',
    language: 'Language',
    source: {
      notion: 'Data Source: Notion Teaching Materials Database',
      fallback: 'Data Source: Fallback Teaching Data',
    },
    connection: {
      notion: 'Connection Status: Live teaching material source connected',
      fallback: 'Connection Status: Notion not connected, using local backup teaching data',
    },
  },
  ko: {
    dataSource: '데이터 출처',
    count: '수업 자료 수',
    updatedAt: '마지막 업데이트',
    filteredCount: '현재 필터 결과',
    searchPlaceholder: '수업, 자료, 주제, 프롬프트 또는 학습 목표 검색',
    typeFilter: '자료 유형',
    statusFilter: '사용 상태',
    languageFilter: '언어',
    expand: '자세히 보기',
    collapse: '접기',
    loadMore: '더 보기',
    empty: '현재 필터와 일치하는 수업 자료가 없다.',
    showing: '표시 중',
    of: ' / ',
    courseTypeTopic: '유형 / 주제',
    targetAudience: '대상',
    learningGoals: '학습 목표',
    materials: '수업 자료',
    promptExamples: '프롬프트 예시',
    assessment: '평가 설계',
    usage: '사용 목적',
    language: '언어',
    source: {
      notion: '데이터 출처: Notion 수업 자료 데이터베이스',
      fallback: '데이터 출처: Fallback Teaching Data',
    },
    connection: {
      notion: '연결 상태: 실제 수업 자료 데이터 소스 연결 완료',
      fallback: '연결 상태: Notion 미연결, 로컬 예비 수업 자료 사용 중',
    },
  },
};

const TEACHING_TYPE_FILTERS = [
  { value: 'all', label: { zh: '全部', en: 'All', ko: '전체' }, matches: [] },
  { value: 'prompt-engineering', label: { zh: 'Prompt Engineering', en: 'Prompt Engineering', ko: 'Prompt Engineering' }, matches: ['Prompt Engineering', 'prompt', '提示詞', '프롬프트'] },
  { value: 'ai-literacy', label: { zh: 'AI Literacy', en: 'AI Literacy', ko: 'AI Literacy' }, matches: ['AI Literacy', 'AI 素養', 'AI 리터러시'] },
  { value: 'research-methods', label: { zh: 'Research Methods', en: 'Research Methods', ko: 'Research Methods' }, matches: ['Research Methods', 'Research Method', '研究方法', '연구 방법'] },
  { value: 'workshop', label: { zh: 'Workshop', en: 'Workshop', ko: 'Workshop' }, matches: ['Workshop', '工作坊', '워크숍'] },
  { value: 'lecture', label: { zh: 'Lecture', en: 'Lecture', ko: 'Lecture' }, matches: ['Lecture', '講座', '課程', '강의'] },
  { value: 'assignment', label: { zh: 'Assignment', en: 'Assignment', ko: 'Assignment' }, matches: ['Assignment', '作業', '과제'] },
  { value: 'rubric', label: { zh: 'Rubric', en: 'Rubric', ko: 'Rubric' }, matches: ['Rubric', '評量', '루브릭'] },
];

const TEACHING_STATUS_FILTERS = [
  { value: 'all', label: { zh: '全部狀態', en: 'All Status', ko: '전체 상태' }, matches: [] },
  { value: 'ready', label: { zh: '可立即授課', en: 'Ready to Teach', ko: '바로 수업 가능' }, matches: ['可立即授課', 'ready', 'ready to teach', '바로'] },
  { value: 'draft', label: { zh: '草稿', en: 'Draft', ko: '초안' }, matches: ['草稿', 'draft', '초안'] },
  { value: 'in-progress', label: { zh: '製作中', en: 'In Progress', ko: '제작 중' }, matches: ['製作中', 'in progress', '進行中', '제작', '진행'] },
  { value: 'organized', label: { zh: '已整理', en: 'Organized', ko: '정리 완료' }, matches: ['已整理', 'organized', '整理', '정리'] },
  { value: 'needs-more', label: { zh: '待補充', en: 'Needs More', ko: '보완 필요' }, matches: ['待補充', 'needs more', '補充', '보완'] },
];

const TEACHING_LANGUAGE_FILTERS = [
  { value: 'all', label: { zh: '全部語言', en: 'All Languages', ko: '전체 언어' }, matches: [] },
  { value: 'zh', label: { zh: '中文', en: 'Chinese', ko: '중국어' }, matches: ['中文', 'Chinese', 'zh', '繁中'] },
  { value: 'ko', label: { zh: '韓文', en: 'Korean', ko: '한국어' }, matches: ['韓文', 'Korean', 'ko', '한국어'] },
  { value: 'en', label: { zh: '英文', en: 'English', ko: '영어' }, matches: ['英文', 'English', 'en'] },
  { value: 'zh-ko', label: { zh: '中韓雙語', en: 'Chinese-Korean', ko: '중한 이중언어' }, matches: ['中韓', 'Chinese-Korean', 'zh-ko', '중한'] },
  { value: 'tri', label: { zh: '中英韓三語', en: 'Chinese-English-Korean', ko: '중영한 삼중언어' }, matches: ['中英韓', 'Chinese-English-Korean', 'trilingual', '三語', '삼중'] },
];

function getTeachingField(item, field, lang) {
  if (item[field]) return item[field];
  if (field === 'title') return getLocalizedModuleField(item, 'title', lang);
  if (field === 'summary') return item.summary || getLocalizedModuleField(item, 'description', lang);
  if (field === 'courseType') return item.courseType || item.type || '';
  if (field === 'topic') return item.topic || item.category || '';
  if (field === 'targetAudience') return item.targetAudience || item.audience || '';
  if (field === 'module') return item.module || item.relatedModule || '';
  if (field === 'materials') return item.materials || getLocalizedModuleField(item, 'description', lang);
  return '';
}

function getTeachingSearchBody(item, lang) {
  return [
    getTeachingField(item, 'title', lang),
    getTeachingField(item, 'courseType', lang),
    getTeachingField(item, 'topic', lang),
    getTeachingField(item, 'targetAudience', lang),
    getTeachingField(item, 'module', lang),
    item.learningGoals,
    getTeachingField(item, 'materials', lang),
    item.promptExamples,
    item.assessment,
    item.tags,
    getTeachingField(item, 'summary', lang),
    item.usage,
    item.status,
  ].map(normalizeSearchText).join(' ');
}

function doesTeachingMatchFilter(item, filter, lang, fields) {
  if (filter.value === 'all') return true;
  const haystack = fields.map((field) => normalizeSearchText(getTeachingField(item, field, lang) || item[field])).join(' ');
  return filter.matches.some((match) => haystack.includes(match.toLowerCase()));
}

function getLatestModuleUpdate(moduleState) {
  if (moduleState.updatedAt) return moduleState.updatedAt;
  const dates = (moduleState.items || [])
    .map((item) => item.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return dates[0] || '';
}

function useBackendReadinessData() {
  const [sources, setSources] = useState(BACKEND_READINESS_FALLBACK);

  useEffect(() => {
    let isMounted = true;

    async function loadBackendReadiness() {
      try {
        const response = await fetch('/api/system/data-sources');
        if (!response.ok) throw new Error(`Data source API failed with status ${response.status}`);
        const payload = await response.json();
        const nextSources = payload.items || payload.data || [];
        if (isMounted && nextSources.length) setSources(nextSources);
      } catch {
        if (isMounted) setSources(BACKEND_READINESS_FALLBACK);
      }
    }

    loadBackendReadiness();

    return () => {
      isMounted = false;
    };
  }, []);

  return sources;
}

function BackendReadinessStatus({ lang }) {
  const labels = BACKEND_READINESS_LABELS[lang] || BACKEND_READINESS_LABELS.zh;
  const sources = useBackendReadinessData();

  return (
    <section className="backend-readiness-section">
      <div className="module-gateway-heading backend-readiness-heading">
        <div className="label">— {labels.title}</div>
        <h2>{labels.title}</h2>
        <p>{labels.intro}</p>
      </div>

      <div className="module-v1-grid">
        {sources.map((source) => (
          <article key={source.id} className="module-v1-card">
            <div className="module-data-card-top">
              <span className="content-tag">{getLocalizedReadinessField(source, 'moduleTitle', lang)}</span>
              <span className="module-data-status">
                {labels.statusText[source.readinessStatus] || source.readinessStatus}
              </span>
            </div>
            <h2>{getLocalizedReadinessField(source, 'moduleTitle', lang)}</h2>
            <p>{labels.intro}</p>

            <div className="module-v1-field">
              <span>{labels.currentApiRoute}</span>
              <p>{formatApiRoute(source.currentApiRoute)}</p>
            </div>
            <div className="module-v1-field">
              <span>{labels.plannedBackend}</span>
              <p>{getLocalizedReadinessField(source, 'plannedBackend', lang)}</p>
            </div>
            <div className="module-v1-field">
              <span>{labels.status}</span>
              <p>{labels.statusText[source.readinessStatus] || source.readinessStatus}</p>
            </div>
            <div className="module-v1-field">
              <span>{labels.missingEnvKeys}</span>
              <p>{source.missingEnvKeys?.length ? source.missingEnvKeys.join(', ') : labels.noMissingEnv}</p>
            </div>
            <div className="module-v1-field">
              <span>{labels.missingFields}</span>
              <p>{(source.missingFields || source.requiredFields || []).join(', ')}</p>
            </div>
            <div className="module-v1-field">
              <span>{labels.fallbackAvailable}</span>
              <p>{source.fallbackAvailable ? labels.fallbackYes : labels.fallbackNo}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function useModuleData(moduleKey, endpoint) {
  const [moduleState, setModuleState] = useState(() => createFallbackModuleResponse(moduleKey));

  useEffect(() => {
    let isMounted = true;

    async function loadModuleData() {
      try {
        const response = await fetch(endpoint || getModuleEndpoint(moduleKey));
        if (!response.ok) throw new Error(`Module API failed with status ${response.status}`);
        const payload = await response.json();
        const items = payload.items || payload.data || [];

        if (isMounted) {
          setModuleState({
            ...payload,
            items,
            data: items,
            source: payload.source || 'fallback',
          });
        }
      } catch {
        if (isMounted) setModuleState(createFallbackModuleResponse(moduleKey, 'client_fetch_failed'));
      }
    }

    loadModuleData();

    return () => {
      isMounted = false;
    };
  }, [endpoint, moduleKey]);

  return moduleState;
}

export function ModuleFilterTabs({ moduleKey, activeFilter, setActiveFilter, lang }) {
  const filters = getModuleFilters(moduleKey);

  return (
    <div className="module-filter-row" role="group" aria-label={moduleKey}>
      {filters.map((filter) => (
        <button
          key={filter.id}
          className="module-filter-chip"
          data-active={activeFilter === filter.id ? 'true' : 'false'}
          onClick={() => setActiveFilter(filter.id)}
          type="button"
        >
          {getModuleFilterLabel(filter, lang)}
        </button>
      ))}
    </div>
  );
}

export function ModuleDataCard({ item, lang }) {
  const labels = MODULE_DATA_LABELS[lang] || MODULE_DATA_LABELS.zh;
  const actionLabel = getLocalizedModuleField(item, 'actionLabel', lang);

  return (
    <article className="module-v1-card">
      <div className="module-data-card-top">
        <span className="content-tag">{item.type}</span>
        <span className="module-data-status">{item.status}</span>
      </div>
      <h2>{getLocalizedModuleField(item, 'title', lang)}</h2>
      <p>{getLocalizedModuleField(item, 'description', lang)}</p>

      <div className="module-v1-field">
        <span>{labels.category}</span>
        <p>{item.category}</p>
      </div>
      <div className="module-v1-field">
        <span>{labels.tags}</span>
        <p>{normalizeList(item.tags)}</p>
      </div>

      {item.audience ? (
        <div className="module-v1-field">
          <span>{labels.audience}</span>
          <p>{item.audience}</p>
        </div>
      ) : null}
      {item.relatedModule ? (
        <div className="module-v1-field">
          <span>{labels.relatedModule}</span>
          <p>{item.relatedModule}</p>
        </div>
      ) : null}
      {item.relatedTheory ? (
        <div className="module-v1-field">
          <span>{labels.relatedTheory}</span>
          <p>{item.relatedTheory}</p>
        </div>
      ) : null}
      {item.relatedProject ? (
        <div className="module-v1-field">
          <span>{labels.relatedProject}</span>
          <p>{item.relatedProject}</p>
        </div>
      ) : null}

      <div className="module-v1-footer">
        <span>{labels.sourceType}: {item.sourceType}</span>
        <span>{labels.updatedAt}: {item.updatedAt}</span>
      </div>

      {actionLabel && item.actionUrl ? (
        <a className="module-v1-action" href={item.actionUrl}>
          {actionLabel}
        </a>
      ) : null}
    </article>
  );
}

export function ModuleDataStatus({ moduleKey, lang }) {
  const status = getLocalizedModuleStatus(lang);

  return (
    <section className="module-data-source-card module-v1-status-card">
      <div>
        <div className="label">{status.source}</div>
        <p>{status.connection}</p>
      </div>
      <span className="module-data-endpoint">{getModuleEndpoint(moduleKey)}</span>
    </section>
  );
}

function TeachingSourceCard({ source, lang }) {
  const ui = TEACHING_DATABASE_UI[lang] || TEACHING_DATABASE_UI.zh;
  const sourceKey = source === 'notion' ? 'notion' : 'fallback';

  return (
    <section className="module-data-source-card teaching-status-card">
      <div>
        <div className="label">{ui.source[sourceKey]}</div>
        <p>{ui.connection[sourceKey]}</p>
      </div>
      <span className="module-data-endpoint">{getModuleEndpoint('teaching')}</span>
    </section>
  );
}

function TeachingFilterGroup({ label, filters, activeValue, onSelect, lang }) {
  return (
    <div className="teaching-filter-section">
      <span>{label}</span>
      <div className="teaching-filter-row">
        {filters.map((filter) => (
          <button
            key={filter.value}
            className="teaching-filter-chip"
            data-active={activeValue === filter.value ? 'true' : 'false'}
            type="button"
            onClick={() => onSelect(filter.value)}
          >
            {filter.label[lang] || filter.label.zh}
          </button>
        ))}
      </div>
    </div>
  );
}

function TeachingDataPanel({ moduleKey, endpoint, lang }) {
  const moduleState = useModuleData(moduleKey, endpoint);
  const ui = TEACHING_DATABASE_UI[lang] || TEACHING_DATABASE_UI.zh;
  const labels = MODULE_DATA_LABELS[lang] || MODULE_DATA_LABELS.zh;
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const items = useMemo(() => moduleState.items || [], [moduleState.items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const activeType = TEACHING_TYPE_FILTERS.find((filter) => filter.value === typeFilter) || TEACHING_TYPE_FILTERS[0];
    const activeStatus = TEACHING_STATUS_FILTERS.find((filter) => filter.value === statusFilter) || TEACHING_STATUS_FILTERS[0];
    const activeLanguage = TEACHING_LANGUAGE_FILTERS.find((filter) => filter.value === languageFilter) || TEACHING_LANGUAGE_FILTERS[0];

    return items.filter((teachingItem) => {
      const matchesSearch = !normalizedQuery || getTeachingSearchBody(teachingItem, lang).includes(normalizedQuery);
      return matchesSearch
        && doesTeachingMatchFilter(teachingItem, activeType, lang, ['courseType', 'topic', 'tags', 'summary'])
        && doesTeachingMatchFilter(teachingItem, activeStatus, lang, ['status'])
        && doesTeachingMatchFilter(teachingItem, activeLanguage, lang, ['language']);
    });
  }, [items, lang, languageFilter, searchQuery, statusFilter, typeFilter]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const latestUpdatedAt = getLatestModuleUpdate(moduleState);

  function resetVisibleCount() {
    setVisibleCount(10);
  }

  function updateSearchQuery(value) {
    setSearchQuery(value);
    resetVisibleCount();
  }

  function updateTypeFilter(value) {
    setTypeFilter(value);
    resetVisibleCount();
  }

  function updateStatusFilter(value) {
    setStatusFilter(value);
    resetVisibleCount();
  }

  function updateLanguageFilter(value) {
    setLanguageFilter(value);
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

  return (
    <>
      <div className="teaching-state-row">
        <span>{ui.dataSource}: {moduleState.source}</span>
        <span>{ui.count}: {moduleState.count ?? items.length}</span>
        <span>{ui.updatedAt}: {latestUpdatedAt}</span>
        <span>{ui.filteredCount}: {filteredItems.length}</span>
      </div>

      <TeachingSourceCard source={moduleState.source} lang={lang} />

      <section className="teaching-toolbar" aria-label={ui.searchPlaceholder}>
        <input
          className="teaching-search-input"
          type="search"
          value={searchQuery}
          onChange={(event) => updateSearchQuery(event.target.value)}
          placeholder={ui.searchPlaceholder}
          aria-label={ui.searchPlaceholder}
        />
      </section>

      <section className="teaching-filter-panel" aria-label={ui.typeFilter}>
        <TeachingFilterGroup
          label={ui.typeFilter}
          filters={TEACHING_TYPE_FILTERS}
          activeValue={typeFilter}
          onSelect={updateTypeFilter}
          lang={lang}
        />
        <TeachingFilterGroup
          label={ui.statusFilter}
          filters={TEACHING_STATUS_FILTERS}
          activeValue={statusFilter}
          onSelect={updateStatusFilter}
          lang={lang}
        />
        <TeachingFilterGroup
          label={ui.languageFilter}
          filters={TEACHING_LANGUAGE_FILTERS}
          activeValue={languageFilter}
          onSelect={updateLanguageFilter}
          lang={lang}
        />
      </section>

      <section className="teaching-compact-list" aria-label={moduleKey}>
        {visibleItems.map((teachingItem) => {
          const title = getTeachingField(teachingItem, 'title', lang) || 'Untitled Teaching Material';
          const summary = getTeachingField(teachingItem, 'summary', lang);
          const isExpanded = expandedIds.has(teachingItem.id);

          return (
            <article key={teachingItem.id} className="teaching-compact-card">
              <div className="teaching-compact-main">
                <div>
                  <div className="module-data-card-top teaching-compact-top">
                    <span className="content-tag">{getTeachingField(teachingItem, 'courseType', lang)}</span>
                    <span className="module-data-status">{teachingItem.status}</span>
                  </div>
                  <h2>{title}</h2>
                  <p className="teaching-meta-line">
                    {getTeachingField(teachingItem, 'courseType', lang)} / {getTeachingField(teachingItem, 'topic', lang)}
                  </p>
                </div>

                <button
                  className="teaching-expand-button"
                  type="button"
                  onClick={() => toggleExpanded(teachingItem.id)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? ui.collapse : ui.expand}
                </button>
              </div>

              <div className="teaching-compact-meta">
                <span>{ui.targetAudience}: {getTeachingField(teachingItem, 'targetAudience', lang)}</span>
                <span>{labels.status}: {teachingItem.status}</span>
              </div>

              <div className="teaching-tag-row">
                {(teachingItem.tags || []).length
                  ? teachingItem.tags.map((tag) => <span key={tag}>{tag}</span>)
                  : <span>{getTeachingField(teachingItem, 'module', lang)}</span>}
              </div>

              <p className="teaching-card-summary">{summary}</p>

              {isExpanded && (
                <div className="teaching-detail-panel">
                  <div className="module-v1-field">
                    <span>{ui.learningGoals}</span>
                    <p>{teachingItem.learningGoals}</p>
                  </div>
                  <div className="module-v1-field">
                    <span>{ui.materials}</span>
                    <p>{getTeachingField(teachingItem, 'materials', lang)}</p>
                  </div>
                  <div className="module-v1-field">
                    <span>{ui.promptExamples}</span>
                    <p>{teachingItem.promptExamples}</p>
                  </div>
                  <div className="module-v1-field">
                    <span>{ui.assessment}</span>
                    <p>{teachingItem.assessment}</p>
                  </div>
                  <div className="module-v1-field">
                    <span>{ui.usage}</span>
                    <p>{teachingItem.usage}</p>
                  </div>
                  <div className="module-v1-field">
                    <span>{ui.language}</span>
                    <p>{teachingItem.language}</p>
                  </div>
                  <div className="module-v1-footer">
                    <span>{labels.sourceType}: {teachingItem.sourceType}</span>
                    <span>{labels.updatedAt}: {teachingItem.updatedAt}</span>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {!filteredItems.length ? (
          <article className="teaching-empty-state">
            <p>{ui.empty}</p>
          </article>
        ) : null}
      </section>

      {filteredItems.length > visibleCount ? (
        <div className="teaching-load-more-row">
          <span>{ui.showing} {visibleItems.length}{ui.of}{filteredItems.length}</span>
          <button
            className="teaching-load-more"
            type="button"
            onClick={() => setVisibleCount((count) => count + 10)}
          >
            {ui.loadMore}
          </button>
        </div>
      ) : null}
    </>
  );
}

function StandardModuleDataPanel({ moduleKey, endpoint, lang }) {
  const moduleState = useModuleData(moduleKey, endpoint);
  const [activeFilter, setActiveFilter] = useState('all');
  const labels = MODULE_DATA_LABELS[lang] || MODULE_DATA_LABELS.zh;
  const items = useMemo(() => moduleState.items || [], [moduleState.items]);
  const filteredItems = useMemo(() => (
    activeFilter === 'all' ? items : items.filter((item) => item.type === activeFilter || item.category === activeFilter)
  ), [activeFilter, items]);

  return (
    <>
      <ModuleFilterTabs
        moduleKey={moduleKey}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        lang={lang}
      />

      {filteredItems.length ? (
        <section className="module-v1-grid" aria-label={moduleKey}>
          {filteredItems.map((dataItem) => (
            <ModuleDataCard key={dataItem.id} item={dataItem} lang={lang} />
          ))}
        </section>
      ) : (
        <section className="module-v1-empty-card">
          <p>{labels.empty}</p>
        </section>
      )}

      <ModuleDataStatus moduleKey={moduleKey} lang={lang} />
    </>
  );
}

export function ModuleDataPanel({ moduleKey, endpoint, lang }) {
  if (moduleKey === 'teaching') {
    return <TeachingDataPanel moduleKey={moduleKey} endpoint={endpoint} lang={lang} />;
  }

  return <StandardModuleDataPanel moduleKey={moduleKey} endpoint={endpoint} lang={lang} />;
}

export default function ModuleDataLayer({ item, common, lang }) {
  const moduleKey = item.moduleKey;
  const pageUi = getModulePageUi(moduleKey, lang);
  const showBackendReadiness = moduleKey === 'action';

  return (
    <article className="content-detail-card module-detail-card module-v1-page-card">
      <div className="detail-badge-row">
        <span className="content-tag">{common.moduleLabel}: {item.category}</span>
        <span className="content-tag">{item.status}</span>
      </div>

      <div className="detail-module-label">{item.moduleLabel}</div>
      <h1>{pageUi.title}</h1>
      <p className="detail-subtitle">{pageUi.subtitle}</p>
      <ModuleDataPanel moduleKey={moduleKey} endpoint={item.dataEndpoint} lang={lang} />
      {showBackendReadiness ? <BackendReadinessStatus lang={lang} /> : null}
    </article>
  );
}
