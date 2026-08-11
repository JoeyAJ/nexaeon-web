export const XCHANGE_SUPPORTED_LOCALES = Object.freeze(['zh', 'ko', 'en']);

export function normalizeLocale(value) {
  const normalized = String(value || '').trim().toLocaleLowerCase().replace(/_/gu, '-');
  if (/^(?:zh|中文|繁體中文|正體中文|簡體中文|chinese)(?:-|$)/u.test(normalized)) return 'zh';
  if (/^(?:ko|한국어|韓文|korean)(?:-|$)/u.test(normalized)) return 'ko';
  if (/^(?:en|英文|english)(?:-|$)/u.test(normalized)) return 'en';
  return 'en';
}

export function normalizeTextForSemanticMatch(value, locale = 'en') {
  const normalizedLocale = normalizeLocale(locale);
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase(normalizedLocale === 'en' ? 'en-US' : normalizedLocale === 'ko' ? 'ko-KR' : 'zh-TW')
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

const concept = (id, zh, ko, en) => Object.freeze({
  id,
  terms: Object.freeze({ zh: Object.freeze(zh), ko: Object.freeze(ko), en: Object.freeze(en) }),
});

export const XCHANGE_SEMANTIC_CONCEPTS = Object.freeze({
  AI_MARKETING: concept('AI_MARKETING', ['AI 行銷', '人工智慧行銷', '智慧行銷', '生成式 AI 行銷'], ['AI 마케팅', '인공지능 마케팅', '생성형 AI 마케팅', 'AI 기반 마케팅'], ['AI marketing', 'artificial intelligence marketing', 'generative AI marketing', 'AI-driven marketing']),
  GENERATIVE_AI: concept('GENERATIVE_AI', ['生成式 AI', '生成式人工智慧', '大型語言模型'], ['생성형 AI', '생성형 인공지능', '대규모 언어 모델', 'LLM'], ['generative AI', 'generative artificial intelligence', 'large language model', 'LLM']),
  MARKETING_STRATEGY: concept('MARKETING_STRATEGY', ['行銷策略', '市場策略', '行銷目標'], ['마케팅 전략', '시장 전략', '마케팅 목표'], ['marketing strategy', 'market strategy', 'marketing objective']),
  CUSTOMER_SEGMENTATION: concept('CUSTOMER_SEGMENTATION', ['受眾分析', '客群分析', '目標受眾'], ['고객 세분화', '타깃 고객', '목표 고객', '고객 분석'], ['customer segmentation', 'audience analysis', 'target audience', 'customer analysis']),
  CONTENT_CREATION: concept('CONTENT_CREATION', ['內容生成', '內容創作', '文案生成'], ['콘텐츠 생성', '콘텐츠 제작', '카피 생성'], ['content generation', 'content creation', 'copy generation']),
  PROMPT_DESIGN: concept('PROMPT_DESIGN', ['提示詞', '提示詞設計', '指令設計'], ['프롬프트', '프롬프트 설계', '프롬프트 디자인'], ['prompt', 'prompting', 'prompt design', 'prompt engineering']),
  BRAND_VOICE: concept('BRAND_VOICE', ['品牌語調', '品牌一致性', '品牌聲音'], ['브랜드 톤', '브랜드 보이스', '브랜드 일관성'], ['brand voice', 'brand tone', 'brand consistency']),
  MARKETING_FUNNEL: concept('MARKETING_FUNNEL', ['行銷漏斗', '銷售漏斗', '轉換漏斗'], ['마케팅 퍼널', '판매 퍼널', '전환 퍼널'], ['marketing funnel', 'sales funnel', 'conversion funnel']),
  CUSTOMER_JOURNEY: concept('CUSTOMER_JOURNEY', ['顧客旅程', '客戶旅程', '消費者旅程'], ['고객 여정', '소비자 여정'], ['customer journey', 'buyer journey', 'consumer journey']),
  PERFORMANCE_METRICS: concept('PERFORMANCE_METRICS', ['成效指標', '績效指標', '轉換率'], ['성과 지표', '핵심 성과 지표', '전환율', 'KPI'], ['performance metric', 'success metric', 'conversion rate', 'KPI']),
  OUTPUT_VALIDATION: concept('OUTPUT_VALIDATION', ['AI 產出驗證', '事實查核', '內容驗證'], ['AI 결과물 검증', '사실 확인', '콘텐츠 검증', '팩트체크'], ['AI output validation', 'fact-checking', 'content validation', 'verify AI output']),
  RISK_MANAGEMENT: concept('RISK_MANAGEMENT', ['風險管理', 'AI 風險', '風險辨識'], ['위험 관리', 'AI 위험', '리스크 관리', '위험 식별'], ['risk management', 'AI risk', 'risk identification']),
  ETHICS: concept('ETHICS', ['倫理', 'AI 倫理', '負責任使用'], ['윤리', 'AI 윤리', '책임 있는 사용'], ['ethics', 'AI ethics', 'responsible use']),
  PRIVACY: concept('PRIVACY', ['隱私', '個人資料', '個資'], ['개인정보', '프라이버시', '개인 데이터'], ['privacy', 'personal data', 'personally identifiable information']),
  COPYRIGHT: concept('COPYRIGHT', ['著作權', '版權', '素材來源'], ['저작권', '출처 표시', '자료 출처'], ['copyright', 'source attribution', 'content licensing']),
  BIAS: concept('BIAS', ['偏見', '歧視', '不當表述'], ['편향', '차별', '부적절한 표현'], ['bias', 'discrimination', 'harmful representation']),
  MISINFORMATION: concept('MISINFORMATION', ['幻覺', '錯誤資訊', '虛假資訊'], ['환각', '허위 정보', '잘못된 정보'], ['hallucination', 'misinformation', 'false information']),
  OVER_RELIANCE: concept('OVER_RELIANCE', ['過度依賴', '人為審查', '人工把關'], ['과도한 의존', '인간 검토', '사람의 검토'], ['over-reliance', 'human review', 'human oversight']),
  GROUP_ACTIVITY: concept('GROUP_ACTIVITY', ['小組活動', '小組實作', '分組活動', '小組'], ['그룹 활동', '조별 활동', '팀 활동', '모둠 활동', '그룹', '조별', '팀'], ['group activity', 'team activity', 'small-group activity', 'group', 'team']),
  ASSESSMENT: concept('ASSESSMENT', ['評量', '評估規準', '成果檢視'], ['평가', '평가 기준', '성과 검토'], ['assessment', 'evaluation criteria', 'rubric']),
});

export const AI_MARKETING_TOPIC_CONCEPTS = Object.freeze([
  'GENERATIVE_AI', 'MARKETING_STRATEGY', 'CUSTOMER_SEGMENTATION', 'CONTENT_CREATION',
  'PROMPT_DESIGN', 'BRAND_VOICE', 'MARKETING_FUNNEL', 'CUSTOMER_JOURNEY',
  'PERFORMANCE_METRICS', 'OUTPUT_VALIDATION', 'RISK_MANAGEMENT', 'ETHICS',
]);

export const AI_MARKETING_ACTIVITY_CONCEPTS = Object.freeze(['CUSTOMER_SEGMENTATION', 'PROMPT_DESIGN', 'BRAND_VOICE', 'OUTPUT_VALIDATION', 'RISK_MANAGEMENT']);
export const AI_MARKETING_ASSESSMENT_CONCEPTS = Object.freeze(['CUSTOMER_SEGMENTATION', 'BRAND_VOICE', 'PROMPT_DESIGN', 'OUTPUT_VALIDATION', 'MARKETING_STRATEGY', 'RISK_MANAGEMENT']);
export const AI_RISK_CONCEPTS = Object.freeze(['MISINFORMATION', 'PRIVACY', 'COPYRIGHT', 'BIAS', 'BRAND_VOICE', 'OVER_RELIANCE']);

export function getSemanticTerms(conceptId, locale) {
  const entry = XCHANGE_SEMANTIC_CONCEPTS[conceptId];
  if (!entry) return [];
  return entry.terms[normalizeLocale(locale)] || [];
}

export function matchSemanticConcept(text, conceptId, locale) {
  const normalizedLocale = normalizeLocale(locale);
  const normalizedText = normalizeTextForSemanticMatch(text, normalizedLocale);
  const matchedTerms = getSemanticTerms(conceptId, normalizedLocale).filter((term) => normalizedText.includes(normalizeTextForSemanticMatch(term, normalizedLocale)));
  return Object.freeze({ conceptId, locale: normalizedLocale, matched: matchedTerms.length > 0, matchedTerms: Object.freeze(matchedTerms) });
}

export function matchAnySemanticConcept(text, conceptIds, locale) {
  const matches = (conceptIds || []).map((conceptId) => matchSemanticConcept(text, conceptId, locale));
  return Object.freeze({
    locale: normalizeLocale(locale),
    matched: matches.some((match) => match.matched),
    matchedConcepts: Object.freeze(matches.filter((match) => match.matched).map((match) => match.conceptId)),
    missingConcepts: Object.freeze(matches.filter((match) => !match.matched).map((match) => match.conceptId)),
    matches: Object.freeze(matches),
  });
}

export const XCHANGE_MEASURABLE_OBJECTIVE_VERBS = Object.freeze({
  zh: Object.freeze(['辨識', '識別', '說明', '解釋', '比較', '應用', '建立', '制定', '提出', '評估', '設計', '分析', '計算', '測試', '驗證', '優化']),
  ko: Object.freeze(['식별하다', '분석하다', '비교하다', '적용하다', '평가하다', '설계하다', '개발하다', '수립하다', '설명하다', '계산하다', '검증하다', '최적화하다', '제안하다', '작성하다', '정의하다']),
  en: Object.freeze(['Identify', 'Analyze', 'Compare', 'Apply', 'Evaluate', 'Design', 'Create', 'Develop', 'Formulate', 'Explain', 'Calculate', 'Test', 'Validate', 'Optimize', 'Propose', 'Define', 'Demonstrate']),
});

const KO_MEASURABLE_STEMS = Object.freeze(XCHANGE_MEASURABLE_OBJECTIVE_VERBS.ko.map((verb) => verb.replace(/하다$/u, '')));

export function matchMeasurableObjectiveVerb(objective, locale) {
  const normalizedLocale = normalizeLocale(locale);
  const text = String(objective || '').trim().replace(/^[\s\d.)\-–—:：、]+/u, '');
  const normalizedText = normalizeTextForSemanticMatch(text, normalizedLocale);
  let matchedVerb;
  if (normalizedLocale === 'zh') {
    matchedVerb = XCHANGE_MEASURABLE_OBJECTIVE_VERBS.zh.find((verb) => normalizedText.startsWith(normalizeTextForSemanticMatch(verb, 'zh'))) || null;
  } else if (normalizedLocale === 'en') {
    matchedVerb = XCHANGE_MEASURABLE_OBJECTIVE_VERBS.en.find((verb) => new RegExp(`^${verb}(?:s|es|d|ed|ing)?\\b`, 'iu').test(text)) || null;
  } else {
    const suffix = '(?:하다|한다|할수있다|하도록한다|하고|하며|하여|하는|한|할)';
    matchedVerb = KO_MEASURABLE_STEMS.find((stem) => normalizedText.startsWith(normalizeTextForSemanticMatch(stem, 'ko')) || new RegExp(`${normalizeTextForSemanticMatch(stem, 'ko')}${suffix}`, 'u').test(normalizedText)) || null;
  }
  return Object.freeze({ locale: normalizedLocale, valid: Boolean(matchedVerb), matchedVerb });
}

export const XCHANGE_GENERIC_TEMPLATE_INDICATORS = Object.freeze({
  zh: Object.freeze([/先定義問題/iu, /提出(?:兩個)?選項/iu, /目標、限制與證據/iu, /問題與預期成果/iu]),
  ko: Object.freeze([/문제(?:와|를)?.{0,12}정의/iu, /선택지(?:를)?.{0,12}제안/iu, /목표.{0,8}제약.{0,8}증거/iu]),
  en: Object.freeze([/define the problem/iu, /generate (?:two )?options/iu, /goals?, constraints?, and evidence/iu]),
});

export function matchGenericTemplateIndicators(text, locale) {
  const normalizedLocale = normalizeLocale(locale);
  const matchedIndicators = XCHANGE_GENERIC_TEMPLATE_INDICATORS[normalizedLocale].filter((pattern) => pattern.test(String(text || ''))).map((pattern) => pattern.source);
  return Object.freeze({ locale: normalizedLocale, matched: matchedIndicators.length > 0, matchedIndicators: Object.freeze(matchedIndicators) });
}
