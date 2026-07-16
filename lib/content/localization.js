export const CONTENT_LOCALES = Object.freeze(['zh-Hant', 'ko', 'en']);

const LOCALE_ALIASES = Object.freeze({
  zh: 'zh-Hant', 'zh-hant': 'zh-Hant', 'zh-tw': 'zh-Hant', zhtw: 'zh-Hant', cn: 'zh-Hant',
  ko: 'ko', kr: 'ko', 'ko-kr': 'ko',
  en: 'en', eng: 'en', 'en-us': 'en',
});

function cleanText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function normalizeContentLocale(locale, fallback = 'zh-Hant') {
  const key = String(locale || '').trim().toLowerCase().replaceAll('_', '-');
  return LOCALE_ALIASES[key] || fallback;
}

export function normalizeLocalizedText(value) {
  if (typeof value === 'string') {
    const text = cleanText(value);
    return text ? { default: text } : {};
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const output = {};
  for (const [key, raw] of Object.entries(value)) {
    const text = cleanText(raw);
    if (!text) continue;
    if (key === 'default') output.default = text;
    else output[normalizeContentLocale(key, '')] = text;
  }
  return Object.fromEntries(Object.entries(output).filter(([key]) => key));
}

export function localizedTextFromLegacy(item, field, { neutral = true } = {}) {
  const translations = item?.translations || {};
  const value = {
    'zh-Hant': translations?.zh?.[field] || translations?.['zh-Hant']?.[field] || item?.[`${field}Zh`] || item?.[`${field}ZH`] || item?.[`${field}ZhHant`],
    ko: translations?.ko?.[field] || item?.[`${field}Ko`] || item?.[`${field}KO`],
    en: translations?.en?.[field] || item?.[`${field}En`] || item?.[`${field}EN`],
    default: neutral ? item?.[field] : '',
  };
  if (item?.[field] && typeof item[field] === 'object' && !Array.isArray(item[field])) {
    return { ...normalizeLocalizedText(item[field]), ...normalizeLocalizedText(value) };
  }
  return normalizeLocalizedText(value);
}

export function resolveLocalizedTextDetailed(value, locale = 'zh-Hant') {
  const localized = normalizeLocalizedText(value);
  const requestedLocale = normalizeContentLocale(locale);
  const order = [requestedLocale, 'default', 'zh-Hant', 'ko', 'en'];
  for (const candidate of [...new Set(order)]) {
    if (!localized[candidate]) continue;
    return {
      value: localized[candidate],
      locale: candidate === 'default' ? null : candidate,
      requestedLocale,
      usedFallback: candidate !== requestedLocale,
    };
  }
  return { value: '', locale: null, requestedLocale, usedFallback: false };
}

export function resolveLocalizedText(value, locale = 'zh-Hant') {
  return resolveLocalizedTextDetailed(value, locale).value;
}

