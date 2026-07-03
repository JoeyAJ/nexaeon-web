import {
  AGENT_ACTION_CHAIN,
  getNavigatorAgent,
  getPublicAgents,
} from './agentRegistry.js';

const navigatorAgent = getNavigatorAgent();

export const AGENT_BRAND_SYSTEM = Object.freeze({
  primaryBrand: 'NexAeon',
  retiredBrandPolicy: 'The former macron and plain Nexon assistant names are retired for public UI.',
  activePublicAgent: {
    key: navigatorAgent.key,
    name: navigatorAgent.name,
    role: navigatorAgent.roleEn,
    subtitles: navigatorAgent.subtitle,
    route: navigatorAgent.route,
    legacyRoutes: navigatorAgent.legacyRoutes,
    answerLabel: navigatorAgent.answerLabel,
  },
  agents: getPublicAgents().map((agent) => ({
    key: agent.key,
    initial: agent.initial,
    name: agent.name,
    roleEn: agent.roleEn,
    roleZh: agent.roleZh,
    roleKo: agent.roleKo,
    status: agent.status,
    route: agent.route,
    enabled: agent.enabled,
    public: agent.public,
    chatEnabled: agent.chatEnabled,
  })),
  actionChain: AGENT_ACTION_CHAIN,
});

export const NAVIGATOR_AGENT = AGENT_BRAND_SYSTEM.activePublicAgent;
