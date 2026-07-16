import { routeAgentRequest, getRoutingSourceScopes } from './agentRouter.js';
import { getModuleAgent } from './moduleAgentRegistry.js';

export function createAgentExecutionPlan(input = {}) {
  const routing = routeAgentRequest(input);
  const primary = getModuleAgent(routing.primaryAgent);
  const supporting = routing.supportingAgents.slice(0, 1).map(getModuleAgent).filter(Boolean);
  return {
    routing: { ...routing, supportingAgents: supporting.map((agent) => agent.id) },
    primary,
    supporting,
    sourceScopes: getRoutingSourceScopes(routing),
  };
}

export function integrateAgentResults({ primaryResult, supportingResult, fallbackResult = '' } = {}) {
  const primary = String(primaryResult || '').trim();
  if (!primary) return String(fallbackResult || '').trim();
  const support = String(supportingResult || '').trim();
  if (!support || primary.includes(support)) return primary;
  return `${primary}\n\n${support}`;
}

