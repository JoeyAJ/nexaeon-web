export const COMPANION_NAVIGATOR_ROUTE = '/identity/nexaeon-navigator';
export const COMPANION_NAVIGATOR_HANDOFF_KEY = 'companionHandoff';
export const COMPANION_NAVIGATOR_FOCUS_EVENT = 'nexaeon:navigator-focus-input';
export const COMPANION_NAVIGATOR_CLEAR_EVENT = 'nexaeon:navigator-clear-prefill';

const COPY = Object.freeze({
  zh: { title: '我可以陪你做什麼？', close: '關閉', explore: '查看這個模塊', ask: '問 Navigator', continue: '繼續探索', focus: '聚焦輸入框', clear: '清除預填內容', back: '返回上一層' },
  ko: { title: '무엇을 함께 해볼까요?', close: '닫기', explore: '이 모듈 살펴보기', ask: 'Navigator에게 질문하기', continue: '계속 탐색하기', focus: '입력창으로 이동', clear: '미리 채운 내용 지우기', back: '이전 단계로 돌아가기' },
  en: { title: 'What should we explore together?', close: 'Close', explore: 'Explore this module', ask: 'Ask Navigator', continue: 'Continue exploring', focus: 'Focus the input', clear: 'Clear the prefilled question', back: 'Go back' },
});

const PROMPTS = Object.freeze({
  home: {
    zh: '請帶我快速認識 NexAeon，並建議我先從哪個模塊開始。', ko: 'NexAeon을 간단히 소개하고 어떤 모듈부터 시작하면 좋을지 제안해 주세요.', en: 'Give me a quick introduction to NexAeon and suggest which module I should explore first.',
  },
  identity: {
    zh: '請根據目前的身份導航內容，幫我整理我的定位與下一步。', ko: '현재 Identity 내용을 바탕으로 제 포지셔닝과 다음 단계를 정리해 주세요.', en: 'Based on the current Identity content, help me clarify my positioning and next step.',
  },
  research: {
    zh: '請根據目前研究模塊，幫我判斷下一步最值得推進的研究工作。', ko: '현재 Research 모듈을 바탕으로 다음에 가장 우선적으로 진행할 연구 작업을 정리해 주세요.', en: 'Based on the current Research module, help me identify the most valuable next research task.',
  },
  coaching: {
    zh: '請根據目前 Coaching 模塊，幫我設計下一步學習或課程路徑。', ko: '현재 Coaching 모듈을 바탕으로 다음 학습 또는 코칭 경로를 설계해 주세요.', en: 'Based on the current Coaching module, help me design the next learning or coaching path.',
  },
  knowledge: {
    zh: '請根據目前 Knowledge Lab，幫我找到最相關的資料入口。', ko: '현재 Knowledge Lab을 바탕으로 가장 관련 있는 자료 경로를 찾아 주세요.', en: 'Based on the current Knowledge Lab, help me find the most relevant path to the information I need.',
  },
  prototype: {
    zh: '請根據目前 Prototype Lab，幫我判斷這個想法下一步如何變成可測試的 MVP。', ko: '현재 Prototype Lab을 바탕으로 이 아이디어를 테스트 가능한 MVP로 발전시키는 다음 단계를 알려 주세요.', en: 'Based on the current Prototype Lab, help me turn this idea into a testable MVP.',
  },
  action: {
    zh: '請根據目前 Action Center，幫我整理下一步可執行的行動。', ko: '현재 Action Center를 바탕으로 다음에 실행할 수 있는 행동을 정리해 주세요.', en: 'Based on the current Action Center, help me define the next actionable step.',
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
