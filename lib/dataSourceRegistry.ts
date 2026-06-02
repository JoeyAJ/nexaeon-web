declare const process: {
  env?: Record<string, string | undefined>;
};

export type DataSourceReadinessStatus =
  | 'fallback-ready'
  | 'backend-not-connected'
  | 'waiting-for-env'
  | 'ready-for-integration'
  | 'connected';

export type DataSourceStatus = {
  id: string;
  moduleKey: string;
  moduleTitleZh: string;
  moduleTitleEn: string;
  moduleTitleKo: string;
  currentApiRoute: string | string[];
  currentSourceType: string;
  plannedBackend: string;
  plannedBackendZh: string;
  plannedBackendEn: string;
  plannedBackendKo: string;
  requiredEnvKeys: string[];
  configuredEnvKeys: string[];
  missingEnvKeys: string[];
  requiredFields: string[];
  missingFields: string[];
  readinessStatus: DataSourceReadinessStatus;
  fallbackAvailable: boolean;
  updatedAt: string;
};

type DataSourceRegistryItem = Omit<
  DataSourceStatus,
  'configuredEnvKeys' | 'missingEnvKeys' | 'missingFields' | 'readinessStatus' | 'fallbackAvailable' | 'updatedAt'
>;

export const dataSourceRegistry: DataSourceRegistryItem[] = [
  {
    id: 'identity',
    moduleKey: 'identity',
    moduleTitleZh: '身份導航',
    moduleTitleEn: 'Identity',
    moduleTitleKo: '정체성',
    currentApiRoute: '/api/identity/profile',
    currentSourceType: 'local-fallback-api',
    plannedBackend: 'Notion Brand / Identity Database',
    plannedBackendZh: 'Notion 品牌與身份資料庫',
    plannedBackendEn: 'Notion Brand / Identity Database',
    plannedBackendKo: 'Notion 브랜드 및 정체성 데이터베이스',
    requiredEnvKeys: ['NOTION_API_KEY', 'NOTION_IDENTITY_DATABASE_ID'],
    requiredFields: ['profileTitle', 'researchIdentity', 'knowledgeSystem', 'summary', 'updatedAt'],
  },
  {
    id: 'research',
    moduleKey: 'research',
    moduleTitleZh: '研究地圖',
    moduleTitleEn: 'Research Map',
    moduleTitleKo: '연구 지도',
    currentApiRoute: ['/api/research/literature', '/api/research/models'],
    currentSourceType: 'local-fallback-api',
    plannedBackend: 'Notion Research Literature Database',
    plannedBackendZh: 'Notion 研究文獻資料庫',
    plannedBackendEn: 'Notion Research Literature Database',
    plannedBackendKo: 'Notion 연구 문헌 데이터베이스',
    requiredEnvKeys: ['NOTION_API_KEY', 'NOTION_RESEARCH_DATABASE_ID'],
    requiredFields: ['title', 'author', 'source', 'theoryModel', 'citation', 'status', 'updatedAt'],
  },
  {
    id: 'learning-coaching',
    moduleKey: 'teaching',
    moduleTitleZh: '學習教練',
    moduleTitleEn: 'Learning Coaching',
    moduleTitleKo: '학습 코칭',
    currentApiRoute: '/api/teaching/courses',
    currentSourceType: 'local-fallback-api',
    plannedBackend: 'Notion Teaching Materials Database',
    plannedBackendZh: 'Notion 學習教練與課程素材資料庫',
    plannedBackendEn: 'Notion Teaching Materials Database',
    plannedBackendKo: 'Notion 학습 코칭 및 수업 자료 데이터베이스',
    requiredEnvKeys: ['NOTION_API_KEY', 'NOTION_TEACHING_DATABASE_ID'],
    requiredFields: ['courseTitle', 'learningTask', 'reflectionFlow', 'aiCollaboration', 'materials', 'updatedAt'],
  },
  {
    id: 'knowledge-system',
    moduleKey: 'knowledge',
    moduleTitleZh: '知識系統',
    moduleTitleEn: 'Knowledge System',
    moduleTitleKo: '지식 시스템',
    currentApiRoute: '/api/knowledge/resources',
    currentSourceType: 'local-fallback-api',
    plannedBackend: 'Notion Knowledge / Inspiration / Literature Databases',
    plannedBackendZh: 'Notion 知識、靈感與文獻資料庫',
    plannedBackendEn: 'Notion Knowledge / Inspiration / Literature Databases',
    plannedBackendKo: 'Notion 지식, 영감, 문헌 데이터베이스',
    requiredEnvKeys: [
      'NOTION_API_KEY',
      'NOTION_KNOWLEDGE_DATABASE_ID',
      'NOTION_INSPIRATION_DATABASE_ID',
      'NOTION_RESEARCH_DATABASE_ID',
    ],
    requiredFields: ['title', 'category', 'source', 'relatedModule', 'summary', 'tags', 'updatedAt'],
  },
  {
    id: 'practice-projects',
    moduleKey: 'modules',
    moduleTitleZh: '實踐項目',
    moduleTitleEn: 'Practice Projects',
    moduleTitleKo: '실천 프로젝트',
    currentApiRoute: '/api/modules/demos',
    currentSourceType: 'local-fallback-api',
    plannedBackend: 'Airtable or Notion MVP Projects Database',
    plannedBackendZh: 'Airtable 或 Notion MVP 項目資料庫',
    plannedBackendEn: 'Airtable or Notion MVP Projects Database',
    plannedBackendKo: 'Airtable 또는 Notion MVP 프로젝트 데이터베이스',
    requiredEnvKeys: ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID', 'AIRTABLE_MODULES_TABLE_ID'],
    requiredFields: ['projectName', 'problem', 'solution', 'techStack', 'status', 'nextStep', 'updatedAt'],
  },
  {
    id: 'field-experiment',
    moduleKey: 'action',
    moduleTitleZh: '現場實驗',
    moduleTitleEn: 'Field Experiment',
    moduleTitleKo: '현장 실험',
    currentApiRoute: '/api/action/projects',
    currentSourceType: 'local-fallback-api',
    plannedBackend: 'Airtable Project / Action Center Database',
    plannedBackendZh: 'Airtable 項目與 Action Center 資料庫',
    plannedBackendEn: 'Airtable Project / Action Center Database',
    plannedBackendKo: 'Airtable 프로젝트 및 Action Center 데이터베이스',
    requiredEnvKeys: ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID', 'AIRTABLE_PROJECTS_TABLE_ID'],
    requiredFields: ['actionTitle', 'context', 'stakeholder', 'practiceFocus', 'evidence', 'updatedAt'],
  },
];

export function checkEnvStatus(requiredEnvKeys: string[] = [], env = process.env || {}) {
  const configuredEnvKeys = requiredEnvKeys.filter((key) => Boolean(env[key]));
  const missingEnvKeys = requiredEnvKeys.filter((key) => !env[key]);
  const envStatus = requiredEnvKeys.reduce<Record<string, boolean>>((status, key) => {
    status[key] = Boolean(env[key]);
    return status;
  }, {});

  return {
    configuredEnvKeys,
    missingEnvKeys,
    envStatus,
  };
}

export function getDataSourceStatuses(env = process.env || {}): DataSourceStatus[] {
  const updatedAt = new Date().toISOString();

  return dataSourceRegistry.map((source) => {
    const envStatus = checkEnvStatus(source.requiredEnvKeys, env);

    return {
      ...source,
      configuredEnvKeys: envStatus.configuredEnvKeys,
      missingEnvKeys: envStatus.missingEnvKeys,
      missingFields: source.requiredFields,
      readinessStatus: 'backend-not-connected',
      fallbackAvailable: true,
      updatedAt,
    };
  });
}
