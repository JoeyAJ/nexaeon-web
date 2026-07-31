import {
  AGENT_STATUS,
  ARCHIVIST_ALLOWED_CAPABILITIES,
  ENGINEER_ALLOWED_CAPABILITIES,
  COMMON_PROHIBITED_CAPABILITIES,
  getAgentByKey,
  getPublicAgents,
  NAVIGATOR_ALLOWED_CAPABILITIES,
  SCAFFOLD_ALLOWED_CAPABILITIES,
  SCAFFOLD_PROHIBITED_CAPABILITIES,
  XCHANGE_ALLOWED_CAPABILITIES,
} from '../../src/data/agentRegistry.js';

export const SHARED_AGENT_RUNTIME_INTERFACES = Object.freeze([
  'shared_moderation',
  'shared_source_retrieval',
  'shared_localization',
  'shared_citation_validation',
  'shared_source_card_localization',
  'shared_suggested_questions_validation',
  'shared_observability',
  'shared_health_checks',
]);

export const AGENT_CAPABILITY_POLICY = Object.freeze({
  commonProhibitedCapabilities: COMMON_PROHIBITED_CAPABILITIES,
  navigatorAllowedCapabilities: NAVIGATOR_ALLOWED_CAPABILITIES,
  xchangeAllowedCapabilities: XCHANGE_ALLOWED_CAPABILITIES,
  archivistAllowedCapabilities: ARCHIVIST_ALLOWED_CAPABILITIES,
  engineerAllowedCapabilities: ENGINEER_ALLOWED_CAPABILITIES,
  scaffoldAllowedCapabilities: SCAFFOLD_ALLOWED_CAPABILITIES,
  scaffoldProhibitedCapabilities: SCAFFOLD_PROHIBITED_CAPABILITIES,
});

export function getAgentRuntimeContract(key) {
  const agent = getAgentByKey(key);
  if (!agent) return null;

  return {
    key: agent.key,
    name: agent.name,
    status: agent.status,
    route: agent.route,
    sourceScope: agent.sourceScope,
    runtimeMode: agent.runtimeMode,
    enabled: agent.enabled,
    chatEnabled: agent.chatEnabled,
    sharedInterfaces: SHARED_AGENT_RUNTIME_INTERFACES,
    allowedCapabilities: agent.allowedCapabilities,
    prohibitedCapabilities: agent.prohibitedCapabilities,
  };
}

export function getPublicAgentRuntimeContracts() {
  return getPublicAgents().map((agent) => getAgentRuntimeContract(agent.key));
}

export function canAgentUseChatRuntime(key) {
  const contract = getAgentRuntimeContract(key);
  return Boolean(
    contract
    && contract.status === AGENT_STATUS.active
    && contract.enabled
    && contract.chatEnabled
    && contract.runtimeMode === 'navigator_ai',
  );
}
