export const COMPANION_BUBBLE_DURATION = 5_000;

const messages = {
  home: { zh: '歡迎回來，我會陪你一起探索。', ko: '다시 와서 반가워. 함께 탐색해 보자.', en: 'Welcome back. I’ll explore with you.' },
  identity: { zh: '從身份開始，看見你正在成為誰。', ko: '정체성에서 시작해, 네가 어떤 사람이 되어 가는지 바라보자.', en: 'Start with identity and see who you are becoming.' },
  research: { zh: '讓我們把問題變成可以驗證的研究。', ko: '질문을 검증 가능한 연구로 바꿔 보자.', en: 'Let’s turn the question into research we can test.' },
  teaching: { zh: '學習不是被教導，而是一起找到方法。', ko: '학습은 가르침을 받는 것이 아니라, 함께 방법을 찾는 과정이야.', en: 'Learning is not being taught; it is finding the way together.' },
  knowledge: { zh: '知識不是堆積，而是建立連結。', ko: '지식은 쌓아 두는 것이 아니라, 연결하는 것이야.', en: 'Knowledge is not accumulation; it is connection.' },
  projects: { zh: '先做出可以測試的版本，再讓想法成長。', ko: '먼저 테스트할 수 있는 버전을 만들고, 아이디어를 성장시키자.', en: 'Build something testable first, then let the idea grow.' },
  action: { zh: '想法只有進入現場，才會開始改變世界。', ko: '아이디어는 현장에 들어갈 때 비로소 세상을 바꾸기 시작해.', en: 'Ideas begin to change the world only when they enter practice.' },
  navigator: { zh: '我會協助你找到下一個連結。', ko: '다음 연결을 찾을 수 있도록 도와줄게.', en: 'I’ll help you find the next connection.' },
  fallback: { zh: '我會在這裡陪著你。', ko: '여기서 함께할게.', en: 'I’ll stay here with you.' },
};

export const companionRouteConfig = Object.freeze({
  home: { state: 'sitting_smile', messages: messages.home },
  identity: { state: 'sitting_smile', messages: messages.identity },
  research: { state: 'sitting_smile', requestedState: 'thinking', messages: messages.research },
  teaching: { state: 'sitting_smile', messages: messages.teaching },
  knowledge: { state: 'sitting_smile', requestedState: 'thinking', messages: messages.knowledge },
  projects: { state: 'sitting_smile', messages: messages.projects },
  action: { state: 'sitting_smile', messages: messages.action },
  navigator: { state: 'sitting_smile', messages: messages.navigator },
  fallback: { state: 'sitting_smile', messages: messages.fallback },
});

export function resolveCompanionRoute(pathname = '/', hash = '') {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/identity/nexaeon-navigator') return { key: 'navigator', ...companionRouteConfig.navigator };
  const moduleId = path === '/' ? hash.replace(/^#/, '') : path.split('/')[1];
  const key = ({ identity: 'identity', research: 'research', teaching: 'teaching', 'knowledge-lab': 'knowledge', projects: 'projects', 'field-lab': 'action' })[moduleId]
    || (path === '/' && !moduleId ? 'home' : 'fallback');
  return { key, ...companionRouteConfig[key] };
}

export function getCompanionRouteMessage(routeConfig, lang = 'en') {
  return routeConfig.messages[lang] || routeConfig.messages.en;
}

export function createCompanionBubbleController({ onChange = () => {}, setTimeoutFn = globalThis.setTimeout, clearTimeoutFn = globalThis.clearTimeout, duration = COMPANION_BUBBLE_DURATION } = {}) {
  let currentKey = null;
  let timer = null;
  let disposed = false;
  const clear = () => { if (timer !== null) clearTimeoutFn(timer); timer = null; };
  return {
    show(config) {
      if (disposed || config.key === currentKey) return false;
      clear();
      currentKey = config.key;
      onChange(config);
      timer = setTimeoutFn(() => { timer = null; onChange(null); }, duration);
      return true;
    },
    dispose() { disposed = true; clear(); },
    getCurrentKey: () => currentKey,
  };
}
