export const QUERY_SYNONYM_GROUPS = Object.freeze([
  {
    canonical: 'joey',
    terms: ['joey', '조이'],
  },
  {
    canonical: 'identity',
    sourceId: 'identity',
    terms: ['identity', '身份', '身分', ' 정체성', '정체성', 'who is', '누구', '是誰', '是谁'],
  },
  {
    canonical: 'research',
    sourceId: 'research',
    terms: ['research', '研究', '연구', 'research area', 'research direction', '研究方向', '연구 방향'],
  },
  {
    canonical: 'teaching',
    sourceId: 'teaching',
    terms: ['learning coaching', 'learning coach', 'teaching', '學習教練', '学习教练', '러닝 코칭', '학습 코칭', '학습코칭'],
  },
  {
    canonical: 'knowledge',
    sourceId: 'knowledge',
    terms: ['knowledge lab', 'knowledge system', '知識實驗室', '知识实验室', '知識', '知识', '지식 실험실', '지식실험실', '지식'],
  },
  {
    canonical: 'demos',
    sourceId: 'demos',
    terms: ['demo', 'demos', 'demo showcase', '展示', '公開 demo', '公开 demo', '데모', '공개 데모'],
  },
  {
    canonical: 'action',
    sourceId: 'action',
    terms: ['action center', 'action project', 'action projects', '行動中心', '行动中心', '行動', '行动', '任務', '任务', '實踐專案', '实践项目', '액션 센터', '실천 프로젝트', '행동 프로젝트', '행동', '과제'],
  },
  {
    canonical: 'collaboration',
    sourceId: 'collaboration',
    terms: ['collaboration', 'collaborate', '合作', '協作', '协作', '협력', '협업'],
  },
  {
    canonical: 'ai tutor',
    sourceId: 'teaching',
    terms: ['ai tutor', 'ai tutoring', 'ai 튜터', 'ai 튜터링', 'ai家教', 'ai 教練', 'ai教練'],
  },
  {
    canonical: 'prototype',
    sourceId: 'demos',
    terms: ['mvp', 'mvps', 'prototype', 'prototypes', '原型', '프로토타입'],
  },
]);

const MODULE_SOURCE_IDS = ['identity', 'research', 'teaching', 'knowledge', 'demos', 'action', 'collaboration'];

export function normalizeText(value, limit = 300) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
    .toLowerCase();
}

function includesTerm(text, term) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  if (/^[a-z0-9\s'-]+$/.test(normalizedTerm)) {
    return new RegExp(`(^|[^a-z0-9])${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'u').test(text);
  }
  return text.includes(normalizedTerm);
}

export function getMatchedSynonymGroups(value) {
  const text = normalizeText(value);
  if (!text) return [];
  return QUERY_SYNONYM_GROUPS.filter((group) => (
    group.terms.some((term) => includesTerm(text, term))
  ));
}

export function expandQueryWithSynonyms(value) {
  const text = normalizeText(value);
  const additions = [];
  for (const group of getMatchedSynonymGroups(text)) {
    additions.push(group.canonical, ...group.terms);
  }
  return normalizeText([text, ...additions].join(' '), 900);
}

function createCharacterNgrams(text, min = 2, max = 5) {
  const output = [];
  const compact = text.replace(/\s+/g, '');
  for (let size = min; size <= max; size += 1) {
    if (compact.length < size) continue;
    for (let index = 0; index <= compact.length - size; index += 1) {
      output.push(compact.slice(index, index + size));
    }
  }
  return output;
}

export function tokenizeForSearch(value) {
  const query = normalizeText(value, 900);
  const englishTokens = query.match(/[a-z0-9][a-z0-9'-]*/g) || [];
  const englishVariants = englishTokens.flatMap((token) => {
    const variants = [token];
    if (token.length > 3 && token.endsWith('s')) variants.push(token.slice(0, -1));
    if (token.length > 4 && token.endsWith('ing')) variants.push(token.slice(0, -3));
    return variants;
  });
  const cjkSequences = query.match(/[\u3400-\u9fff]+/g) || [];
  const hangulSequences = query.match(/[가-힣]+/g) || [];
  const phraseTokens = [...cjkSequences, ...hangulSequences].flatMap((text) => [
    text,
    ...createCharacterNgrams(text),
  ]);

  return [...new Set([...englishVariants, ...phraseTokens].filter((token) => token.length > 0))];
}

export function detectSourceIntents(value) {
  const groups = getMatchedSynonymGroups(value);
  const scores = new Map();
  for (const group of groups) {
    if (!group.sourceId) continue;
    scores.set(group.sourceId, (scores.get(group.sourceId) || 0) + 1);
  }

  const text = normalizeText(value);
  if ((text.includes('joey') || text.includes('조이')) && !scores.size) {
    scores.set('identity', (scores.get('identity') || 0) + 1);
  }
  if ((text.includes('joey') || text.includes('조이')) && (text.includes('research') || text.includes('研究') || text.includes('연구'))) {
    scores.set('research', (scores.get('research') || 0) + 3);
  }
  if ((text.includes('ai tutor') || text.includes('ai 튜터')) && (text.includes('mvp') || text.includes('prototype') || text.includes('原型') || text.includes('프로토타입'))) {
    scores.set('demos', (scores.get('demos') || 0) + 2);
  }

  return [...scores.entries()]
    .filter(([sourceId]) => MODULE_SOURCE_IDS.includes(sourceId))
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return MODULE_SOURCE_IDS.indexOf(a[0]) - MODULE_SOURCE_IDS.indexOf(b[0]);
    })
    .map(([sourceId]) => sourceId);
}

export function getSourceIntentRank(sourceIntents = [], sourceId) {
  const index = sourceIntents.indexOf(sourceId);
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}
