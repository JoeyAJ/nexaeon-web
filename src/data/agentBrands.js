export const AGENT_BRAND_SYSTEM = Object.freeze({
  primaryBrand: 'NexAeon',
  retiredBrandPolicy: 'The former macron and plain Nexon assistant names are retired for public UI.',
  activePublicAgent: {
    key: 'navigator',
    name: 'NexAeon Navigator',
    role: 'Public Knowledge Navigator',
    subtitles: {
      zh: '公開知識導航 Agent',
      ko: '공개 지식 탐색 에이전트',
      en: 'Public Knowledge Navigator',
    },
    route: '/identity/nexaeon-navigator',
    legacyRoutes: [
      '/identity/nexon-ai-assistant',
      '/identity/nexon-assistant',
      '/identity/nexon',
    ],
    answerLabel: 'NAVIGATOR',
  },
  agents: [
    {
      key: 'navigator',
      initial: 'N',
      name: 'NexAeon Navigator',
      roleEn: 'Public Knowledge Navigator',
      roleZh: '公開知識導航 Agent',
    },
    {
      key: 'explorer',
      initial: 'E',
      name: 'NexAeon Explorer',
      roleEn: 'Research Exploration Agent',
      roleZh: '研究探索 Agent',
    },
    {
      key: 'xchange',
      initial: 'X',
      name: 'NexAeon Xchange',
      roleEn: 'Learning Coaching Agent',
      roleZh: '學習教練 Agent',
    },
    {
      key: 'archivist',
      initial: 'A',
      name: 'NexAeon Archivist',
      roleEn: 'Knowledge Curation Agent',
      roleZh: '知識整理與典藏 Agent',
    },
    {
      key: 'engineer',
      initial: 'E',
      name: 'NexAeon Engineer',
      roleEn: 'Prototype Builder Agent',
      roleZh: 'Demo／MVP 原型建造 Agent',
    },
    {
      key: 'orchestrator',
      initial: 'O',
      name: 'NexAeon Orchestrator',
      roleEn: 'Action Coordination Agent',
      roleZh: '任務與行動協調 Agent',
    },
    {
      key: 'networker',
      initial: 'N',
      name: 'NexAeon Networker',
      roleEn: 'Collaboration Connector Agent',
      roleZh: '合作與資源連接 Agent',
    },
  ],
  actionChain: {
    en: 'Navigate knowledge. Explore research. Xchange learning. Archive insight. Engineer prototypes. Orchestrate action. Network the future.',
    zh: '導航知識，探索研究，共學成長，典藏洞見，打造原型，協同行動，連結未來。',
    ko: '지식을 안내하고, 연구를 탐색하며, 배움을 나누고, 통찰을 축적하고, 프로토타입을 설계하며, 행동을 조율하고, 미래를 연결합니다.',
  },
});

export const NAVIGATOR_AGENT = AGENT_BRAND_SYSTEM.activePublicAgent;
