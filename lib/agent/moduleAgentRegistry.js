import { AGENT_PROMPTS } from './agentPrompts.js';

export const MODULE_AGENT_IDS = Object.freeze(['identity', 'research', 'coaching', 'knowledge', 'prototype', 'action']);
export const MODULE_AGENT_STATUS = Object.freeze({ active: 'active' });

export const MODULE_AGENT_REGISTRY = Object.freeze({
  identity: Object.freeze({
    id: 'identity', status: MODULE_AGENT_STATUS.active, name: { zh: '身份 Agent', ko: '정체성 에이전트', en: 'Identity Agent' },
    module: 'identity', moduleName: { zh: 'Identity｜身份導航', ko: 'Identity｜정체성 내비게이션', en: 'Identity' }, routes: ['/identity'], description: 'Identity and positioning',
    capabilities: ['identity', 'biography', 'philosophy', 'positioning', 'collaboration_identity'],
    exclusions: ['deep_research', 'curriculum_design', 'prototype_build', 'task_execution'],
    systemPrompt: AGENT_PROMPTS.identity, contextPolicy: { sourceScopes: ['identity', 'collaboration'] },
    outputPolicy: { grounded: true, actionClaims: false },
  }),
  research: Object.freeze({
    id: 'research', status: MODULE_AGENT_STATUS.active, name: { zh: '研究 Agent', ko: '연구 에이전트', en: 'Research Agent' },
    module: 'research', moduleName: { zh: 'Research Roadmap｜研究路線', ko: 'Research Roadmap｜연구 로드맵', en: 'Research Roadmap' }, routes: ['/research'], description: 'Research and academic analysis',
    capabilities: ['research_questions', 'literature', 'theory', 'methods', 'measurement', 'hypotheses', 'analysis'],
    exclusions: ['fabricated_sources', 'fabricated_results', 'prototype_execution'],
    systemPrompt: AGENT_PROMPTS.research, contextPolicy: { sourceScopes: ['research'] },
    outputPolicy: { grounded: true, academic: true },
  }),
  coaching: Object.freeze({
    id: 'coaching', status: MODULE_AGENT_STATUS.active, name: { zh: '學習教練 Agent', ko: '학습 코칭 에이전트', en: 'Coaching Agent' },
    module: 'teaching', moduleName: { zh: 'Coaching & Curriculum｜教練與課程', ko: 'Coaching & Curriculum｜코칭과 커리큘럼', en: 'Coaching & Curriculum' }, routes: ['/teaching'], description: 'Coaching and curriculum design',
    capabilities: ['curriculum', 'learning_activities', 'assessment', 'learner_support', 'ai_tutor'],
    exclusions: ['one_way_instruction', 'deep_literature_analysis', 'prototype_execution'],
    systemPrompt: AGENT_PROMPTS.coaching, contextPolicy: { sourceScopes: ['teaching'] },
    outputPolicy: { grounded: true, coachingVoice: true },
  }),
  knowledge: Object.freeze({
    id: 'knowledge', status: MODULE_AGENT_STATUS.active, name: { zh: '知識 Agent', ko: '지식 에이전트', en: 'Knowledge Agent' },
    module: 'knowledge-lab', moduleName: { zh: 'Knowledge Lab｜知識實驗室', ko: 'Knowledge Lab｜지식 실험실', en: 'Knowledge Lab' }, routes: ['/knowledge-lab'], description: 'Knowledge curation and retrieval design',
    capabilities: ['classification', 'notes', 'concept_links', 'knowledge_graph', 'summary', 'tags', 'retrieval'],
    exclusions: ['prototype_execution', 'notion_write'],
    systemPrompt: AGENT_PROMPTS.knowledge, contextPolicy: { sourceScopes: ['knowledge', 'research'] },
    outputPolicy: { grounded: true, structured: true },
  }),
  prototype: Object.freeze({
    id: 'prototype', status: MODULE_AGENT_STATUS.active, name: { zh: '原型 Agent', ko: '프로토타입 에이전트', en: 'Prototype Agent' },
    module: 'projects', moduleName: { zh: 'Prototype Lab｜原型實驗室', ko: 'Prototype Lab｜프로토타입 랩', en: 'Prototype Lab' }, routes: ['/projects'], description: 'Prototype and technical implementation guidance',
    capabilities: ['mvp', 'demo', 'dashboard', 'automation', 'api', 'architecture', 'testing', 'deployment'],
    exclusions: ['false_execution_claims', 'unverified_repository_claims'],
    systemPrompt: AGENT_PROMPTS.prototype, contextPolicy: { sourceScopes: ['demos', 'action'] },
    outputPolicy: { grounded: true, discloseLimitations: true },
  }),
  action: Object.freeze({
    id: 'action', status: MODULE_AGENT_STATUS.active, name: { zh: '行動 Agent', ko: '실행 에이전트', en: 'Action Agent' },
    module: 'field-lab', moduleName: { zh: 'Action Center｜行動中心', ko: 'Action Center｜액션 센터', en: 'Action Center' }, routes: ['/field-lab'], description: 'Action planning and project coordination',
    capabilities: ['task_breakdown', 'prioritization', 'deadlines', 'acceptance', 'next_steps', 'tracking'],
    exclusions: ['abstract_only', 'unverified_execution_claims'],
    systemPrompt: AGENT_PROMPTS.action, contextPolicy: { sourceScopes: ['action', 'demos'] },
    outputPolicy: { grounded: true, executable: true },
  }),
});

export function getModuleAgent(id) {
  return MODULE_AGENT_REGISTRY[id] || null;
}

export function getModuleAgents() {
  return MODULE_AGENT_IDS.map((id) => MODULE_AGENT_REGISTRY[id]);
}
