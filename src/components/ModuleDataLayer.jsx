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

export function ModuleDataPanel({ moduleKey, endpoint, lang }) {
  const moduleState = useModuleData(moduleKey, endpoint);
  const [activeFilter, setActiveFilter] = useState('all');
  const labels = MODULE_DATA_LABELS[lang] || MODULE_DATA_LABELS.zh;
  const items = moduleState.items || [];
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
