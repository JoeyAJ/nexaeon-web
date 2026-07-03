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
    title: '七個 Agent 的公開系統入口',
    intro: 'Navigator 已啟用公開知識問答；其他 Agent 目前是安全路由骨架，會逐步接入共用 runtime。',
    active: 'Active',
    scaffold: 'Scaffold',
    comingSoon: 'Coming Soon',
    open: '進入',
  },
  ko: {
    eyebrow: 'NexAeon Agent System',
    title: '일곱 Agent를 위한 공개 시스템 입구',
    intro: 'Navigator는 공개 지식 답변을 제공하며, 나머지 Agent는 공유 runtime에 연결되기 전 안전한 라우트 골격으로 제공됩니다.',
    active: 'Active',
    scaffold: 'Scaffold',
    comingSoon: 'Coming Soon',
    open: '열기',
  },
  en: {
    eyebrow: 'NexAeon Agent System',
    title: 'A public system entry for seven agents',
    intro: 'Navigator is the active public knowledge chat. The other agents are safe route scaffolds prepared for the shared runtime.',
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
      zh: '未來協助整理研究主題、理論模型、文獻脈絡與方法路線。',
      ko: '향후 연구 주제, 이론 모델, 문헌 맥락, 방법론 경로를 정리하도록 설계됩니다.',
      en: 'Prepared to organize research topics, theory models, literature context, and method pathways.',
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
    status: AGENT_STATUS.scaffold,
    route: '/research/nexaeon-explorer',
    sourceScope: ['research'],
    enabled: false,
    public: true,
    chatEnabled: false,
    comingSoon: true,
    runtimeMode: 'scaffold_static',
    allowedCapabilities: SCAFFOLD_ALLOWED_CAPABILITIES,
    prohibitedCapabilities: SCAFFOLD_PROHIBITED_CAPABILITIES,
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
      zh: '未來協助課程設計、Prompt 練習、AI 素養與學生反思路徑。',
      ko: '향후 커리큘럼 설계, 프롬프트 연습, AI 리터러시, 학습 성찰 경로를 지원합니다.',
      en: 'Prepared for curriculum design, prompt practice, AI literacy, and student reflection pathways.',
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
    status: AGENT_STATUS.scaffold,
    route: '/teaching/nexaeon-xchange',
    sourceScope: ['teaching'],
    enabled: false,
    public: true,
    chatEnabled: false,
    comingSoon: true,
    runtimeMode: 'scaffold_static',
    allowedCapabilities: SCAFFOLD_ALLOWED_CAPABILITIES,
    prohibitedCapabilities: SCAFFOLD_PROHIBITED_CAPABILITIES,
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
      zh: '未來協助整理知識節點、研究筆記、概念地圖與可追溯資料結構。',
      ko: '향후 지식 노드, 연구 노트, 개념 지도, 추적 가능한 자료 구조를 정리합니다.',
      en: 'Prepared to curate knowledge nodes, research notes, concept maps, and traceable data structures.',
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
    status: AGENT_STATUS.scaffold,
    route: '/knowledge-lab/nexaeon-archivist',
    sourceScope: ['knowledge'],
    enabled: false,
    public: true,
    chatEnabled: false,
    comingSoon: true,
    runtimeMode: 'scaffold_static',
    allowedCapabilities: SCAFFOLD_ALLOWED_CAPABILITIES,
    prohibitedCapabilities: SCAFFOLD_PROHIBITED_CAPABILITIES,
  },
  {
    key: 'engineer',
    name: 'NexAeon Engineer',
    initial: 'E',
    roleEn: 'Prototype Builder Agent',
    roleZh: 'Demo／MVP 原型建造 Agent',
    roleKo: 'Demo/MVP 프로토타입 설계 Agent',
    subtitle: {
      zh: 'Demo／MVP 原型建造 Agent',
      ko: 'Demo/MVP 프로토타입 설계 Agent',
      en: 'Prototype Builder Agent',
    },
    description: {
      zh: '未來協助把研究與教學想法整理成 Demo、MVP 與產品驗證路線。',
      ko: '향후 연구와 교육 아이디어를 Demo, MVP, 제품 검증 경로로 정리합니다.',
      en: 'Prepared to shape research and teaching ideas into demos, MVPs, and validation paths.',
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
    status: AGENT_STATUS.scaffold,
    route: '/projects/nexaeon-engineer',
    sourceScope: ['demos'],
    enabled: false,
    public: true,
    chatEnabled: false,
    comingSoon: true,
    runtimeMode: 'scaffold_static',
    allowedCapabilities: SCAFFOLD_ALLOWED_CAPABILITIES,
    prohibitedCapabilities: SCAFFOLD_PROHIBITED_CAPABILITIES,
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
  return getPublicAgents().filter((agent) => agent.key !== 'navigator');
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
