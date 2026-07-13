export const COMPANION_NAVIGATOR_ROUTE = '/identity/nexaeon-navigator';
export const COMPANION_NAVIGATOR_HANDOFF_KEY = 'companionHandoff';
export const COMPANION_NAVIGATOR_FOCUS_EVENT = 'nexaeon:navigator-focus-input';
export const COMPANION_NAVIGATOR_CLEAR_EVENT = 'nexaeon:navigator-clear-prefill';

const COPY = Object.freeze({
  zh: { title: 'Princess 可以幫你', close: '關閉 Princess 動作', explore: '探索這個模塊', ask: '請 Navigator 協助', continue: '繼續看看', focus: '回到提問欄', clear: '清除預填內容', back: '返回上一頁' },
  ko: { title: 'Princess가 도와드릴게요', close: 'Princess 작업 닫기', explore: '이 모듈 둘러보기', ask: 'Navigator에게 물어보기', continue: '계속 둘러보기', focus: '질문 입력란으로', clear: '미리 채운 내용 지우기', back: '이전 페이지로' },
  en: { title: 'Princess can help', close: 'Close Princess actions', explore: 'Explore this module', ask: 'Ask Navigator for help', continue: 'Keep exploring', focus: 'Focus the question field', clear: 'Clear the prefilled question', back: 'Go back' },
});

const PROMPTS = Object.freeze({
  home: {
    zh: '請帶我快速認識 NexAeon，並建議我先從哪個模塊開始。', ko: 'NexAeon을 간단히 소개하고 어떤 모듈부터 시작하면 좋을지 제안해 주세요.', en: 'Give me a quick introduction to NexAeon and suggest which module I should explore first.',
  },
  identity: {
    zh: '請說明 Identity 模塊可以幫我理解哪些公開的身份與能力資訊。', ko: 'Identity 모듈에서 확인할 수 있는 공개 정체성 및 역량 정보를 설명해 주세요.', en: 'Explain what public identity and capability information I can explore in the Identity module.',
  },
  research: {
    zh: '請整理 NexAeon 目前公開的研究方向與相關資料。', ko: 'NexAeon의 현재 공개 연구 방향과 관련 자료를 정리해 주세요.', en: 'Summarize NexAeon’s current public research directions and related sources.',
  },
  coaching: {
    zh: '請介紹 NexAeon 的 Coaching & Curriculum 理念與公開課程。', ko: 'NexAeon의 Coaching & Curriculum 철학과 공개 강좌를 소개해 주세요.', en: 'Introduce NexAeon’s Coaching & Curriculum approach and public courses.',
  },
  knowledge: {
    zh: '請幫我理解 Knowledge Lab 如何整理 NexAeon 的公開知識。', ko: 'Knowledge Lab이 NexAeon의 공개 지식을 어떻게 정리하는지 설명해 주세요.', en: 'Help me understand how Knowledge Lab organizes NexAeon’s public knowledge.',
  },
  prototype: {
    zh: '請介紹目前可查看的 NexAeon 原型與 Demo。', ko: '현재 확인할 수 있는 NexAeon 프로토타입과 데모를 소개해 주세요.', en: 'Introduce the NexAeon prototypes and demos that are currently available.',
  },
  action: {
    zh: '請整理 NexAeon 目前公開的行動專案與實踐方向。', ko: 'NexAeon의 현재 공개 실행 프로젝트와 실천 방향을 정리해 주세요.', en: 'Summarize NexAeon’s current public action projects and practice directions.',
  },
  navigator: {
    zh: '請根據 NexAeon 的公開資料協助我找到下一步。', ko: 'NexAeon의 공개 자료를 바탕으로 다음 단계를 찾도록 도와주세요.', en: 'Help me find a useful next step using NexAeon’s public information.',
  },
});

const MODULE_ROUTES = Object.freeze({
  home: '/#identity',
  identity: '/identity/identity-profiles',
  research: '/research/research-literature-database',
  coaching: '/teaching/teaching-courses',
  knowledge: '/knowledge-lab/knowledge-resources',
  prototype: '/projects/module-demos',
  action: '/field-lab/action-projects',
});

export function getCompanionActionPanelCopy(lang = 'en') {
  return COPY[lang] || COPY.en;
}

export function getCompanionActions(moduleKey, lang = 'en') {
  const key = PROMPTS[moduleKey] ? moduleKey : 'home';
  const copy = getCompanionActionPanelCopy(lang);
  if (key === 'navigator') {
    return [
      { id: 'focus-question', type: 'focus-input', label: copy.focus },
      { id: 'clear-prefill', type: 'clear-prefill', label: copy.clear },
      { id: 'go-back', type: 'back', label: copy.back },
    ];
  }
  return [
    { id: `explore-${key}`, type: 'navigate', label: copy.explore, route: MODULE_ROUTES[key] },
    { id: `ask-${key}`, type: 'navigator', label: copy.ask, promptKey: key },
    { id: 'continue', type: 'dismiss', label: copy.continue },
  ];
}

export function getCompanionSuggestedPrompt(promptKey, lang = 'en') {
  const prompts = PROMPTS[promptKey] || PROMPTS.home;
  return prompts[lang] || prompts.en;
}

function isSafeRoute(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && value.length <= 240;
}

export function createCompanionNavigatorHandoff({ currentModule, currentRoute, locale, selectedAction, suggestedPromptKey }) {
  const moduleKey = PROMPTS[currentModule] ? currentModule : 'home';
  const safeLocale = ['zh', 'ko', 'en'].includes(locale) ? locale : 'en';
  return Object.freeze({
    currentModule: moduleKey,
    currentRoute: isSafeRoute(currentRoute) ? currentRoute : '/',
    locale: safeLocale,
    selectedAction: String(selectedAction || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 64),
    suggestedPromptKey: PROMPTS[suggestedPromptKey] ? suggestedPromptKey : moduleKey,
    source: 'princess-companion',
  });
}

export function consumeCompanionNavigatorHandoff(windowTarget = window) {
  const raw = windowTarget.history.state?.[COMPANION_NAVIGATOR_HANDOFF_KEY];
  if (!raw || raw.source !== 'princess-companion') return null;
  const handoff = createCompanionNavigatorHandoff(raw);
  windowTarget.history.replaceState({
    ...(windowTarget.history.state || {}),
    [COMPANION_NAVIGATOR_HANDOFF_KEY]: undefined,
  }, '', `${windowTarget.location.pathname}${windowTarget.location.hash}`);
  return { ...handoff, prompt: getCompanionSuggestedPrompt(handoff.suggestedPromptKey, handoff.locale) };
}
