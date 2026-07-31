import { getModuleAgents } from '../../lib/agent/moduleAgentRegistry.js';
import { getAgentByKey, getPublicAgents, getAgentLocale } from './agentRegistry.js';

const moduleAgents = getModuleAgents();

export const MODULE_AGENT_PLACEMENTS = Object.freeze(Object.fromEntries(
  moduleAgents.map((agent) => [agent.module, Object.freeze([agent.id])]),
));

export const MODULE_AGENT_ENTRY_COPY = Object.freeze({
  zh: {
    sectionLabel: '模塊 Agent',
    sectionEyebrow: 'Module Agent',
    sectionTitle: '此模塊的 NexAeon Agent',
    active: '已接入 Navigator',
    openActive: '使用 Navigator',
    indicatorLabel: '已接入 Navigator',
    indicatorDescription: '由 NexAeon Navigator 提供模組化問答',
    moduleDescription: '此模組目前由 NexAeon Navigator 讀取公開資料並提供模組化問答。專屬 Agent 仍在建設中。',
    explorerActive: 'Explorer 已啟用',
    openExplorer: '使用 Explorer',
    explorerIndicatorDescription: '由 NexAeon Explorer 提供獨立研究探索',
    explorerDescription: 'NexAeon Explorer 目前使用唯讀 Research Tools 搜尋、篩選與分析公開研究資料。',
  },
  ko: {
    sectionLabel: '모듈 Agent',
    sectionEyebrow: 'Module Agent',
    sectionTitle: '이 모듈의 NexAeon Agent',
    active: 'Navigator 연결됨',
    openActive: 'Navigator 사용',
    indicatorLabel: 'Navigator 연결됨',
    indicatorDescription: 'NexAeon Navigator가 모듈 기반 답변을 제공합니다',
    moduleDescription: '이 모듈은 현재 NexAeon Navigator가 공개 데이터를 불러와 모듈 기반 답변을 제공합니다. 전용 Agent는 아직 구축 중입니다.',
    explorerActive: 'Explorer 활성화됨',
    openExplorer: 'Explorer 사용',
    explorerIndicatorDescription: 'NexAeon Explorer가 독립적인 연구 탐색을 제공합니다',
    explorerDescription: 'NexAeon Explorer는 읽기 전용 Research Tools로 공개 연구 데이터를 검색, 필터링하고 분석합니다.',
  },
  en: {
    sectionLabel: 'Module Agent',
    sectionEyebrow: 'Module Agent',
    sectionTitle: 'NexAeon Agent for this module',
    active: 'Connected to Navigator',
    openActive: 'Use Navigator',
    indicatorLabel: 'Connected to Navigator',
    indicatorDescription: 'NexAeon Navigator provides module-specific Q&A',
    moduleDescription: 'This module currently uses NexAeon Navigator to retrieve public data and provide module-specific responses. Its dedicated Agent is still under development.',
    explorerActive: 'Explorer Active',
    openExplorer: 'Use Explorer',
    explorerIndicatorDescription: 'NexAeon Explorer provides independent research exploration',
    explorerDescription: 'NexAeon Explorer uses read-only Research Tools to search, filter, and analyze public research data.',
  },
});

export function getModuleAgentCopy(lang = 'en') {
  return MODULE_AGENT_ENTRY_COPY[lang] || MODULE_AGENT_ENTRY_COPY.en;
}

export function getModuleAgentStatus(agent, lang = 'en') {
  const copy = getModuleAgentCopy(lang);
  if (agent.key === 'explorer' && agent.chatEnabled) {
    return {
      label: copy.explorerActive,
      tone: 'active',
      cta: copy.openExplorer,
      indicatorDescription: copy.explorerIndicatorDescription,
      description: copy.explorerDescription,
    };
  }
  return {
    label: copy[agent.status] || agent.status,
    tone: agent.status,
    cta: copy.openActive,
    indicatorDescription: copy.indicatorDescription,
    description: copy.moduleDescription,
  };
}

export function getModuleAgentEntries(moduleId, lang = 'en') {
  const locale = ['zh', 'ko', 'en'].includes(lang) ? lang : 'en';
  const independentAgent = moduleId === 'research' ? getAgentByKey('explorer') : null;
  const legacyPresentation = independentAgent || getPublicAgents().find((agent) => agent.moduleKey === moduleId);

  return moduleAgents
    .filter((agent) => agent.module === moduleId)
    .map((registryAgent) => {
      const localized = legacyPresentation
        ? getAgentLocale(legacyPresentation, locale)
        : {
            subtitle: registryAgent.name[locale] || registryAgent.name.en,
            description: registryAgent.description,
            moduleLabel: registryAgent.moduleName[locale] || registryAgent.moduleName.en,
            futureUse: [],
          };
      const agent = independentAgent
        ? {
            ...independentAgent,
            id: independentAgent.key,
            key: independentAgent.key,
          }
        : {
            ...legacyPresentation,
            id: registryAgent.id,
            key: registryAgent.id,
            initial: registryAgent.name.en.charAt(0),
            name: registryAgent.name[locale] || registryAgent.name.en,
            status: registryAgent.status,
          };
      return {
        agent,
        localized,
        status: getModuleAgentStatus(agent, locale),
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
