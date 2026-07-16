import { MODULE_AGENT_IDS, MODULE_AGENT_REGISTRY } from './moduleAgentRegistry.js';
import { normalizeText } from './queryNormalization.js';

const EXPLICIT_PATTERNS = Object.freeze({
  identity: [/identity agent/u, /身份\s*agent/u, /身分\s*agent/u, /아이덴티티\s*agent/u],
  research: [/research agent/u, /研究\s*agent/u, /리서치\s*agent/u, /연구\s*agent/u, /nexaeon explorer/u],
  coaching: [/coaching agent/u, /教練\s*agent/u, /코칭\s*agent/u, /nexaeon xchange/u],
  knowledge: [/knowledge agent/u, /知識\s*agent/u, /지식\s*agent/u, /nexaeon archivist/u],
  prototype: [/prototype agent/u, /原型\s*agent/u, /프로토타입\s*agent/u, /nexaeon engineer/u],
  action: [/action agent/u, /行動\s*agent/u, /액션\s*agent/u, /nexaeon orchestrator/u],
});

const INTENT_PATTERNS = Object.freeze({
  identity: [/joey.*(?:身份|身分|介紹|简介|是誰|是谁|소개|identity|bio)/u, /nex(?:aeon|ōn).*(?:身份|哲學|철학|identity|philosophy)/u, /研究者定位/u, /researcher positioning/u, /연구자.*정체성/u, /who is joey/u],
  research: [/研究問題/u, /研究假設/u, /研究方法/u, /理論模型/u, /量表/u, /文獻分析/u, /論文架構/u, /資料分析/u, /방법론/u, /연구\s*(?:질문|가설|방법|설계)/u, /문헌\s*(?:분석|검토)/u, /research\s*(?:question|hypothes|method|design)/u, /literature\s*(?:review|analysis)/u, /theoretical model/u, /measurement scale/u, /academic writing/u],
  coaching: [/課程設計/u, /設計.*(?:課程|一堂課|課)/u, /教學活動/u, /學習活動/u, /學習者支持/u, /評量設計/u, /coaching\s*(?:flow|framework|process)/u, /curriculum/u, /design.*(?:course|lesson)/u, /lesson plan/u, /learning activit/u, /assessment/u, /수업\s*설계/u, /커리큘럼/u, /학습\s*활동/u, /평가\s*설계/u, /ai tutor.*(?:使用|支持|學習者|활용|지원|use|support)/u],
  knowledge: [/知識整理/u, /文獻分類/u, /概念連結/u, /知識圖譜/u, /筆記結構/u, /第二大腦/u, /標籤.*檢索/u, /knowledge\s*(?:graph|organization|base)/u, /second brain/u, /note structure/u, /concept map/u, /지식\s*(?:정리|그래프)/u, /문헌\s*분류/u, /노트\s*구조/u, /개념\s*연결/u, /notion.*(?:分類|整理|구조|분류|organize)/u],
  prototype: [/\bmvp\b/u, /dashboard/u, /prototype/u, /原型/u, /技術架構/u, /api\s*(?:接入|integration)/u, /部署/u, /deploy/u, /github/u, /vercel/u, /supabase/u, /automation/u, /自動化流程/u, /프로토타입/u, /대시보드/u, /배포/u, /기술\s*아키텍처/u],
  action: [/任務拆解/u, /執行順序/u, /下一步/u, /截止日期/u, /驗收清單/u, /進度追蹤/u, /完成順序/u, /task\s*(?:breakdown|plan|sequence)/u, /next steps?/u, /deadline/u, /acceptance checklist/u, /prioriti[sz]/u, /실행\s*순서/u, /작업\s*분해/u, /다음\s*단계/u, /마감/u, /우선순위/u],
});

const ROUTE_HINTS = Object.freeze([
  ['knowledge-lab', 'knowledge'], ['field-lab', 'action'], ['projects', 'prototype'],
  ['teaching', 'coaching'], ['research', 'research'], ['identity', 'identity'],
]);

const MODULE_HINTS = Object.freeze({
  identity: 'identity', research: 'research', coaching: 'coaching', teaching: 'coaching',
  knowledge: 'knowledge', 'knowledge-lab': 'knowledge', prototype: 'prototype', projects: 'prototype',
  action: 'action', 'field-lab': 'action',
});

const CROSS_MODULE_RULES = Object.freeze([
  { primary: 'coaching', support: 'research', pattern: /(?:研究|research|연구|文獻|literature|문헌).*(?:課程|一堂課|course|lesson|curriculum|수업|coaching)/u },
  { primary: 'knowledge', support: 'research', pattern: /(?:文獻|literature|문헌|理論|theory|이론).*(?:整理|分類|organize|structure|정리|분류|notion)/u },
  { primary: 'prototype', support: 'knowledge', pattern: /(?:知識|knowledge|지식|資料|data).*(?:dashboard|介面|prototype|대시보드|프로토타입)/u },
  { primary: 'action', support: 'prototype', pattern: /(?:開發|技術|prototype|mvp|deploy|部署|개발|배포).*(?:任務|順序|plan|steps|作業|작업|순서)/u },
  { primary: 'research', support: 'identity', pattern: /(?:joey|nexaeon).*(?:研究方向|research direction|연구 방향)/u },
]);

function matches(patterns, text) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function routeAgent(currentRoute = '', currentModule = '') {
  if (MODULE_HINTS[currentModule]) return MODULE_HINTS[currentModule];
  const route = normalizeText(`${currentRoute} ${currentModule}`, 240);
  if (!route || route.includes('/identity/nexaeon-navigator')) return null;
  return ROUTE_HINTS.find(([hint]) => route.includes(hint))?.[1] || null;
}

function chooseSupportingAgent(primaryAgent, matchedAgents, text) {
  const rule = CROSS_MODULE_RULES.find((item) => item.primary === primaryAgent && item.pattern.test(text));
  if (rule) return rule.support;
  return matchedAgents.find((id) => id !== primaryAgent && (
    (primaryAgent === 'coaching' && id === 'research')
    || (primaryAgent === 'knowledge' && id === 'research')
    || (primaryAgent === 'prototype' && id === 'knowledge')
    || (primaryAgent === 'action' && id === 'prototype')
    || (primaryAgent === 'research' && id === 'identity')
  )) || null;
}

export function routeAgentRequest({ query, currentRoute = '', currentModule = '', history = [] } = {}) {
  const text = normalizeText(query, 700);
  const conversationText = normalizeText(history.slice(-2).map((entry) => entry.content).join(' '), 900);
  const explicit = MODULE_AGENT_IDS.find((id) => matches(EXPLICIT_PATTERNS[id], text));
  const scores = Object.fromEntries(MODULE_AGENT_IDS.map((id) => [id, matches(INTENT_PATTERNS[id], text) * 4]));
  const conversationMatches = MODULE_AGENT_IDS.filter((id) => matches(INTENT_PATTERNS[id], conversationText));
  for (const id of conversationMatches) scores[id] += 1;
  const routeHint = routeAgent(currentRoute, currentModule);
  if (routeHint) scores[routeHint] += 1;
  if (explicit) scores[explicit] += 100;

  const ranked = MODULE_AGENT_IDS.map((id) => ({ id, score: scores[id] }))
    .sort((a, b) => b.score - a.score || MODULE_AGENT_IDS.indexOf(a.id) - MODULE_AGENT_IDS.indexOf(b.id));
  const top = ranked[0];
  if (!text || top.score <= 1) {
    return { primaryAgent: null, supportingAgents: [], confidence: routeHint ? 0.42 : 0.25, reasonCode: 'navigator_fallback', contextSources: routeHint ? ['currentRoute'] : [], requiresClarification: false };
  }

  const crossModuleRule = CROSS_MODULE_RULES.find((rule) => rule.pattern.test(text));
  const primaryAgent = explicit || crossModuleRule?.primary || top.id;
  const matchedAgents = ranked.filter((item) => item.score >= 4).map((item) => item.id);
  const supportingAgent = crossModuleRule?.primary === primaryAgent
    ? crossModuleRule.support
    : chooseSupportingAgent(primaryAgent, matchedAgents, text);
  const intentScore = Math.min(scores[primaryAgent], 12);
  const confidence = explicit ? 0.99 : Math.min(0.96, 0.58 + intentScore * 0.035 + (routeHint === primaryAgent ? 0.05 : 0));
  const contextSources = [];
  if (explicit) contextSources.push('explicitAgent');
  contextSources.push('userRequest');
  if (routeHint) contextSources.push('currentRoute');
  if (conversationMatches.length) contextSources.push('conversation');
  return {
    primaryAgent,
    supportingAgents: supportingAgent ? [supportingAgent] : [],
    confidence: Number(confidence.toFixed(2)),
    reasonCode: explicit ? 'explicit_agent' : `${primaryAgent}_intent`,
    contextSources,
    requiresClarification: false,
  };
}

export function getRoutingSourceScopes(routing) {
  const ids = [routing?.primaryAgent, ...(routing?.supportingAgents || [])].filter(Boolean);
  if (!ids.length) return [];
  return [...new Set(ids.flatMap((id) => MODULE_AGENT_REGISTRY[id]?.contextPolicy?.sourceScopes || []))];
}
