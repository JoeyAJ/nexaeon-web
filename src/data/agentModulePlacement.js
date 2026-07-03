import {
  AGENT_STATUS,
  getAgentByKey,
  getAgentLocale,
} from './agentRegistry.js';

export const MODULE_AGENT_PLACEMENTS = Object.freeze({
  identity: Object.freeze(['navigator']),
  research: Object.freeze(['explorer']),
  teaching: Object.freeze(['xchange']),
  'knowledge-lab': Object.freeze(['archivist']),
  projects: Object.freeze(['engineer']),
  'field-lab': Object.freeze(['orchestrator', 'networker']),
});

export const MODULE_AGENT_ENTRY_COPY = Object.freeze({
  zh: {
    sectionLabel: '模塊 Agent',
    sectionEyebrow: 'Module Agent',
    sectionTitle: '此模塊的 NexAeon Agent',
    active: 'Active',
    scaffold: 'Scaffold',
    comingSoon: 'Coming Soon',
    openActive: '進入 Agent',
    openScaffold: '查看預備頁',
    indicatorLabel: 'Agent',
  },
  ko: {
    sectionLabel: '모듈 Agent',
    sectionEyebrow: 'Module Agent',
    sectionTitle: '이 모듈의 NexAeon Agent',
    active: 'Active',
    scaffold: 'Scaffold',
    comingSoon: 'Coming Soon',
    openActive: 'Agent 열기',
    openScaffold: '준비 페이지 보기',
    indicatorLabel: 'Agent',
  },
  en: {
    sectionLabel: 'Module Agent',
    sectionEyebrow: 'Module Agent',
    sectionTitle: 'NexAeon Agent for this module',
    active: 'Active',
    scaffold: 'Scaffold',
    comingSoon: 'Coming Soon',
    openActive: 'Open Agent',
    openScaffold: 'View Prep Page',
    indicatorLabel: 'Agent',
  },
});

export function getModuleAgentCopy(lang = 'en') {
  return MODULE_AGENT_ENTRY_COPY[lang] || MODULE_AGENT_ENTRY_COPY.en;
}

export function getModuleAgentStatus(agent, lang = 'en') {
  const copy = getModuleAgentCopy(lang);
  const isActiveNavigator = agent.status === AGENT_STATUS.active && agent.chatEnabled;
  if (isActiveNavigator) {
    return {
      label: copy.active,
      tone: 'active',
      cta: copy.openActive,
    };
  }

  return {
    label: `${copy.scaffold} / ${copy.comingSoon}`,
    tone: 'scaffold',
    cta: copy.openScaffold,
  };
}

export function getModuleAgentEntries(moduleId, lang = 'en') {
  const keys = MODULE_AGENT_PLACEMENTS[moduleId] || [];
  return keys
    .map((key) => getAgentByKey(key))
    .filter(Boolean)
    .map((agent) => {
      const localized = getAgentLocale(agent, lang);
      return {
        agent,
        localized,
        status: getModuleAgentStatus(agent, lang),
      };
    });
}

export function getAllModuleAgentEntries(lang = 'en') {
  return Object.entries(MODULE_AGENT_PLACEMENTS).flatMap(([moduleId]) => (
    getModuleAgentEntries(moduleId, lang).map((entry) => ({
      moduleId,
      ...entry,
    }))
  ));
}
