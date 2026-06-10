/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useRef, useState } from 'react';
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

function scrollResultsIntoView(ref) {
  ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    updatedAt: '最後更新',
    filteredCount: '目前篩選結果',
    searchPlaceholder: '搜尋標題、分類、形式、對象、標籤或備註',
    emptyValue: '未填寫',
    expand: '展開詳情',
    collapse: '收合詳情',
    loadMore: '載入更多',
    empty: '沒有符合條件的教學素材。',
    showing: '目前顯示',
    of: ' / ',
    teachingCategory: '教學分類',
    format: '形式',
    subTopic: '子主題',
    targetAudience: '對象',
    durationMinutes: '可講時間',
    difficulty: '難度',
    status: '狀態',
    language: '語言',
    tags: '標籤',
    note: '備註',
    fileUrl: '檔案連結',
    usageCount: '使用次數',
    referenceCount: '參考文獻',
    inspirationCount: '源靈感',
    derivedContentCount: '衍生內容',
    createdAt: '建立日期',
    openFile: '開啟檔案',
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
    updatedAt: 'Updated At',
    filteredCount: 'Filtered Results',
    searchPlaceholder: 'Search title, category, format, audience, tags, or notes',
    emptyValue: 'Not filled',
    expand: 'Expand details',
    collapse: 'Collapse details',
    loadMore: 'Load more',
    empty: 'No teaching materials match the current filters.',
    showing: 'Showing',
    of: ' of ',
    teachingCategory: 'Teaching Category',
    format: 'Format',
    subTopic: 'Subtopic',
    targetAudience: 'Audience',
    durationMinutes: 'Duration',
    difficulty: 'Difficulty',
    status: 'Status',
    language: 'Language',
    tags: 'Tags',
    note: 'Notes',
    fileUrl: 'File Link',
    usageCount: 'Usage Count',
    referenceCount: 'References',
    inspirationCount: 'Source Inspirations',
    derivedContentCount: 'Derived Content',
    createdAt: 'Created At',
    openFile: 'Open file',
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
    updatedAt: '최종 수정일',
    filteredCount: '현재 필터 결과',
    searchPlaceholder: '제목, 분류, 형식, 대상, 태그 또는 메모 검색',
    emptyValue: '미입력',
    expand: '자세히 보기',
    collapse: '접기',
    loadMore: '더 보기',
    empty: '현재 필터와 일치하는 수업 자료가 없다.',
    showing: '표시 중',
    of: ' / ',
    teachingCategory: '수업 분류',
    format: '형식',
    subTopic: '하위 주제',
    targetAudience: '대상',
    durationMinutes: '강의 가능 시간',
    difficulty: '난이도',
    status: '상태',
    language: '언어',
    tags: '태그',
    note: '메모',
    fileUrl: '파일 링크',
    usageCount: '사용 횟수',
    referenceCount: '참고 문헌',
    inspirationCount: '원천 영감',
    derivedContentCount: '파생 콘텐츠',
    createdAt: '생성일',
    openFile: '파일 열기',
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

const TEACHING_CATEGORY_FILTERS = [
  { value: 'all', label: { zh: '全部', en: 'All', ko: '전체' }, matches: [] },
  { value: 'ai', label: { zh: 'AI', en: 'AI', ko: 'AI' }, matches: ['AI'] },
  { value: 'business', label: { zh: '商業', en: 'Business', ko: '비즈니스' }, matches: ['商業', 'Business', '비즈니스'] },
  { value: 'psychology', label: { zh: '心理', en: 'Psychology', ko: '심리' }, matches: ['心理', 'Psychology', '심리'] },
  { value: 'education', label: { zh: '教育', en: 'Education', ko: '교육' }, matches: ['教育', 'Education', '교육'] },
  { value: 'cross-domain', label: { zh: '跨域', en: 'Cross-disciplinary', ko: '융합' }, matches: ['跨域', 'Cross-disciplinary', 'Cross Domain', '융합'] },
];

const TEACHING_FORMAT_FILTERS = [
  { value: 'all', label: { zh: '全部形式', en: 'All Formats', ko: '전체 형식' }, matches: [] },
  { value: 'ppt', label: { zh: 'PPT', en: 'PPT', ko: 'PPT' }, matches: ['PPT'] },
  { value: 'handout', label: { zh: '課堂講義', en: 'Class Handout', ko: '수업 유인물' }, matches: ['課堂講義', 'Class Handout', '강의자료', '수업 유인물'] },
  { value: 'case', label: { zh: '案例', en: 'Case', ko: '사례' }, matches: ['案例', 'Case', '사례'] },
  { value: 'video', label: { zh: '影片', en: 'Video', ko: '영상' }, matches: ['影片', 'Video', '영상'] },
  { value: 'survey', label: { zh: '問卷', en: 'Survey', ko: '설문' }, matches: ['問卷', 'Survey', '설문'] },
  { value: 'workshop', label: { zh: 'Workshop', en: 'Workshop', ko: '워크숍' }, matches: ['Workshop', '工作坊', '워크숍'] },
];

const TEACHING_AUDIENCE_FILTERS = [
  { value: 'all', label: { zh: '全部對象', en: 'All Audiences', ko: '전체 대상' }, matches: [] },
  { value: 'undergraduate', label: { zh: '大學生', en: 'Undergraduates', ko: '대학생' }, matches: ['大學生', 'Undergraduates', 'Undergraduate', '대학생'] },
  { value: 'graduate', label: { zh: '研究生', en: 'Graduate Students', ko: '대학원생' }, matches: ['研究生', 'Graduate Students', 'Graduate Student', '대학원생'] },
  { value: 'chinese-students', label: { zh: '中國學生', en: 'Chinese Students', ko: '중국 학생' }, matches: ['中國學生', 'Chinese Students', '중국 학생'] },
  { value: 'korean-students', label: { zh: '韓國學生', en: 'Korean Students', ko: '한국 학생' }, matches: ['韓國學生', 'Korean Students', '한국 학생'] },
  { value: 'professionals', label: { zh: '在職人員', en: 'Professionals', ko: '재직자' }, matches: ['在職人員', 'Professionals', 'Working Professionals', '재직자'] },
];

const TEACHING_STATUS_FILTERS = [
  { value: 'all', label: { zh: '全部狀態', en: 'All Status', ko: '전체 상태' }, matches: [] },
  { value: 'not-started', label: { zh: '未開始', en: 'Not Started', ko: '시작 전' }, matches: ['未開始', 'Not Started', '시작 전'] },
  { value: 'in-progress', label: { zh: '進行中', en: 'In Progress', ko: '진행 중' }, matches: ['進行中', 'In Progress', '진행 중'] },
  { value: 'complete', label: { zh: '完成', en: 'Complete', ko: '완료' }, matches: ['完成', 'Complete', 'Done', '완료'] },
];

const TEACHING_LANGUAGE_FILTERS = [
  { value: 'all', label: { zh: '全部語言', en: 'All Languages', ko: '전체 언어' }, matches: [] },
  { value: 'zh', label: { zh: '中文', en: 'Chinese', ko: '중국어' }, matches: ['中文', 'Chinese', 'zh', '繁中', '중국어'] },
  { value: 'ko', label: { zh: '韓文', en: 'Korean', ko: '한국어' }, matches: ['韓文', 'Korean', 'ko', '한국어'] },
  { value: 'en', label: { zh: '英文', en: 'English', ko: '영어' }, matches: ['英文', 'English', 'en', '영어'] },
];

const TEACHING_DIFFICULTY_FILTERS = [
  { value: 'all', label: { zh: '全部難度', en: 'All Difficulty', ko: '전체 난이도' }, matches: [] },
  { value: 'beginner', label: { zh: '初級', en: 'Beginner', ko: '초급' }, matches: ['初級', 'Beginner', 'Basic', '초급'] },
  { value: 'intermediate', label: { zh: '中級', en: 'Intermediate', ko: '중급' }, matches: ['中級', 'Intermediate', '중급'] },
  { value: 'advanced', label: { zh: '高級', en: 'Advanced', ko: '고급' }, matches: ['高級', 'Advanced', '고급'] },
];

function getTeachingField(item, field, lang) {
  if (Array.isArray(item[field])) return item[field];
  if (item[field] !== undefined && item[field] !== null && item[field] !== '') return item[field];
  if (field === 'title') return getLocalizedModuleField(item, 'title', lang);
  if (field === 'teachingCategory') return item.teachingCategory || item.courseType || item.category || item.type || '';
  if (field === 'format') return item.format || (item.type ? [item.type] : []);
  if (field === 'subTopic') return item.subTopic || item.topic || item.relatedModule || '';
  if (field === 'targetAudience') return item.targetAudience || (item.audience ? [item.audience] : []);
  if (field === 'note') return item.note || item.summary || getLocalizedModuleField(item, 'description', lang);
  if (field === 'summary') return item.summary || getLocalizedModuleField(item, 'description', lang);
  if (field === 'courseType') return item.courseType || item.type || '';
  if (field === 'topic') return item.topic || item.category || '';
  if (field === 'module') return item.module || item.relatedModule || '';
  if (field === 'materials') return item.materials || getLocalizedModuleField(item, 'description', lang);
  return '';
}

function getTeachingSearchBody(item, lang) {
  return [
    getTeachingField(item, 'title', lang),
    getTeachingField(item, 'teachingCategory', lang),
    getTeachingField(item, 'format', lang),
    getTeachingField(item, 'subTopic', lang),
    getTeachingField(item, 'targetAudience', lang),
    getTeachingField(item, 'difficulty', lang),
    getTeachingField(item, 'status', lang),
    getTeachingField(item, 'language', lang),
    item.tags,
    getTeachingField(item, 'note', lang),
    item.fileUrl,
  ].map(normalizeSearchText).join(' ');
}

function normalizeTeachingComparable(value) {
  return String(value || '').trim().toLowerCase();
}

function toTeachingArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function hasTeachingValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  if (value === 0) return true;
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function formatTeachingValue(value, emptyValue) {
  if (!hasTeachingValue(value)) return emptyValue;
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return String(value);
}

function doesTeachingMatchFilter(item, filter, field, mode = 'equals') {
  if (filter.value === 'all') return true;
  const needles = filter.matches.map(normalizeTeachingComparable);
  const rawValue = getTeachingField(item, field, 'zh');

  if (mode === 'includes') {
    const values = toTeachingArray(rawValue).map(normalizeTeachingComparable);
    return needles.some((match) => values.includes(match));
  }

  const value = normalizeTeachingComparable(rawValue);
  return needles.some((match) => value === match);
}

function TeachingFieldValue({ label, value, emptyValue }) {
  return (
    <div className="teaching-display-field">
      <span>{label}</span>
      <p>{formatTeachingValue(value, emptyValue)}</p>
    </div>
  );
}

function TeachingFileField({ label, value, emptyValue, openLabel }) {
  return (
    <div className="teaching-display-field">
      <span>{label}</span>
      <p>
        {hasTeachingValue(value) ? (
          <a className="teaching-inline-link" href={value} target="_blank" rel="noreferrer">
            {openLabel}
          </a>
        ) : emptyValue}
      </p>
    </div>
  );
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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const resultsRef = useRef(null);
  const items = useMemo(() => moduleState.items || [], [moduleState.items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const activeCategory = TEACHING_CATEGORY_FILTERS.find((filter) => filter.value === categoryFilter) || TEACHING_CATEGORY_FILTERS[0];
    const activeFormat = TEACHING_FORMAT_FILTERS.find((filter) => filter.value === formatFilter) || TEACHING_FORMAT_FILTERS[0];
    const activeAudience = TEACHING_AUDIENCE_FILTERS.find((filter) => filter.value === audienceFilter) || TEACHING_AUDIENCE_FILTERS[0];
    const activeStatus = TEACHING_STATUS_FILTERS.find((filter) => filter.value === statusFilter) || TEACHING_STATUS_FILTERS[0];
    const activeLanguage = TEACHING_LANGUAGE_FILTERS.find((filter) => filter.value === languageFilter) || TEACHING_LANGUAGE_FILTERS[0];
    const activeDifficulty = TEACHING_DIFFICULTY_FILTERS.find((filter) => filter.value === difficultyFilter) || TEACHING_DIFFICULTY_FILTERS[0];

    return items.filter((teachingItem) => {
      const matchesSearch = !normalizedQuery || getTeachingSearchBody(teachingItem, lang).includes(normalizedQuery);
      return matchesSearch
        && doesTeachingMatchFilter(teachingItem, activeCategory, 'teachingCategory')
        && doesTeachingMatchFilter(teachingItem, activeFormat, 'format', 'includes')
        && doesTeachingMatchFilter(teachingItem, activeAudience, 'targetAudience', 'includes')
        && doesTeachingMatchFilter(teachingItem, activeStatus, 'status')
        && doesTeachingMatchFilter(teachingItem, activeLanguage, 'language', 'includes')
        && doesTeachingMatchFilter(teachingItem, activeDifficulty, 'difficulty');
    });
  }, [audienceFilter, categoryFilter, difficultyFilter, formatFilter, items, lang, languageFilter, searchQuery, statusFilter]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const latestUpdatedAt = getLatestModuleUpdate(moduleState);

  function resetVisibleCount() {
    setVisibleCount(10);
  }

  function updateSearchQuery(value) {
    setSearchQuery(value);
    resetVisibleCount();
  }

  function updateCategoryFilter(value) {
    setCategoryFilter(value);
    resetVisibleCount();
  }

  function updateFormatFilter(value) {
    setFormatFilter(value);
    resetVisibleCount();
  }

  function updateAudienceFilter(value) {
    setAudienceFilter(value);
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

  function updateDifficultyFilter(value) {
    setDifficultyFilter(value);
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
    if (event.key === 'Enter' && searchQuery.trim()) {
      scrollResultsIntoView(resultsRef);
    }
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
          onKeyDown={handleSearchKeyDown}
          placeholder={ui.searchPlaceholder}
          aria-label={ui.searchPlaceholder}
        />
      </section>

      <section className="teaching-filter-panel" aria-label={ui.teachingCategory}>
        <TeachingFilterGroup
          label={ui.teachingCategory}
          filters={TEACHING_CATEGORY_FILTERS}
          activeValue={categoryFilter}
          onSelect={updateCategoryFilter}
          lang={lang}
        />
        <TeachingFilterGroup
          label={ui.format}
          filters={TEACHING_FORMAT_FILTERS}
          activeValue={formatFilter}
          onSelect={updateFormatFilter}
          lang={lang}
        />
        <TeachingFilterGroup
          label={ui.targetAudience}
          filters={TEACHING_AUDIENCE_FILTERS}
          activeValue={audienceFilter}
          onSelect={updateAudienceFilter}
          lang={lang}
        />
        <TeachingFilterGroup
          label={ui.status}
          filters={TEACHING_STATUS_FILTERS}
          activeValue={statusFilter}
          onSelect={updateStatusFilter}
          lang={lang}
        />
        <TeachingFilterGroup
          label={ui.language}
          filters={TEACHING_LANGUAGE_FILTERS}
          activeValue={languageFilter}
          onSelect={updateLanguageFilter}
          lang={lang}
        />
        <TeachingFilterGroup
          label={ui.difficulty}
          filters={TEACHING_DIFFICULTY_FILTERS}
          activeValue={difficultyFilter}
          onSelect={updateDifficultyFilter}
          lang={lang}
        />
      </section>

      <section ref={resultsRef} className="teaching-compact-list" aria-label={moduleKey}>
        {visibleItems.map((teachingItem) => {
          const title = getTeachingField(teachingItem, 'title', lang) || 'Untitled Teaching Material';
          const category = getTeachingField(teachingItem, 'teachingCategory', lang);
          const format = getTeachingField(teachingItem, 'format', lang);
          const subTopic = getTeachingField(teachingItem, 'subTopic', lang);
          const targetAudience = getTeachingField(teachingItem, 'targetAudience', lang);
          const status = getTeachingField(teachingItem, 'status', lang);
          const difficulty = getTeachingField(teachingItem, 'difficulty', lang);
          const language = getTeachingField(teachingItem, 'language', lang);
          const tags = toTeachingArray(getTeachingField(teachingItem, 'tags', lang));
          const note = getTeachingField(teachingItem, 'note', lang);
          const isExpanded = expandedIds.has(teachingItem.id);

          return (
            <article key={teachingItem.id} className="teaching-compact-card">
              <div className="teaching-compact-main">
                <div>
                  <div className="module-data-card-top teaching-compact-top">
                    {hasTeachingValue(category) ? <span className="content-tag">{formatTeachingValue(category, ui.emptyValue)}</span> : null}
                    {hasTeachingValue(status) ? <span className="module-data-status">{formatTeachingValue(status, ui.emptyValue)}</span> : null}
                  </div>
                  <h2>{title}</h2>
                  <p className="teaching-meta-line">{formatTeachingValue(subTopic, ui.emptyValue)}</p>
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

              <div className="teaching-field-grid">
                <TeachingFieldValue label={ui.teachingCategory} value={category} emptyValue={ui.emptyValue} />
                <TeachingFieldValue label={ui.format} value={format} emptyValue={ui.emptyValue} />
                <TeachingFieldValue label={ui.subTopic} value={subTopic} emptyValue={ui.emptyValue} />
                <TeachingFieldValue label={ui.targetAudience} value={targetAudience} emptyValue={ui.emptyValue} />
                <TeachingFieldValue label={ui.status} value={status} emptyValue={ui.emptyValue} />
                <TeachingFieldValue label={ui.difficulty} value={difficulty} emptyValue={ui.emptyValue} />
                <TeachingFieldValue label={ui.language} value={language} emptyValue={ui.emptyValue} />
              </div>

              <div className="teaching-tag-section">
                <span>{ui.tags}</span>
                <div className="teaching-tag-row">
                  {tags.length
                    ? tags.map((tag) => <span key={tag}>{tag}</span>)
                    : <span>{ui.emptyValue}</span>}
                </div>
              </div>

              <p className="teaching-card-summary">{formatTeachingValue(note, ui.emptyValue)}</p>

              {isExpanded && (
                <div className="teaching-detail-panel">
                  <div className="teaching-detail-grid">
                    <TeachingFieldValue label={ui.durationMinutes} value={teachingItem.durationMinutes} emptyValue={ui.emptyValue} />
                    <TeachingFieldValue label={ui.usageCount} value={teachingItem.usageCount} emptyValue={ui.emptyValue} />
                    <TeachingFileField label={ui.fileUrl} value={teachingItem.fileUrl} emptyValue={ui.emptyValue} openLabel={ui.openFile} />
                    <TeachingFieldValue label={ui.referenceCount} value={teachingItem.referenceCount} emptyValue={ui.emptyValue} />
                    <TeachingFieldValue label={ui.inspirationCount} value={teachingItem.inspirationCount} emptyValue={ui.emptyValue} />
                    <TeachingFieldValue label={ui.derivedContentCount} value={teachingItem.derivedContentCount} emptyValue={ui.emptyValue} />
                    <TeachingFieldValue label={ui.createdAt} value={teachingItem.createdAt} emptyValue={ui.emptyValue} />
                    <TeachingFieldValue label={ui.updatedAt} value={teachingItem.updatedAt} emptyValue={ui.emptyValue} />
                  </div>
                  <div className="teaching-full-note">
                    <span>{ui.note}</span>
                    <p>{formatTeachingValue(note, ui.emptyValue)}</p>
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
