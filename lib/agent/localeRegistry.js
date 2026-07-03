export const DEFAULT_AGENT_LOCALE = 'zh-TW';

export const AGENT_LOCALES = Object.freeze({
  'zh-TW': {
    locale: 'zh-TW',
    lang: 'zh',
    label: '繁中',
    languageInstruction: 'Answer only in Traditional Chinese, using the current UI locale even when the user asks in another language.',
  },
  ko: {
    locale: 'ko',
    lang: 'ko',
    label: '한국어',
    languageInstruction: 'Answer only in natural Korean, using the current UI locale even when the user asks in another language.',
  },
  en: {
    locale: 'en',
    lang: 'en',
    label: 'English',
    languageInstruction: 'Answer only in natural English, using the current UI locale even when the user asks in another language.',
  },
});

const LOCALE_ALIASES = Object.freeze({
  zh: 'zh-TW',
  'zh-tw': 'zh-TW',
  'zh_tw': 'zh-TW',
  traditional: 'zh-TW',
  '繁中': 'zh-TW',
  '繁體中文': 'zh-TW',
  ko: 'ko',
  kr: 'ko',
  korean: 'ko',
  '한국어': 'ko',
  en: 'en',
  english: 'en',
});

export function normalizeAgentLocale(value) {
  const raw = String(value || '').trim();
  const locale = LOCALE_ALIASES[raw.toLowerCase()] || LOCALE_ALIASES[raw] || DEFAULT_AGENT_LOCALE;
  return AGENT_LOCALES[locale] || AGENT_LOCALES[DEFAULT_AGENT_LOCALE];
}

export function toAgentLang(value) {
  return normalizeAgentLocale(value).lang;
}

export const AGENT_TERMINOLOGY = Object.freeze({
  Identity: { 'zh-TW': '身份', ko: '아이덴티티', en: 'Identity' },
  Research: { 'zh-TW': '研究', ko: '연구', en: 'Research' },
  'Learning Coaching': { 'zh-TW': '學習教練', ko: '러닝 코칭', en: 'Learning Coaching' },
  'Knowledge Lab': { 'zh-TW': '知識實驗室', ko: '지식 실험실', en: 'Knowledge Lab' },
  'Demo Showcase': { 'zh-TW': 'Demo Showcase', ko: '데모 쇼케이스', en: 'Demo Showcase' },
  'Action Center': { 'zh-TW': '行動中心', ko: '액션 센터', en: 'Action Center' },
  Collaboration: { 'zh-TW': '合作', ko: '협력', en: 'Collaboration' },
  'AI Tutor': { 'zh-TW': 'AI Tutor', ko: 'AI 튜터', en: 'AI Tutor' },
  'AI Tutoring': { 'zh-TW': 'AI Tutoring', ko: 'AI 튜터링', en: 'AI Tutoring' },
  MVP: { 'zh-TW': 'MVP', ko: 'MVP', en: 'MVP' },
  Prototype: { 'zh-TW': '原型', ko: '프로토타입', en: 'Prototype' },
  'Research Roadmap': { 'zh-TW': '研究路線圖', ko: '연구 로드맵', en: 'Research Roadmap' },
  'Public Knowledge': { 'zh-TW': '公開知識', ko: '공개 지식', en: 'Public Knowledge' },
  Citation: { 'zh-TW': '引用', ko: '인용', en: 'Citation' },
  Source: { 'zh-TW': '來源', ko: '출처', en: 'Source' },
  identity: { 'zh-TW': '身份', ko: '아이덴티티', en: 'Identity' },
  literature: { 'zh-TW': '文獻', ko: '문헌', en: 'Literature' },
  teaching: { 'zh-TW': '學習教練', ko: '러닝 코칭', en: 'Learning Coaching' },
  knowledge: { 'zh-TW': '知識', ko: '지식', en: 'Knowledge' },
  demo: { 'zh-TW': 'Demo', ko: '데모', en: 'Demo' },
  project: { 'zh-TW': '專案', ko: '프로젝트', en: 'Project' },
  collaboration: { 'zh-TW': '合作', ko: '협력', en: 'Collaboration' },
  'public-api': { 'zh-TW': '公開來源', ko: '공개 출처', en: 'Public Source' },
  '身份': { 'zh-TW': '身份', ko: '아이덴티티', en: 'Identity' },
  '研究': { 'zh-TW': '研究', ko: '연구', en: 'Research' },
  '學習教練': { 'zh-TW': '學習教練', ko: '러닝 코칭', en: 'Learning Coaching' },
  '知識實驗室': { 'zh-TW': '知識實驗室', ko: '지식 실험실', en: 'Knowledge Lab' },
  '行動中心': { 'zh-TW': '行動中心', ko: '액션 센터', en: 'Action Center' },
  '合作': { 'zh-TW': '合作', ko: '협력', en: 'Collaboration' },
});

const MODULE_KEY_TO_TERM = Object.freeze({
  identity: 'Identity',
  research: 'Research',
  teaching: 'Learning Coaching',
  'knowledge-lab': 'Knowledge Lab',
  projects: 'Demo Showcase',
  'field-lab': 'Action Center',
});

export function getAgentTermLabel(term, locale = DEFAULT_AGENT_LOCALE) {
  const normalizedLocale = normalizeAgentLocale(locale).locale;
  const text = String(term || '').trim();
  if (!text) return '';
  const direct = AGENT_TERMINOLOGY[text]?.[normalizedLocale];
  if (direct) return direct;
  return text;
}

export function getAgentModuleLabel({ sourceId = '', moduleKey = '', moduleLabel = '' } = {}, locale = DEFAULT_AGENT_LOCALE) {
  if (sourceId === 'collaboration') return getAgentTermLabel('Collaboration', locale);
  const canonical = MODULE_KEY_TO_TERM[moduleKey] || moduleLabel;
  return getAgentTermLabel(canonical, locale);
}
