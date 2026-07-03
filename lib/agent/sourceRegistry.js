import { toDetailPath } from '../../src/utils/router.js';

export const AGENT_SOURCES = Object.freeze([
  {
    id: 'identity',
    moduleKey: 'identity',
    endpoint: '/api/identity/profiles',
    labels: { zh: '身份', ko: '아이덴티티', en: 'Identity' },
    moduleRoute: toDetailPath('identity', 'identity-profiles'),
    sourceType: 'public-api',
  },
  {
    id: 'research',
    moduleKey: 'research',
    endpoint: '/api/research/literature',
    labels: { zh: '研究', ko: '연구', en: 'Research' },
    moduleRoute: toDetailPath('research', 'research-literature-database'),
    sourceType: 'public-api',
  },
  {
    id: 'teaching',
    moduleKey: 'teaching',
    endpoint: '/api/teaching/courses',
    labels: { zh: '學習教練', ko: '러닝 코칭', en: 'Learning Coaching' },
    moduleRoute: toDetailPath('teaching', 'teaching-courses'),
    sourceType: 'public-api',
  },
  {
    id: 'knowledge',
    moduleKey: 'knowledge-lab',
    endpoint: '/api/knowledge/resources',
    labels: { zh: '知識實驗室', ko: '지식 실험실', en: 'Knowledge Lab' },
    moduleRoute: toDetailPath('knowledge-lab', 'knowledge-resources'),
    sourceType: 'public-api',
  },
  {
    id: 'demos',
    moduleKey: 'projects',
    endpoint: '/api/modules/demos',
    labels: { zh: 'Demo Showcase', ko: '데모 쇼케이스', en: 'Demo Showcase' },
    moduleRoute: toDetailPath('projects', 'module-demos'),
    sourceType: 'public-api',
  },
  {
    id: 'action',
    moduleKey: 'field-lab',
    endpoint: '/api/action/projects',
    labels: { zh: '行動中心', ko: '액션 센터', en: 'Action Center' },
    moduleRoute: toDetailPath('field-lab', 'action-projects'),
    sourceType: 'public-api',
  },
  {
    id: 'collaboration',
    moduleKey: 'field-lab',
    endpoint: '/api/collaboration/options',
    labels: { zh: '合作', ko: '협력', en: 'Collaboration' },
    moduleRoute: toDetailPath('field-lab', 'future-collaboration-context'),
    sourceType: 'public-api',
  },
]);

export const AGENT_SOURCE_IDS = AGENT_SOURCES.map((source) => source.id);

export function getAgentSource(sourceId) {
  return AGENT_SOURCES.find((source) => source.id === sourceId) || null;
}

export function getAgentSourceLabel(sourceId, lang = 'en') {
  const source = getAgentSource(sourceId);
  return source?.labels?.[lang] || source?.labels?.en || sourceId;
}
