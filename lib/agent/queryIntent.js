import { AGENT_SOURCE_IDS } from './sourceRegistry.js';
import { detectSourceIntents, normalizeText } from './queryNormalization.js';

const LIST_PATTERNS = [
  /有哪些/u,
  /目前有哪些/u,
  /有哪些公開/u,
  /列出/u,
  /顯示/u,
  /展示/u,
  /清單/u,
  /列表/u,
  /무엇이\s*있나요/u,
  /어떤\s*것이\s*있나요/u,
  /어떤\s*.*있나요/u,
  /보여\s*주세요/u,
  /목록/u,
  /리스트/u,
  /현재\s*공개.*(?:데모|demo)/u,
  /\bwhat\s+are\b/u,
  /\bwhich\b/u,
  /\bshow\s+me\b/u,
  /\blist\b/u,
  /\bavailable\b/u,
  /\bcurrent(?:ly)?\s+public\b/u,
];

const IDENTITY_PATTERNS = [/who\s+is/u, /是誰/u, /是谁/u, /누구/u, /identity/u, /身份/u, /身分/u, /정체성/u];
const RESEARCH_DIRECTION_PATTERNS = [/research\s+(areas?|directions?|interests?)/u, /研究方向/u, /研究內容/u, /연구\s*방향/u, /연구\s*콘텐츠/u];
const RESOURCE_PATTERNS = [/resources?/u, /資料/u, /資源/u, /내용/u, /자료/u, /콘텐츠/u];

function normalizeIntentText(value) {
  return normalizeText(value);
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function detectQueryIntent(query) {
  const text = normalizeIntentText(query);
  const intent = matchesAny(text, LIST_PATTERNS) ? 'list' : 'search';
  const sourceIntents = detectSourceIntents(text).filter((sourceId) => AGENT_SOURCE_IDS.includes(sourceId));
  let queryType = intent;

  if (matchesAny(text, IDENTITY_PATTERNS)) queryType = 'identity_intro';
  if (matchesAny(text, RESEARCH_DIRECTION_PATTERNS)) queryType = 'research_direction';
  if (matchesAny(text, RESOURCE_PATTERNS) && intent === 'list') queryType = 'resource_list';
  if (sourceIntents[0] === 'demos') queryType = intent === 'list' ? 'demo_list' : 'demo_search';
  if (sourceIntents[0] === 'collaboration') queryType = intent === 'list' ? 'collaboration_list' : 'collaboration_search';

  if (!sourceIntents.length && /\bnexaeon\b/u.test(text)) {
    sourceIntents.push('identity');
  }

  return {
    intent,
    sourceIntent: sourceIntents[0] || null,
    sourceIntents,
    queryType,
    normalizedQuery: text,
  };
}
