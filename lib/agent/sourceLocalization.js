import { truncateText, uniqueCompactArray } from './knowledgeDocuments.js';
import { getAgentModuleLabel, getAgentTermLabel, normalizeAgentLocale } from './localeRegistry.js';

const SUGGESTION_BLOCKLIST = [
  /\bemail\b/u,
  /\bcalendar\b/u,
  /\bfile\b/u,
  /\bweb\s*search\b/u,
  /\bsearch\s+the\s+web\b/u,
  /\bgoogle\b/u,
  /\bnotion\b/u,
  /\bairtable\b/u,
  /\bupdate\b/u,
  /\bwrite\b/u,
  /\bsend\b/u,
  /寄信/u,
  /修改/u,
  /寫入/u,
  /登入/u,
  /搜尋網路/u,
  /웹\s*검색/u,
  /이메일/u,
  /캘린더/u,
  /수정/u,
  /보내/u,
];

const FALLBACK_SUGGESTIONS = Object.freeze({
  zh: {
    identity: 'Joey 是誰？',
    research: 'Joey 的研究方向是什麼？',
    teaching: '有哪些 Learning Coaching 資源？',
    knowledge: 'Knowledge Lab 有哪些公開內容？',
    demos: '目前有哪些公開 Demo？',
    action: 'Action Center 有哪些公開項目？',
    collaboration: '有哪些合作方式？',
    general: 'NexAeon 有哪些研究內容？',
  },
  ko: {
    identity: 'Joey는 누구인가요?',
    research: 'Joey의 연구 방향은 무엇인가요?',
    teaching: '어떤 러닝 코칭 자료가 있나요?',
    knowledge: '지식 실험실에는 어떤 공개 콘텐츠가 있나요?',
    demos: '현재 공개된 데모는 무엇인가요?',
    action: '액션 센터에는 어떤 공개 프로젝트가 있나요?',
    collaboration: '어떤 협력 방식이 있나요?',
    general: 'NexAeon에는 어떤 연구 콘텐츠가 있나요?',
  },
  en: {
    identity: 'Who is Joey?',
    research: 'What are Joey’s research areas?',
    teaching: 'What Learning Coaching resources are available?',
    knowledge: 'What public content is available in the Knowledge Lab?',
    demos: 'What public demos are currently available?',
    action: 'What public projects are available in the Action Center?',
    collaboration: 'What collaboration options are available?',
    general: 'What research content is available in NexAeon?',
  },
});

const ALLOWED_PROPER_TERMS = /\b(NexAeon|Joey|AI|MVP|Demo Showcase|Learning Coaching|Knowledge Lab|Action Center|Research Roadmap|Citation|Source|S\d+)\b/u;

function normalizeSuggestionKey(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/[?？。.!！]/g, '');
}

function countScripts(value) {
  const text = String(value || '');
  const cjk = (text.match(/[\u3400-\u9fff]/gu) || []).length;
  const hangul = (text.match(/[가-힣]/gu) || []).length;
  const latin = (text.match(/[A-Za-z]/gu) || []).length;
  return { cjk, hangul, latin, total: cjk + hangul + latin };
}

export function looksLikeLocale(text, locale = 'en', { allowProperTermOnly = true } = {}) {
  const lang = normalizeAgentLocale(locale).lang;
  const value = String(text || '').trim();
  if (!value) return false;
  const scripts = countScripts(value);
  if (allowProperTermOnly && ALLOWED_PROPER_TERMS.test(value) && scripts.cjk === 0 && scripts.hangul === 0) return true;
  if (lang === 'zh') return scripts.cjk > 0 || ALLOWED_PROPER_TERMS.test(value);
  if (lang === 'ko') return scripts.hangul > 0 || (allowProperTermOnly && ALLOWED_PROPER_TERMS.test(value) && scripts.cjk === 0);
  return scripts.cjk === 0 && scripts.hangul === 0;
}

export function validateAnswerLocale(answer, locale = 'en') {
  const { lang } = normalizeAgentLocale(locale);
  const scripts = countScripts(String(answer || '').replace(/\[(S\d+)\]/g, ''));
  if (scripts.total < 20) return true;
  if (lang === 'en') return scripts.cjk + scripts.hangul <= Math.max(6, scripts.total * 0.12);
  if (lang === 'ko') return scripts.cjk <= Math.max(6, scripts.total * 0.18) && scripts.hangul > 0;
  return scripts.hangul <= Math.max(6, scripts.total * 0.18) && (scripts.cjk > 0 || scripts.latin <= scripts.total * 0.65);
}

function getFallbackSuggestionOrder(numberedSources = [], queryIntent = {}) {
  const fromIntent = Array.isArray(queryIntent.sourceIntents) ? queryIntent.sourceIntents : [];
  const fromSources = numberedSources.map((source) => {
    if (source.moduleKey === 'projects') return 'demos';
    if (source.sourceId === 'collaboration') return 'collaboration';
    return source.sourceId || source.moduleKey;
  });
  return [...new Set([...fromIntent, ...fromSources, 'identity', 'research', 'teaching', 'knowledge', 'demos', 'action', 'collaboration', 'general'])];
}

export function createFallbackSuggestedQuestions({ query = '', lang = 'en', numberedSources = [], queryIntent = {} } = {}) {
  const normalizedLang = normalizeAgentLocale(lang).lang;
  const fallback = FALLBACK_SUGGESTIONS[normalizedLang] || FALLBACK_SUGGESTIONS.en;
  const currentKey = normalizeSuggestionKey(query);
  const output = [];
  for (const key of getFallbackSuggestionOrder(numberedSources, queryIntent)) {
    const suggestion = fallback[key] || fallback.general;
    const suggestionKey = normalizeSuggestionKey(suggestion);
    if (!suggestion || suggestionKey === currentKey || output.some((item) => normalizeSuggestionKey(item) === suggestionKey)) continue;
    output.push(suggestion);
    if (output.length >= 3) break;
  }
  return output;
}

export function validateSuggestedQuestions({ suggestions = [], query = '', lang = 'en', numberedSources = [], queryIntent = {} } = {}) {
  const normalizedLang = normalizeAgentLocale(lang).lang;
  const currentKey = normalizeSuggestionKey(query);
  const seen = new Set();
  const sourceText = JSON.stringify(numberedSources.map((source) => ({
    title: source.title,
    moduleLabel: source.moduleLabel,
    itemType: source.itemType,
    tags: source.tags,
  }))).toLowerCase();
  const validated = [];

  for (const suggestion of uniqueCompactArray(suggestions).slice(0, 6)) {
    const text = truncateText(suggestion, 140);
    const key = normalizeSuggestionKey(text);
    if (!text || key === currentKey || seen.has(key)) continue;
    if (!looksLikeLocale(text, normalizedLang)) continue;
    if (SUGGESTION_BLOCKLIST.some((pattern) => pattern.test(text.toLowerCase()))) continue;
    const related = !numberedSources.length
      || sourceText.includes(key.split(' ')[0])
      || ['nexaeon', 'joey', 'demo', 'research', 'learning', 'knowledge', 'action', 'collaboration'].some((term) => text.toLowerCase().includes(term))
      || /研究|學習|知識|合作|行動|身份|데모|연구|학습|러닝|지식|협력|액션|아이덴티티/u.test(text);
    if (!related) continue;
    seen.add(key);
    validated.push(text);
    if (validated.length >= 3) break;
  }

  if (validated.length >= 3) return validated;
  const fallback = createFallbackSuggestedQuestions({ query, lang: normalizedLang, numberedSources, queryIntent });
  for (const suggestion of fallback) {
    const key = normalizeSuggestionKey(suggestion);
    if (seen.has(key) || key === currentKey) continue;
    seen.add(key);
    validated.push(suggestion);
    if (validated.length >= 3) break;
  }
  return validated.slice(0, 3);
}

function stripModelUrls(answer) {
  return String(answer || '').replace(/https?:\/\/[^\s)]+/g, '').replace(/\s+\./g, '.').trim();
}

function stripUnsafeDisplayText(value, limit = 900) {
  return truncateText(String(value || '').replace(/<[^>]*>/g, ''), limit);
}

function extractCitationMarkers(answer) {
  return [...String(answer || '').matchAll(/\[(S\d+)\]/g)].map((match) => match[1]);
}

function findLocalizedCitation(modelPayload, sourceId) {
  const citations = Array.isArray(modelPayload?.localizedCitations) ? modelPayload.localizedCitations : [];
  return citations.find((item) => item?.sourceId === sourceId && typeof item === 'object') || null;
}

function localizedDisplayValue({ candidate, fallback, locale, limit, allowProperTermOnly = true }) {
  const cleanCandidate = stripUnsafeDisplayText(candidate, limit);
  if (cleanCandidate && looksLikeLocale(cleanCandidate, locale, { allowProperTermOnly })) return cleanCandidate;
  return stripUnsafeDisplayText(fallback, limit);
}

function createLocalizedCitation(source, modelCitation, locale) {
  const moduleLabel = getAgentModuleLabel(source, locale) || localizedDisplayValue({
    candidate: modelCitation?.moduleLabel,
    fallback: source.moduleLabel,
    locale,
    limit: 120,
  });
  const typeSource = source.itemType || source.typeLabel || modelCitation?.typeLabel || '';
  const typeLabel = getAgentTermLabel(typeSource, locale);
  const title = localizedDisplayValue({
    candidate: modelCitation?.title,
    fallback: source.title,
    locale,
    limit: 240,
  });
  const summary = localizedDisplayValue({
    candidate: modelCitation?.summary,
    fallback: source.summary || source.excerpt,
    locale,
    limit: 900,
    allowProperTermOnly: false,
  });

  return {
    sourceId: source.sourceId,
    title,
    summary,
    moduleKey: source.moduleKey,
    moduleLabel,
    itemType: typeLabel,
    typeLabel,
    excerpt: summary || stripUnsafeDisplayText(source.excerpt, 360),
    sourceRoute: source.sourceRoute,
    sourceUrl: source.sourceUrl,
    updatedAt: source.updatedAt,
  };
}

export function buildDeterministicLocalizedCitations({ rawSources = [], citedSourceIds, locale = 'en' } = {}) {
  const ids = citedSourceIds?.length ? new Set(citedSourceIds) : null;
  return rawSources
    .filter((source) => source?.sourceId && (!ids || ids.has(source.sourceId)))
    .map((source) => createLocalizedCitation(source, null, locale));
}

export function localizeAgentResponse({ locale = 'en', rawSources = [], modelPayload, query = '', queryIntent = {} } = {}) {
  if (!modelPayload || typeof modelPayload !== 'object' || Array.isArray(modelPayload)) {
    return { ok: false, reason: 'model_output_invalid' };
  }

  const normalized = normalizeAgentLocale(locale);
  const allowedSourceIds = new Set(rawSources.map((source) => source.sourceId));
  const answer = stripModelUrls(modelPayload.answer);
  if (!answer) return { ok: false, reason: 'model_output_invalid' };
  const markers = extractCitationMarkers(answer);
  if (!rawSources.length) {
    if (markers.length) return { ok: false, reason: 'citation_validation_failed' };
    if (!validateAnswerLocale(answer, normalized.locale)) return { ok: false, reason: 'language_validation_failed' };
    return {
      ok: true,
      answer,
      citedSourceIds: [],
      suggestedQuestions: validateSuggestedQuestions({
        suggestions: modelPayload.suggestedQuestions || [], query, lang: normalized.lang, numberedSources: [], queryIntent,
      }),
      localizedCitations: [],
    };
  }
  if (!markers.length) return { ok: false, reason: 'citation_validation_failed' };
  if (markers.some((sourceId) => !allowedSourceIds.has(sourceId))) {
    return { ok: false, reason: 'citation_validation_failed' };
  }
  if (!validateAnswerLocale(answer, normalized.locale)) {
    return { ok: false, reason: 'language_validation_failed' };
  }

  const citedSourceIds = uniqueCompactArray([...markers, ...(modelPayload.citedSourceIds || [])])
    .filter((sourceId) => allowedSourceIds.has(sourceId) && markers.includes(sourceId))
    .slice(0, 6);

  if (!citedSourceIds.length) return { ok: false, reason: 'citation_validation_failed' };

  const citedSet = new Set(citedSourceIds);
  const localizedCitations = rawSources
    .filter((source) => citedSet.has(source.sourceId))
    .map((source) => createLocalizedCitation(source, findLocalizedCitation(modelPayload, source.sourceId), normalized.locale));

  return {
    ok: true,
    answer,
    citedSourceIds,
    suggestedQuestions: validateSuggestedQuestions({
      suggestions: modelPayload.suggestedQuestions || [],
      query,
      lang: normalized.lang,
      numberedSources: rawSources,
      queryIntent,
    }),
    localizedCitations,
  };
}
