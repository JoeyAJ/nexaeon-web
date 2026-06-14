export const MAX_QUERY_LENGTH = 300;
const DEFAULT_LIMIT = 8;
const FIELD_WEIGHTS = {
  title: 12,
  tags: 7,
  summary: 5,
  searchAliases: 3,
  itemType: 2,
  content: 2,
  status: 1,
  sourceLabel: 1,
  moduleLabel: 1,
};

export function normalizeQuery(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
    .toLowerCase();
}

function tokenize(query) {
  const englishTokens = query.match(/[a-z0-9]+/g) || [];
  const englishVariants = englishTokens.flatMap((token) => {
    if (token.length > 3 && token.endsWith('s')) return [token, token.slice(0, -1)];
    return [token];
  });
  const nonLatin = query
    .replace(/[a-z0-9\s]/g, '')
    .split('')
    .filter(Boolean);

  return [...new Set([...englishVariants, ...nonLatin].filter((token) => token.length > 0))];
}

function getFieldText(document, field) {
  if (field === 'tags') return (document.tags || []).join(' ');
  if (field === 'searchAliases') return (document.searchAliases || []).join(' ');
  return String(document[field] || '');
}

function scoreField(fieldText, query, tokens, weight) {
  const text = String(fieldText || '').toLowerCase();
  if (!text || !query) return 0;

  let score = 0;
  if (text.includes(query)) score += weight * 4;

  for (const token of tokens) {
    if (!token || !text.includes(token)) continue;
    score += weight;
  }

  return score;
}

function getUpdatedTime(document) {
  const time = new Date(document.updatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function createExcerpt(document, query, tokens) {
  const candidates = [document.summary, document.content, document.title].filter(Boolean);
  const lowerQuery = query.toLowerCase();

  for (const candidate of candidates) {
    const text = String(candidate);
    const lower = text.toLowerCase();
    const index = lower.indexOf(lowerQuery);
    if (index >= 0) {
      const start = Math.max(0, index - 80);
      return text.slice(start, start + 220).trim();
    }
  }

  for (const token of tokens) {
    for (const candidate of candidates) {
      const text = String(candidate);
      const index = text.toLowerCase().indexOf(token);
      if (index >= 0) {
        const start = Math.max(0, index - 80);
        return text.slice(start, start + 220).trim();
      }
    }
  }

  return String(document.summary || document.content || document.title || '').slice(0, 220).trim();
}

export function retrieveKnowledge(documents = [], queryValue = '', options = {}) {
  const query = normalizeQuery(queryValue);
  if (!query) return [];

  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const moduleFilter = options.moduleKey || options.sourceId || '';
  const limit = Math.max(1, Math.min(Number(options.limit) || DEFAULT_LIMIT, 20));
  const seen = new Set();

  return documents
    .filter((document) => {
      if (!document?.id) return false;
      if (moduleFilter && document.moduleKey !== moduleFilter && document.sourceId !== moduleFilter) return false;
      if (seen.has(document.id)) return false;
      seen.add(document.id);
      return true;
    })
    .map((document) => {
      const matchedFields = [];
      let score = 0;

      for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
        const fieldScore = scoreField(getFieldText(document, field), query, tokens, weight);
        if (fieldScore > 0) {
          matchedFields.push(field);
          score += fieldScore;
        }
      }

      if (score <= 0) return null;

      return {
        document,
        score,
        matchedFields,
        excerpt: createExcerpt(document, query, tokens),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const updatedDifference = getUpdatedTime(b.document) - getUpdatedTime(a.document);
      if (updatedDifference) return updatedDifference > 0 ? 1 : -1;
      return String(a.document.id).localeCompare(String(b.document.id));
    })
    .slice(0, limit);
}
