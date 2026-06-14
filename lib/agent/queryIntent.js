import { AGENT_SOURCE_IDS } from './sourceRegistry.js';

const LIST_PATTERNS = [
  /有哪些/u,
  /目前有哪些/u,
  /列出/u,
  /顯示/u,
  /展示/u,
  /무엇이\s*있나요/u,
  /무엇인가요/u,
  /어떤\s*것이\s*있나요/u,
  /어떤\s*.*있나요/u,
  /보여\s*주세요/u,
  /목록/u,
  /\bwhat\s+are\b/u,
  /\bwhich\b/u,
  /\bshow\s+me\b/u,
  /\blist\b/u,
  /\bavailable\b/u,
];

const SOURCE_PATTERNS = Object.freeze({
  demos: [
    /\bdemos?\b/u,
    /\bpublic\s+demos?\b/u,
    /\bshowcase\b/u,
    /\bprototypes?\b/u,
    /\bmvps?\b/u,
    /公開\s*Demo/u,
    /Demo/u,
    /展示/u,
    /原型/u,
    /項目/u,
    /專案/u,
    /데모/u,
    /공개\s*데모/u,
    /프로토타입/u,
    /프로젝트/u,
  ],
  identity: [/身份/u, /identity/u, /정체성/u],
  research: [/研究/u, /research/u, /연구/u],
  teaching: [/學習/u, /教練/u, /teaching/u, /learning/u, /학습/u],
  knowledge: [/知識/u, /knowledge/u, /지식/u],
  action: [/行動/u, /project/u, /action/u, /프로젝트/u],
  collaboration: [/合作/u, /collaboration/u, /협업/u],
});

function normalizeIntentText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function detectQueryIntent(query) {
  const text = normalizeIntentText(query);
  const intent = matchesAny(text, LIST_PATTERNS) ? 'list' : 'search';
  let sourceIntent = null;

  for (const [sourceId, patterns] of Object.entries(SOURCE_PATTERNS)) {
    if (!AGENT_SOURCE_IDS.includes(sourceId)) continue;
    if (matchesAny(text, patterns)) {
      sourceIntent = sourceId;
      break;
    }
  }

  return { intent, sourceIntent };
}
