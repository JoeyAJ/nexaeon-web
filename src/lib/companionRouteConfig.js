export const COMPANION_MODULE_BUBBLE_SEEN_KEY = 'nexaeon_companion_module_bubble_seen';
export const COMPANION_BUBBLE_DURATION = 5_000;
export const COMPANION_BUBBLE_DELAY = 900;

const messages = {
  identity: { zh: '每一個身份，都從一次凝視自己開始。', ko: '모든 정체성은 자신을 바라보는 순간부터 시작돼요.', en: 'Every identity begins with the moment we look inward.' },
  research: { zh: '讓我們先找到問題，再決定答案要往哪裡生長。', ko: '먼저 질문을 찾고, 답이 어디로 자라날지 함께 살펴봐요.', en: 'Let’s find the question first, then see where the answer can grow.' },
  coaching: { zh: '學習不是被帶領，而是一起找到方向。', ko: '배움은 누군가를 따라가는 일이 아니라, 함께 방향을 찾는 과정이에요.', en: 'Learning is not about being led; it is about finding direction together.' },
  knowledge: { zh: '知識不是收藏品，而是一張持續生長的網。', ko: '지식은 보관하는 것이 아니라 계속 자라나는 연결망이에요.', en: 'Knowledge is not a collection. It is a network that keeps growing.' },
  prototype: { zh: '想法只有被做出來，才會開始回答我們。', ko: '아이디어는 직접 만들어 볼 때 비로소 우리에게 답하기 시작해요.', en: 'An idea begins to answer us only after we make it real.' },
  action: { zh: '真正的理解，會在行動裡留下痕跡。', ko: '진정한 이해는 행동 속에 흔적을 남겨요.', en: 'Real understanding leaves traces in action.' },
  navigator: { zh: '你可以問我，也可以讓我帶你找到下一個入口。', ko: '저에게 질문해도 되고, 다음 입구를 함께 찾아도 돼요.', en: 'You can ask me a question, or let me guide you to the next entry point.' },
};

const profile = (value) => Object.freeze({ duration: COMPANION_BUBBLE_DURATION, priority: 30, cooldown: 'session', ...value });

export const companionModuleProfiles = Object.freeze({
  home: profile({ moduleKey: 'home', emotion: 'calm', pose: 'resting_awake', asset: '/pet/princess/module-poses/princess-module-pose-02.png', accessory: 'none', bubbleKey: null }),
  identity: profile({ moduleKey: 'identity', emotion: 'attentive', pose: 'standing_attentive', asset: '/pet/princess/module-poses/princess-module-pose-01.png', accessory: 'round-glasses', bubbleKey: 'identity', messages: messages.identity }),
  research: profile({ moduleKey: 'research', emotion: 'curious', pose: 'standing_attentive', asset: '/pet/princess/module-poses/princess-module-pose-04.png', accessory: 'round-glasses', bubbleKey: 'research', messages: messages.research }),
  coaching: profile({ moduleKey: 'coaching', emotion: 'happy', pose: 'sitting_smile', asset: '/pet/princess/module-poses/princess-module-pose-03.png', accessory: 'academic-cap', bubbleKey: 'coaching', messages: messages.coaching }),
  knowledge: profile({ moduleKey: 'knowledge', emotion: 'attentive', pose: 'standing_attentive', asset: '/pet/princess/module-poses/princess-module-pose-05.png', accessory: 'round-glasses', bubbleKey: 'knowledge', messages: messages.knowledge }),
  prototype: profile({ moduleKey: 'prototype', emotion: 'curious', pose: 'standing_attentive', asset: '/pet/princess/module-poses/princess-module-pose-07.png', accessory: 'none', bubbleKey: 'prototype', messages: messages.prototype }),
  action: profile({ moduleKey: 'action', emotion: 'attentive', pose: 'standing_attentive', asset: '/pet/princess/module-poses/princess-module-pose-08.png', accessory: 'none', bubbleKey: 'action', messages: messages.action }),
  navigator: profile({ moduleKey: 'navigator', emotion: 'attentive', pose: 'standing_attentive', asset: '/pet/princess/module-poses/princess-module-pose-06.png', accessory: 'round-glasses', bubbleKey: 'navigator', messages: messages.navigator }),
  fallback: profile({ moduleKey: 'fallback', emotion: 'calm', pose: 'resting_awake', asset: '/pet/princess/module-poses/princess-module-pose-02.png', accessory: 'none', bubbleKey: null }),
});

// Percentages are relative to the existing Princess frame, so overlays follow drag and scale.
export const accessoryAnchorsByPose = Object.freeze({
  'round-glasses': Object.freeze({
    identity: Object.freeze({ desktop: Object.freeze({ left: 50, top: 43, width: 36, rotate: 0 }), mobile: Object.freeze({ left: 50, top: 44, width: 34, rotate: 0 }) }),
    research: Object.freeze({ desktop: Object.freeze({ left: 50, top: 46, width: 37, rotate: 0 }), mobile: Object.freeze({ left: 50, top: 47, width: 35, rotate: 0 }) }),
    knowledge: Object.freeze({ desktop: Object.freeze({ left: 50, top: 43, width: 36, rotate: 0 }), mobile: Object.freeze({ left: 50, top: 44, width: 34, rotate: 0 }) }),
    navigator: Object.freeze({ desktop: Object.freeze({ left: 50, top: 47, width: 36, rotate: -1 }), mobile: Object.freeze({ left: 50, top: 48, width: 34, rotate: -1 }) }),
  }),
  'academic-cap': Object.freeze({
    coaching: Object.freeze({
      desktop: Object.freeze({ left: 50, top: 7, width: 45, rotate: 0 }),
      mobile: Object.freeze({ left: 50, top: 8, width: 41, rotate: 0 }),
    }),
  }),
});

export function getAccessoryAnchor(accessory, moduleKey, viewportWidth, mobileBreakpoint = 520) {
  const anchors = accessoryAnchorsByPose[accessory]?.[moduleKey];
  if (!anchors) return null;
  return viewportWidth <= mobileBreakpoint ? anchors.mobile : anchors.desktop;
}

export function resolveCompanionRoute(pathname = '/', hash = '') {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/identity/nexaeon-navigator') return companionModuleProfiles.navigator;
  const moduleId = path === '/' ? hash.replace(/^#/, '') : path.split('/')[1];
  const key = ({ identity: 'identity', research: 'research', teaching: 'coaching', 'knowledge-lab': 'knowledge', projects: 'prototype', 'field-lab': 'action' })[moduleId]
    || (path === '/' && !moduleId ? 'home' : 'fallback');
  return companionModuleProfiles[key];
}

export function getCompanionRouteMessage(profile, lang = 'en') {
  return profile?.messages?.[lang] || profile?.messages?.en || '';
}

export function readCompanionBubbleSeen(storage) {
  if (!storage) return new Set();
  try {
    const value = JSON.parse(storage.getItem(COMPANION_MODULE_BUBBLE_SEEN_KEY) || '[]');
    return new Set(Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);
  } catch { return new Set(); }
}

export function markCompanionBubbleSeen(storage, key) {
  if (!storage || !key) return;
  try {
    const seen = readCompanionBubbleSeen(storage);
    seen.add(key);
    storage.setItem(COMPANION_MODULE_BUBBLE_SEEN_KEY, JSON.stringify([...seen]));
  } catch { /* Storage may be unavailable in privacy mode. */ }
}

export function getCompanionBubblePosition({ petRect, bubbleRect, viewportWidth, viewportHeight, margin = 16 }) {
  const width = Math.min(bubbleRect.width, viewportWidth - margin * 2);
  const aboveTop = petRect.top - bubbleRect.height - 12;
  let left = petRect.left + petRect.width * 0.7;
  let top = aboveTop;
  let placement = 'above-right';
  if (top < margin) {
    top = petRect.top + Math.max(0, petRect.height * 0.12);
    left = petRect.right + 10;
    placement = 'right';
  }
  if (left + width > viewportWidth - margin) {
    left = Math.max(margin, petRect.right - width);
    placement = top === aboveTop ? 'above-left' : 'left';
  }
  top = Math.max(margin, Math.min(top, viewportHeight - bubbleRect.height - margin));
  return { left, top, width, placement };
}

export function getCompanionSessionStorage(browserWindow = typeof window === 'undefined' ? null : window) {
  try { return browserWindow?.sessionStorage || null; } catch { return null; }
}

export function createCompanionBubbleController({ onChange = () => {}, storage = getCompanionSessionStorage(), setTimeoutFn = globalThis.setTimeout, clearTimeoutFn = globalThis.clearTimeout, delay = COMPANION_BUBBLE_DELAY } = {}) {
  let showTimer = null; let hideTimer = null; let disposed = false; let pendingKey = null;
  const clear = () => { if (showTimer !== null) clearTimeoutFn(showTimer); if (hideTimer !== null) clearTimeoutFn(hideTimer); showTimer = null; hideTimer = null; pendingKey = null; };
  return {
    show(profile) {
      const key = profile?.bubbleKey;
      if (disposed || !key || pendingKey === key || readCompanionBubbleSeen(storage).has(key)) return false;
      clear(); pendingKey = key;
      // Mark immediately to stay idempotent under React Strict Mode.
      markCompanionBubbleSeen(storage, key);
      showTimer = setTimeoutFn(() => {
        showTimer = null;
        if (disposed) return;
        onChange(profile);
        hideTimer = setTimeoutFn(() => { hideTimer = null; pendingKey = null; onChange(null); }, profile.duration || COMPANION_BUBBLE_DURATION);
      }, delay);
      return true;
    },
    hide() { clear(); onChange(null); },
    dispose() { disposed = true; clear(); },
    getCurrentKey: () => pendingKey,
  };
}
