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
    xchangeActive: 'Xchange 已啟用',
    openXchange: '使用 Xchange',
    xchangeIndicatorDescription: '由 NexAeon Xchange 提供獨立學習教練與課程設計',
    xchangeDescription: 'NexAeon Xchange 目前使用唯讀 Learning Tools 搜尋公開教學素材並協助設計課程、活動、任務與反思流程。',
    archivistActive: 'Archivist 已啟用',
    openArchivist: '使用 Archivist',
    archivistIndicatorDescription: '由 NexAeon Archivist 提供獨立知識整理與關聯分析',
    archivistDescription: 'NexAeon Archivist 目前使用唯讀 Knowledge Tools 搜尋、分類並連結公開知識資料。',
    engineerActive: 'Engineer 已啟用', openEngineer: '使用 Engineer',
    engineerIndicatorDescription: '由 NexAeon Engineer 提供獨立原型分析與技術規劃',
    engineerDescription: 'NexAeon Engineer 目前使用唯讀 Prototype Tools 分析公開 Demo，並提供 planned／unverified 的 MVP、Sprint、測試與驗收規劃。',
    orchestratorActive: 'Orchestrator 已啟用', openOrchestrator: '使用 Orchestrator',
    orchestratorIndicatorDescription: '由 NexAeon Orchestrator 提供獨立行動規劃與任務編排',
    orchestratorDescription: 'NexAeon Orchestrator 目前使用唯讀 Action Tools 整理公開任務，並提供 proposed／planned 的執行與跨模組協調計畫。',
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
    xchangeActive: 'Xchange 활성화됨',
    openXchange: 'Xchange 사용',
    xchangeIndicatorDescription: 'NexAeon Xchange가 독립적인 학습 코칭과 수업 설계를 제공합니다',
    xchangeDescription: 'NexAeon Xchange는 읽기 전용 Learning Tools로 공개 교육 자료를 검색하고 수업, 활동, 과제와 성찰 흐름 설계를 지원합니다.',
    archivistActive: 'Archivist 활성화됨',
    openArchivist: 'Archivist 사용',
    archivistIndicatorDescription: 'NexAeon Archivist가 독립적인 지식 정리와 관계 분석을 제공합니다',
    archivistDescription: 'NexAeon Archivist는 읽기 전용 Knowledge Tools로 공개 지식 데이터를 검색, 분류하고 연결합니다.',
    engineerActive: 'Engineer 활성화됨', openEngineer: 'Engineer 사용',
    engineerIndicatorDescription: 'NexAeon Engineer가 독립적인 프로토타입 분석과 기술 계획을 제공합니다',
    engineerDescription: 'NexAeon Engineer는 읽기 전용 Prototype Tools로 공개 Demo를 분석하고 planned/unverified 상태의 MVP, Sprint, 테스트 및 승인 계획을 제공합니다.',
    orchestratorActive: 'Orchestrator 활성화됨', openOrchestrator: 'Orchestrator 사용',
    orchestratorIndicatorDescription: 'NexAeon Orchestrator가 독립적인 행동 계획과 작업 편성을 제공합니다',
    orchestratorDescription: 'NexAeon Orchestrator는 읽기 전용 Action Tools로 공개 작업을 정리하고 proposed/planned 실행 및 모듈 간 조율 계획을 제공합니다.',
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
    xchangeActive: 'Xchange Active',
    openXchange: 'Use Xchange',
    xchangeIndicatorDescription: 'NexAeon Xchange provides independent learning coaching and course design',
    xchangeDescription: 'NexAeon Xchange uses read-only Learning Tools to search public teaching materials and support course, activity, task, and reflection design.',
    archivistActive: 'Archivist Active',
    openArchivist: 'Use Archivist',
    archivistIndicatorDescription: 'NexAeon Archivist provides independent knowledge curation and relation analysis',
    archivistDescription: 'NexAeon Archivist uses read-only Knowledge Tools to search, classify, and connect public knowledge data.',
    engineerActive: 'Engineer Active', openEngineer: 'Use Engineer',
    engineerIndicatorDescription: 'NexAeon Engineer provides independent prototype analysis and technical planning',
    engineerDescription: 'NexAeon Engineer uses read-only Prototype Tools to analyze public Demos and provide planned/unverified MVP, sprint, test, and acceptance plans.',
    orchestratorActive: 'Orchestrator Active', openOrchestrator: 'Use Orchestrator',
    orchestratorIndicatorDescription: 'NexAeon Orchestrator provides independent action planning and task orchestration',
    orchestratorDescription: 'NexAeon Orchestrator uses read-only Action Tools to organize public tasks and provide proposed/planned execution and cross-module coordination plans.',
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
  if (agent.key === 'xchange' && agent.chatEnabled) {
    return {
      label: copy.xchangeActive,
      tone: 'active',
      cta: copy.openXchange,
      indicatorDescription: copy.xchangeIndicatorDescription,
      description: copy.xchangeDescription,
    };
  }
  if (agent.key === 'archivist' && agent.chatEnabled) {
    return {
      label: copy.archivistActive,
      tone: 'active',
      cta: copy.openArchivist,
      indicatorDescription: copy.archivistIndicatorDescription,
      description: copy.archivistDescription,
    };
  }
  if (agent.key === 'engineer' && agent.chatEnabled) {
    return { label: copy.engineerActive, tone: 'active', cta: copy.openEngineer, indicatorDescription: copy.engineerIndicatorDescription, description: copy.engineerDescription };
  }
  if (agent.key === 'orchestrator' && agent.chatEnabled) {
    return { label: copy.orchestratorActive, tone: 'active', cta: copy.openOrchestrator, indicatorDescription: copy.orchestratorIndicatorDescription, description: copy.orchestratorDescription };
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
  const independentAgent = moduleId === 'research'
    ? getAgentByKey('explorer')
    : moduleId === 'teaching'
      ? getAgentByKey('xchange')
      : moduleId === 'knowledge-lab'
        ? getAgentByKey('archivist')
        : moduleId === 'projects'
          ? getAgentByKey('engineer')
          : moduleId === 'field-lab'
            ? getAgentByKey('orchestrator')
          : null;
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
