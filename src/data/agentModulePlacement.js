import { getModuleAgents } from '../../lib/agent/moduleAgentRegistry.js';
import { getPublicAgents, getAgentLocale } from './agentRegistry.js';

const moduleAgents = getModuleAgents();

export const MODULE_AGENT_PLACEMENTS = Object.freeze(Object.fromEntries(
  moduleAgents.map((agent) => [agent.module, Object.freeze([agent.id])]),
));

export const MODULE_AGENT_ENTRY_COPY = Object.freeze({
  zh: {
    sectionLabel: '模塊 Agent',
    sectionEyebrow: 'Module Agent',
    sectionTitle: '此模塊的 NexAeon Agent',
    active: '已啟用',
    openActive: '進入 Agent',
    indicatorLabel: 'Agent',
    useAgent: (name) => `使用 ${name}`,
  },
  ko: {
    sectionLabel: '모듈 Agent',
    sectionEyebrow: 'Module Agent',
    sectionTitle: '이 모듈의 NexAeon Agent',
    active: '활성화됨',
    openActive: 'Agent 열기',
    indicatorLabel: 'Agent',
    useAgent: (name) => `${name} 사용하기`,
  },
  en: {
    sectionLabel: 'Module Agent',
    sectionEyebrow: 'Module Agent',
    sectionTitle: 'NexAeon Agent for this module',
    active: 'Active',
    openActive: 'Open Agent',
    indicatorLabel: 'Agent',
    useAgent: (name) => `Use ${name}`,
  },
});

export function getModuleAgentCopy(lang = 'en') {
  return MODULE_AGENT_ENTRY_COPY[lang] || MODULE_AGENT_ENTRY_COPY.en;
}

export function getModuleAgentStatus(agent, lang = 'en') {
  const copy = getModuleAgentCopy(lang);
  return {
    label: copy[agent.status] || agent.status,
    tone: agent.status,
    cta: copy.openActive,
  };
}

export function getModuleAgentEntries(moduleId, lang = 'en') {
  const locale = ['zh', 'ko', 'en'].includes(lang) ? lang : 'en';
  const legacyPresentation = getPublicAgents().find((agent) => agent.moduleKey === moduleId);

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
      const agent = {
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
