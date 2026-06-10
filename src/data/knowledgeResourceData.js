export const FALLBACK_KNOWLEDGE_RESOURCES = [
  {
    id: 'ai-tutor-personalization',
    titleZh: 'AI Tutor Personalization',
    titleKo: 'AI Tutor Personalization',
    titleEn: 'AI Tutor Personalization',
    type: 'concept',
    category: 'AI Education',
    tags: ['AI Tutor', 'Personalization', 'Adaptive Feedback'],
    relatedModule: 'Research / MVP',
    summaryZh: '整理 AI Tutor 如何依照學習者程度、任務目標與學習偏好提供分層提示與個人化回饋。',
    summaryKo: 'AI 튜터가 학습자 수준, 과제 목표, 학습 선호에 따라 계층형 힌트와 개인화 피드백을 제공하는 방식을 정리한다.',
    summaryEn: 'Organizes how AI tutors provide layered hints and personalized feedback based on learner level, task goals, and preferences.',
    sourceType: 'fallback-knowledge',
    sourceUrl: '/api/knowledge/resources',
    status: 'fallback-ready',
    updatedAt: '2026-06-02',
  },
  {
    id: 'tam-and-ai-education',
    titleZh: 'TAM and AI Education',
    titleKo: 'TAM and AI Education',
    titleEn: 'TAM and AI Education',
    type: 'literature_note',
    category: 'Theory Model',
    tags: ['TAM', 'AI Education', 'Acceptance'],
    relatedModule: 'Research',
    summaryZh: '記錄 TAM 如何用於 AI 教育研究中的感知有用性、感知易用性、態度與使用意圖設計。',
    summaryKo: 'TAM이 AI 교육 연구에서 지각된 유용성, 사용 용이성, 태도, 사용 의도 설계에 어떻게 활용되는지 기록한다.',
    summaryEn: 'Records how TAM supports perceived usefulness, ease of use, attitude, and intention constructs in AI education research.',
    sourceType: 'fallback-knowledge',
    sourceUrl: '/api/knowledge/resources',
    status: 'fallback-ready',
    updatedAt: '2026-06-02',
  },
  {
    id: 'self-regulated-learning-notes',
    titleZh: 'Self-Regulated Learning Notes',
    titleKo: 'Self-Regulated Learning Notes',
    titleEn: 'Self-Regulated Learning Notes',
    type: 'literature_note',
    category: 'Learning Theory',
    tags: ['SRL', 'Learner Autonomy', 'Reflection'],
    relatedModule: 'Research / Teaching',
    summaryZh: '保存自我調節學習的目標設定、策略選擇、進度監控、行為調整與反思構面。',
    summaryKo: '자기조절학습의 목표 설정, 전략 선택, 진행 점검, 행동 조정, 성찰 구성 요소를 보존한다.',
    summaryEn: 'Preserves SRL constructs including goal setting, strategy choice, monitoring, behavior adjustment, and reflection.',
    sourceType: 'fallback-knowledge',
    sourceUrl: '/api/knowledge/resources',
    status: 'fallback-ready',
    updatedAt: '2026-06-02',
  },
  {
    id: 'prompt-engineering-teaching-template',
    titleZh: 'Prompt Engineering Teaching Template',
    titleKo: 'Prompt Engineering Teaching Template',
    titleEn: 'Prompt Engineering Teaching Template',
    type: 'prompt_template',
    category: 'Teaching Material',
    tags: ['Prompt Engineering', 'Template', 'Classroom Task'],
    relatedModule: 'Teaching',
    summaryZh: '作為課堂示範、Prompt 改寫、輸出格式控制與 AI 回答驗證的教學模板。',
    summaryKo: '수업 시연, Prompt 수정, 출력 형식 제어, AI 답변 검증을 위한 교육 템플릿이다.',
    summaryEn: 'A teaching template for classroom demos, prompt revision, output-format control, and AI answer verification.',
    sourceType: 'fallback-knowledge',
    sourceUrl: '/api/knowledge/resources',
    status: 'fallback-ready',
    updatedAt: '2026-06-02',
  },
  {
    id: 'vark-learning-preference-summary',
    titleZh: 'VARK Learning Preference Summary',
    titleKo: 'VARK Learning Preference Summary',
    titleEn: 'VARK Learning Preference Summary',
    type: 'concept',
    category: 'Learning Preference',
    tags: ['VARK', 'Learning Path', 'Personalization'],
    relatedModule: 'Research / Teaching',
    summaryZh: '摘要視覺、聽覺、閱讀書寫與操作體驗偏好，支援 AI 學習路徑設計。',
    summaryKo: '시각, 청각, 읽기/쓰기, 체험 중심 선호를 요약하여 AI 학습 경로 설계를 지원한다.',
    summaryEn: 'Summarizes visual, aural, read/write, and kinesthetic preferences for AI learning-path design.',
    sourceType: 'fallback-knowledge',
    sourceUrl: '/api/knowledge/resources',
    status: 'fallback-ready',
    updatedAt: '2026-06-02',
  },
  {
    id: 'campus-pet-learning-system-note',
    titleZh: 'Campus Pet Learning System Note',
    titleKo: 'Campus Pet Learning System Note',
    titleEn: 'Campus Pet Learning System Note',
    type: 'mvp_note',
    category: 'MVP Note',
    tags: ['Campus Pet', 'Language Learning', 'Student Support'],
    relatedModule: 'NexAeon Modules / Action Center',
    summaryZh: '記錄 Campus Pet Learning System 的語言練習、校園任務、陪伴式回饋與學生支援構想。',
    summaryKo: 'Campus Pet Learning System의 언어 연습, 캠퍼스 과제, 동반형 피드백, 학생 지원 구상을 기록한다.',
    summaryEn: 'Records the Campus Pet Learning System concept for language practice, campus tasks, companion feedback, and student support.',
    sourceType: 'fallback-knowledge',
    sourceUrl: '/api/knowledge/resources',
    status: 'fallback-ready',
    updatedAt: '2026-06-02',
  },
];

export const KNOWLEDGE_RESOURCE_UI = {
  zh: {
    title: 'Knowledge Lab｜第二大腦',
    subtitle: '將 Joey 的研究文獻、課程素材、Prompt 模板與 MVP 筆記整理成可檢索、可轉化、可持續成長的知識系統。',
    type: '類型',
    category: '分類',
    tags: '標籤',
    relatedModule: '關聯模組',
    summary: '摘要',
    status: '狀態',
    sourceType: '資料來源',
    updatedAt: '更新時間',
    filters: {
      all: '全部',
      literature_note: '文獻筆記',
      concept: '概念',
      prompt_template: 'Prompt 模板',
      course_material: '課程素材',
      mvp_note: 'MVP 筆記',
    },
  },
  ko: {
    title: 'Knowledge Lab｜제2의 두뇌',
    subtitle: 'Joey의 연구 문헌, 수업 자료, 프롬프트 템플릿, MVP 노트를 검색 가능하고 전환 가능하며 지속적으로 성장하는 지식 시스템으로 정리한다.',
    type: '유형',
    category: '분류',
    tags: '태그',
    relatedModule: '연관 모듈',
    summary: '요약',
    status: '상태',
    sourceType: '데이터 출처',
    updatedAt: '업데이트 시간',
    filters: {
      all: '전체',
      literature_note: '문헌 노트',
      concept: '개념',
      prompt_template: '프롬프트 템플릿',
      course_material: '수업 자료',
      mvp_note: 'MVP 노트',
    },
  },
  en: {
    title: 'Knowledge Lab｜Second Brain',
    subtitle: 'Organizing Joey’s literature notes, course materials, prompt templates, and MVP records into a searchable, reusable, and evolving knowledge system.',
    type: 'Type',
    category: 'Category',
    tags: 'Tags',
    relatedModule: 'Related Module',
    summary: 'Summary',
    status: 'Status',
    sourceType: 'Data Source',
    updatedAt: 'Updated At',
    filters: {
      all: 'All',
      literature_note: 'Literature Notes',
      concept: 'Concepts',
      prompt_template: 'Prompt Templates',
      course_material: 'Course Materials',
      mvp_note: 'MVP Notes',
    },
  },
};

export const KNOWLEDGE_RESOURCE_STATUS_TEXT = {
  notion: {
    sourceZh: '資料來源：Notion Knowledge Lab',
    sourceKo: '데이터 출처: Notion Knowledge Lab',
    sourceEn: 'Data Source: Notion Knowledge Lab',
    connectionZh: '連接狀態：已連接真實知識庫資料',
    connectionKo: '연결 상태: 실제 지식 데이터베이스 연결 완료',
    connectionEn: 'Connection Status: Live knowledge data source connected',
  },
  fallback: {
    sourceZh: '資料來源：Fallback Knowledge Data',
    sourceKo: '데이터 출처: Fallback Knowledge Data',
    sourceEn: 'Data Source: Fallback Knowledge Data',
    connectionZh: '連接狀態：尚未連接 Notion，正在使用本地備用知識資料',
    connectionKo: '연결 상태: Notion 미연결, 로컬 예비 지식 데이터 사용 중',
    connectionEn: 'Connection Status: Notion not connected, using local backup knowledge data',
  },
};

export const KNOWLEDGE_FILTERS = ['all', 'literature_note', 'concept', 'prompt_template', 'course_material', 'mvp_note'];

export function getKnowledgeSummary(item, lang = 'zh') {
  if (item.summary) return item.summary;
  if (lang === 'ko') return item.summaryKo;
  if (lang === 'en') return item.summaryEn;
  return item.summaryZh;
}

export function getKnowledgeTitle(item, lang = 'zh') {
  if (item.title) return item.title;
  if (lang === 'ko') return item.titleKo;
  if (lang === 'en') return item.titleEn;
  return item.titleZh;
}

export function getKnowledgeStatusText(source = 'fallback', lang = 'zh') {
  const status = KNOWLEDGE_RESOURCE_STATUS_TEXT[source] || KNOWLEDGE_RESOURCE_STATUS_TEXT.fallback;
  const suffix = lang === 'ko' ? 'Ko' : lang === 'en' ? 'En' : 'Zh';

  return {
    source: status[`source${suffix}`],
    connection: status[`connection${suffix}`],
  };
}

function normalizeFallbackKnowledgeResource(item) {
  const title = item.titleZh || item.titleEn || item.titleKo || 'Untitled Knowledge Resource';
  const summary = item.summaryZh || item.summaryEn || item.summaryKo || '';

  return {
    ...item,
    sourceDatabase: 'fallback',
    sourceType: item.sourceType || 'fallback-knowledge',
    title,
    category: item.category || '',
    type: item.type || '',
    status: item.status || 'fallback-ready',
    language: '',
    tags: item.tags || [],
    summary,
    relatedModule: item.relatedModule || '',
    primaryMeta: item.relatedModule || '',
    secondaryMeta: item.category || '',
    url: item.sourceUrl || '/api/knowledge/resources',
    fileUrl: '',
    createdAt: '',
    updatedAt: item.updatedAt || '',
  };
}

function createFallbackKnowledgeMeta(meta) {
  return meta || {
    sources: {
      research: { status: 'missing_env', count: 0 },
      teaching: { status: 'missing_env', count: 0 },
      inspiration: { status: 'missing_env', count: 0 },
      brand: { status: 'missing_env', count: 0 },
    },
    warnings: [],
  };
}

export function createFallbackKnowledgeResponse(reason = 'notion_not_connected', meta) {
  const items = FALLBACK_KNOWLEDGE_RESOURCES.map(normalizeFallbackKnowledgeResource);

  return {
    source: 'fallback',
    reason,
    count: items.length,
    updatedAt: new Date().toISOString(),
    meta: createFallbackKnowledgeMeta(meta),
    items,
    data: items,
  };
}
