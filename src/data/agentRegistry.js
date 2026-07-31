export const AGENT_STATUS = Object.freeze({
  active: 'active',
  scaffold: 'scaffold',
  comingSoon: 'coming_soon',
  hidden: 'hidden',
});

export const COMMON_PROHIBITED_CAPABILITIES = Object.freeze([
  'web_search',
  'write_actions',
  'save_chat_history',
  'private_data_access',
  'email_access',
  'calendar_access',
  'file_access',
  'notion_write',
  'airtable_write',
]);

export const NAVIGATOR_ALLOWED_CAPABILITIES = Object.freeze([
  'public_knowledge_retrieval',
  'grounded_answer',
  'citations',
  'suggested_questions',
  'localization',
]);

export const EXPLORER_ALLOWED_CAPABILITIES = Object.freeze([
  'public_research_search',
  'public_research_item_retrieval',
  'public_research_filtering',
  'public_research_topic_listing',
  'grounded_research_analysis',
  'citations',
  'localization',
]);

export const EXPLORER_TOOL_ALLOWLIST = Object.freeze([
  'searchResearchItems',
  'getResearchItem',
  'filterResearchItems',
  'listResearchTopics',
]);

export const XCHANGE_ALLOWED_CAPABILITIES = Object.freeze([
  'public_learning_material_search',
  'public_learning_material_retrieval',
  'public_learning_material_filtering',
  'public_learning_topic_listing',
  'public_course_structure_listing',
  'course_and_activity_design',
  'personalized_learning_coaching',
  'citations',
  'localization',
]);

export const XCHANGE_TOOL_ALLOWLIST = Object.freeze([
  'searchLearningMaterials',
  'getLearningMaterial',
  'filterLearningMaterials',
  'listLearningTopics',
  'listCourseStructures',
]);

export const ARCHIVIST_ALLOWED_CAPABILITIES = Object.freeze([
  'public_knowledge_search',
  'public_knowledge_item_retrieval',
  'public_knowledge_filtering',
  'public_knowledge_topic_listing',
  'knowledge_relationship_analysis',
  'knowledge_theme_grouping',
  'concept_map_structure',
  'citations',
  'localization',
]);

export const ARCHIVIST_TOOL_ALLOWLIST = Object.freeze([
  'searchKnowledgeItems',
  'getKnowledgeItem',
  'filterKnowledgeItems',
  'listKnowledgeTopics',
  'findRelatedKnowledge',
  'groupKnowledgeByTheme',
]);

export const ENGINEER_ALLOWED_CAPABILITIES = Object.freeze([
  'public_prototype_search',
  'public_prototype_item_retrieval',
  'public_prototype_filtering',
  'public_prototype_topic_listing',
  'public_prototype_status_listing',
  'prototype_comparison',
  'validated_prototype_links',
  'technical_fact_classification',
  'planned_development_specification',
  'citations',
  'localization',
]);

export const ENGINEER_TOOL_ALLOWLIST = Object.freeze([
  'searchPrototypeItems',
  'getPrototypeItem',
  'filterPrototypeItems',
  'listPrototypeTopics',
  'listPrototypeStatuses',
  'comparePrototypeItems',
  'getPrototypeLinks',
]);

export const SCAFFOLD_ALLOWED_CAPABILITIES = Object.freeze([
  'public_profile_display',
  'route_scaffold',
  'coming_soon_content',
]);

export const SCAFFOLD_PROHIBITED_CAPABILITIES = Object.freeze([
  ...COMMON_PROHIBITED_CAPABILITIES,
  'ai_chat',
  'openai_call',
  'responses_api',
  'moderation_call',
]);

export const AGENT_ACTION_CHAIN = Object.freeze({
  en: 'Navigate knowledge. Explore research. Xchange learning. Archive insight. Engineer prototypes. Orchestrate action. Network the future.',
  zh: '導航知識，探索研究，共學成長，典藏洞見，打造原型，協同行動，連結未來。',
  ko: '지식을 안내하고, 연구를 탐색하며, 배움을 나누고, 통찰을 축적하고, 프로토타입을 설계하며, 행동을 조율하고, 미래를 연결합니다.',
});

export const AGENT_LANDING_COPY = Object.freeze({
  zh: {
    eyebrow: 'NexAeon Agent System',
    title: 'NexAeon Agent System Map',
    intro: '這裡是七個 Agent 的全局總覽；各 Agent 也會出現在對應的網站模塊中。',
    active: 'Active',
    scaffold: 'Scaffold',
    comingSoon: 'Coming Soon',
    open: '進入',
  },
  ko: {
    eyebrow: 'NexAeon Agent System',
    title: 'NexAeon Agent System Map',
    intro: '이 영역은 일곱 Agent의 전체 지도를 보여주며, 각 Agent는 연결된 웹사이트 모듈 안에서도 표시됩니다.',
    active: 'Active',
    scaffold: 'Scaffold',
    comingSoon: 'Coming Soon',
    open: '열기',
  },
  en: {
    eyebrow: 'NexAeon Agent System',
    title: 'NexAeon Agent System Map',
    intro: 'This is the global overview for seven agents. Each agent also appears inside its aligned website module.',
    active: 'Active',
    scaffold: 'Scaffold',
    comingSoon: 'Coming Soon',
    open: 'Open',
  },
});

export const AGENT_SCAFFOLD_COPY = Object.freeze({
  zh: {
    statusLabel: '目前狀態',
    moduleLabel: '對應模組',
    futureTitle: '未來能力方向',
    policyTitle: '目前安全邊界',
    navigatorTitle: '目前可先使用',
    navigatorBody: 'NexAeon Navigator 已啟用公開知識問答，能根據網站公開來源整理回答與 citation cards。',
    openNavigator: '開啟 NexAeon Navigator',
    backHome: '返回首頁',
    backPrevious: '返回上一層',
    scaffoldStatus: 'Scaffold / Coming Soon',
    noChat: '此 Agent 目前不提供聊天、寫入、私人資料讀取或外部搜尋。',
  },
  ko: {
    statusLabel: '현재 상태',
    moduleLabel: '연결 모듈',
    futureTitle: '향후 능력 방향',
    policyTitle: '현재 안전 경계',
    navigatorTitle: '지금 사용할 수 있는 Agent',
    navigatorBody: 'NexAeon Navigator는 공개 지식 답변을 제공하며, 공개 출처를 바탕으로 답변과 citation card를 정리합니다.',
    openNavigator: 'NexAeon Navigator 열기',
    backHome: '홈으로',
    backPrevious: '뒤로',
    scaffoldStatus: 'Scaffold / Coming Soon',
    noChat: '이 Agent는 아직 채팅, 쓰기 작업, 개인 데이터 접근, 외부 검색을 제공하지 않습니다.',
  },
  en: {
    statusLabel: 'Current Status',
    moduleLabel: 'Mapped Module',
    futureTitle: 'Future Capability Direction',
    policyTitle: 'Current Safety Boundary',
    navigatorTitle: 'Available Now',
    navigatorBody: 'NexAeon Navigator is active for public knowledge Q&A, grounded in public website sources with citation cards.',
    openNavigator: 'Open NexAeon Navigator',
    backHome: 'Back Home',
    backPrevious: 'Back',
    scaffoldStatus: 'Scaffold / Coming Soon',
    noChat: 'This agent does not provide chat, write actions, private-data access, or external search yet.',
  },
});

export const PUBLIC_AGENT_REGISTRY = Object.freeze([
  {
    key: 'navigator',
    name: 'NexAeon Navigator',
    initial: 'N',
    roleEn: 'Public Knowledge Navigator',
    roleZh: '公開知識導航 Agent',
    roleKo: '공개 지식 내비게이터 Agent',
    subtitle: {
      zh: '公開知識導航 Agent',
      ko: '공개 지식 내비게이터 Agent',
      en: 'Public Knowledge Navigator',
    },
    description: {
      zh: '根據 NexAeon 網站目前公開來源整理回答、citation cards 與後續提問。',
      ko: 'NexAeon 웹사이트의 공개 출처를 바탕으로 답변, citation card, 후속 질문을 정리합니다.',
      en: 'Answers from NexAeon public website sources with citation cards and suggested follow-up questions.',
    },
    futureUse: {
      zh: ['公開知識檢索', '有來源依據的回答', '三語 citation cards', '建議後續問題'],
      ko: ['공개 지식 검색', '근거 기반 답변', '3개 언어 citation card', '후속 질문 제안'],
      en: ['Public knowledge retrieval', 'Grounded answers', 'Localized citation cards', 'Suggested follow-up questions'],
    },
    moduleKey: 'identity',
    moduleLabel: {
      zh: 'Identity｜身份',
      ko: 'Identity｜정체성',
      en: 'Identity',
    },
    status: AGENT_STATUS.active,
    route: '/identity/nexaeon-navigator',
    legacyRoutes: [
      '/identity/nexon-ai-assistant',
      '/identity/nexon-assistant',
      '/identity/nexon',
    ],
    sourceScope: ['identity', 'research', 'teaching', 'knowledge', 'demos', 'action', 'collaboration'],
    enabled: true,
    public: true,
    chatEnabled: true,
    comingSoon: false,
    runtimeMode: 'navigator_ai',
    allowedCapabilities: NAVIGATOR_ALLOWED_CAPABILITIES,
    prohibitedCapabilities: COMMON_PROHIBITED_CAPABILITIES,
    answerLabel: 'NAVIGATOR',
  },
  {
    key: 'explorer',
    name: 'NexAeon Explorer',
    initial: 'E',
    roleEn: 'Research Exploration Agent',
    roleZh: '研究探索 Agent',
    roleKo: '연구 탐색 Agent',
    subtitle: {
      zh: '研究探索 Agent',
      ko: '연구 탐색 Agent',
      en: 'Research Exploration Agent',
    },
    description: {
      zh: '搜尋、整理與分析目前公開的研究資料、文獻脈絡、理論模型、方法、量表與變項。',
      ko: '현재 공개된 연구 자료, 문헌 맥락, 이론 모델, 방법, 척도와 변수를 검색하고 정리하며 분석합니다.',
      en: 'Searches, organizes, and analyzes currently public research records, literature context, theories, methods, scales, and variables.',
    },
    futureUse: {
      zh: ['研究主題探索', '文獻脈絡整理', '理論模型比較', '研究方法路線建議'],
      ko: ['연구 주제 탐색', '문헌 맥락 정리', '이론 모델 비교', '연구 방법 경로 제안'],
      en: ['Research topic exploration', 'Literature context mapping', 'Theory model comparison', 'Method pathway planning'],
    },
    moduleKey: 'research',
    moduleLabel: {
      zh: 'Research｜研究',
      ko: 'Research｜연구',
      en: 'Research',
    },
    status: AGENT_STATUS.active,
    route: '/research/nexaeon-explorer',
    sourceScope: ['research'],
    enabled: true,
    public: true,
    chatEnabled: true,
    comingSoon: false,
    runtimeMode: 'explorer_tools',
    allowedCapabilities: EXPLORER_ALLOWED_CAPABILITIES,
    toolAllowlist: EXPLORER_TOOL_ALLOWLIST,
    prohibitedCapabilities: COMMON_PROHIBITED_CAPABILITIES,
    answerLabel: 'EXPLORER',
  },
  {
    key: 'xchange',
    name: 'NexAeon Xchange',
    initial: 'X',
    roleEn: 'Learning Coaching Agent',
    roleZh: '學習教練 Agent',
    roleKo: '학습 코칭 Agent',
    subtitle: {
      zh: '學習教練 Agent',
      ko: '학습 코칭 Agent',
      en: 'Learning Coaching Agent',
    },
    description: {
      zh: '根據目前公開教學素材，協助設計課程、學習目標、活動、任務、反思流程與個人化學習建議。',
      ko: '현재 공개된 교육 자료를 바탕으로 수업, 학습 목표, 활동, 과제, 성찰 흐름과 개인화 학습 조언을 설계합니다.',
      en: 'Uses currently public teaching materials to design courses, objectives, activities, tasks, reflection flows, and personalized learning guidance.',
    },
    futureUse: {
      zh: ['學習目標拆解', 'Prompt 練習引導', '課程活動設計', '反思與回饋整理'],
      ko: ['학습 목표 분해', '프롬프트 연습 안내', '수업 활동 설계', '성찰과 피드백 정리'],
      en: ['Learning goal breakdown', 'Prompt-practice guidance', 'Course activity design', 'Reflection and feedback organization'],
    },
    moduleKey: 'teaching',
    moduleLabel: {
      zh: 'Learning Coaching｜教學與課程',
      ko: 'Learning Coaching｜학습 코칭',
      en: 'Learning Coaching',
    },
    status: AGENT_STATUS.active,
    route: '/teaching/nexaeon-xchange',
    sourceScope: ['teaching'],
    enabled: true,
    public: true,
    chatEnabled: true,
    comingSoon: false,
    runtimeMode: 'xchange_tools',
    allowedCapabilities: XCHANGE_ALLOWED_CAPABILITIES,
    toolAllowlist: XCHANGE_TOOL_ALLOWLIST,
    prohibitedCapabilities: COMMON_PROHIBITED_CAPABILITIES,
    answerLabel: 'XCHANGE',
  },
  {
    key: 'archivist',
    name: 'NexAeon Archivist',
    initial: 'A',
    roleEn: 'Knowledge Curation Agent',
    roleZh: '知識整理與典藏 Agent',
    roleKo: '지식 큐레이션 Agent',
    subtitle: {
      zh: '知識整理與典藏 Agent',
      ko: '지식 큐레이션 Agent',
      en: 'Knowledge Curation Agent',
    },
    description: {
      zh: '搜尋、分類並連結目前公開的文獻、研究筆記、案例、概念、知識卡片與工具。',
      ko: '현재 공개된 문헌, 연구 노트, 사례, 개념, 지식 카드와 도구를 검색하고 분류하며 연결합니다.',
      en: 'Searches, classifies, and connects currently public literature, research notes, cases, concepts, knowledge cards, and tools.',
    },
    futureUse: {
      zh: ['知識節點整理', '研究筆記典藏', '概念關係梳理', '來源脈絡維護'],
      ko: ['지식 노드 정리', '연구 노트 축적', '개념 관계 구성', '출처 맥락 유지'],
      en: ['Knowledge-node curation', 'Research-note archiving', 'Concept relationship mapping', 'Source-context stewardship'],
    },
    moduleKey: 'knowledge-lab',
    moduleLabel: {
      zh: 'Knowledge Lab｜知識實驗室',
      ko: 'Knowledge Lab｜지식 실험실',
      en: 'Knowledge Lab',
    },
    status: AGENT_STATUS.active,
    route: '/knowledge-lab/nexaeon-archivist',
    sourceScope: ['knowledge'],
    enabled: true,
    public: true,
    chatEnabled: true,
    comingSoon: false,
    runtimeMode: 'archivist_tools',
    allowedCapabilities: ARCHIVIST_ALLOWED_CAPABILITIES,
    toolAllowlist: ARCHIVIST_TOOL_ALLOWLIST,
    prohibitedCapabilities: COMMON_PROHIBITED_CAPABILITIES,
    answerLabel: 'ARCHIVIST',
  },
  {
    key: 'engineer',
    name: 'NexAeon Engineer',
    initial: 'E',
    roleEn: 'Prototype Analysis and Technical Planning Agent',
    roleZh: '原型分析、技術規劃與實作設計 Agent',
    roleKo: '프로토타입 분석·기술 계획·구현 설계 Agent',
    subtitle: {
      zh: '原型分析、技術規劃與實作設計 Agent',
      ko: '프로토타입 분석·기술 계획·구현 설계 Agent',
      en: 'Prototype Analysis and Technical Planning Agent',
    },
    description: {
      zh: '讀取公開 Demo 與 Prototype 資料，分析現況、技術棧與風險，並產生唯讀的 MVP、Sprint、測試與驗收規劃。',
      ko: '공개 Demo와 Prototype 데이터를 분석하고 기술 스택과 위험을 정리하여 읽기 전용 MVP, Sprint, 테스트 및 승인 계획을 제공합니다.',
      en: 'Analyzes public Demo and Prototype data, technology stacks, and risks to produce read-only MVP, sprint, test, and acceptance plans.',
    },
    futureUse: {
      zh: ['Demo 規格整理', 'MVP 任務拆解', '原型驗證路線', '產品假設對齊'],
      ko: ['Demo 사양 정리', 'MVP 작업 분해', '프로토타입 검증 경로', '제품 가설 정렬'],
      en: ['Demo specification mapping', 'MVP task breakdown', 'Prototype validation paths', 'Product-hypothesis alignment'],
    },
    moduleKey: 'projects',
    moduleLabel: {
      zh: 'Demo Showcase / Prototype Lab',
      ko: 'Demo Showcase / Prototype Lab',
      en: 'Demo Showcase / Prototype Lab',
    },
    status: AGENT_STATUS.active,
    route: '/projects/nexaeon-engineer',
    sourceScope: ['demos'],
    enabled: true,
    public: true,
    chatEnabled: true,
    comingSoon: false,
    runtimeMode: 'engineer_tools',
    allowedCapabilities: ENGINEER_ALLOWED_CAPABILITIES,
    toolAllowlist: ENGINEER_TOOL_ALLOWLIST,
    prohibitedCapabilities: Object.freeze([
      ...COMMON_PROHIBITED_CAPABILITIES,
      'code_execution', 'shell_execution', 'environment_access', 'repository_write',
      'github_write', 'vercel_deploy', 'issue_creation', 'arbitrary_url_fetch',
    ]),
    answerLabel: 'ENGINEER',
  },
  {
    key: 'orchestrator',
    name: 'NexAeon Orchestrator',
    initial: 'O',
    roleEn: 'Action Coordination Agent',
    roleZh: '任務與行動協調 Agent',
    roleKo: '행동 조율 Agent',
    subtitle: {
      zh: '任務與行動協調 Agent',
      ko: '행동 조율 Agent',
      en: 'Action Coordination Agent',
    },
    description: {
      zh: '未來協助整理專案階段、任務狀態、下一步行動與跨模組節奏。',
      ko: '향후 프로젝트 단계, 작업 상태, 다음 행동, 모듈 간 진행 흐름을 정리합니다.',
      en: 'Prepared to organize project phases, task states, next actions, and cross-module cadence.',
    },
    futureUse: {
      zh: ['專案階段盤點', '任務優先順序', '下一步行動整理', '跨模組協調'],
      ko: ['프로젝트 단계 점검', '작업 우선순위', '다음 행동 정리', '모듈 간 조율'],
      en: ['Project phase review', 'Task prioritization', 'Next-action organization', 'Cross-module coordination'],
    },
    moduleKey: 'field-lab',
    moduleLabel: {
      zh: 'Action Center｜行動中心',
      ko: 'Action Center｜액션 센터',
      en: 'Action Center',
    },
    status: AGENT_STATUS.scaffold,
    route: '/field-lab/nexaeon-orchestrator',
    sourceScope: ['action'],
    enabled: false,
    public: true,
    chatEnabled: false,
    comingSoon: true,
    runtimeMode: 'scaffold_static',
    allowedCapabilities: SCAFFOLD_ALLOWED_CAPABILITIES,
    prohibitedCapabilities: SCAFFOLD_PROHIBITED_CAPABILITIES,
  },
  {
    key: 'networker',
    name: 'NexAeon Networker',
    initial: 'N',
    roleEn: 'Collaboration Connector Agent',
    roleZh: '合作與資源連接 Agent',
    roleKo: '협업 연결 Agent',
    subtitle: {
      zh: '合作與資源連接 Agent',
      ko: '협업 연결 Agent',
      en: 'Collaboration Connector Agent',
    },
    description: {
      zh: '未來協助整理合作情境、資源需求、學術與產業連接路徑。',
      ko: '향후 협업 맥락, 필요한 자원, 학술 및 산업 연결 경로를 정리합니다.',
      en: 'Prepared to map collaboration contexts, resource needs, and academic or industry connection paths.',
    },
    futureUse: {
      zh: ['合作情境整理', '資源需求盤點', '學術連接路徑', '產業合作入口'],
      ko: ['협업 맥락 정리', '자원 요구 파악', '학술 연결 경로', '산업 협업 입구'],
      en: ['Collaboration-context mapping', 'Resource needs review', 'Academic connection paths', 'Industry partnership entry'],
    },
    moduleKey: 'field-lab',
    moduleLabel: {
      zh: 'Collaboration｜合作',
      ko: 'Collaboration｜협업',
      en: 'Collaboration',
    },
    status: AGENT_STATUS.scaffold,
    route: '/field-lab/nexaeon-networker',
    sourceScope: ['collaboration'],
    enabled: false,
    public: true,
    chatEnabled: false,
    comingSoon: true,
    runtimeMode: 'scaffold_static',
    allowedCapabilities: SCAFFOLD_ALLOWED_CAPABILITIES,
    prohibitedCapabilities: SCAFFOLD_PROHIBITED_CAPABILITIES,
  },
]);

export function getPublicAgents() {
  return PUBLIC_AGENT_REGISTRY.filter((agent) => agent.public);
}

export function getNavigatorAgent() {
  return PUBLIC_AGENT_REGISTRY.find((agent) => agent.key === 'navigator');
}

export function getScaffoldAgents() {
  return getPublicAgents().filter((agent) => agent.status === AGENT_STATUS.scaffold);
}

export function getAgentByKey(key) {
  return PUBLIC_AGENT_REGISTRY.find((agent) => agent.key === key);
}

export function getAgentByRoute(route) {
  return PUBLIC_AGENT_REGISTRY.find((agent) => agent.route === route);
}

export function getAgentLocale(agent, lang = 'en') {
  const locale = ['zh', 'ko', 'en'].includes(lang) ? lang : 'en';
  return {
    subtitle: agent.subtitle[locale] || agent.subtitle.en,
    description: agent.description[locale] || agent.description.en,
    moduleLabel: agent.moduleLabel[locale] || agent.moduleLabel.en,
    futureUse: agent.futureUse[locale] || agent.futureUse.en,
  };
}
