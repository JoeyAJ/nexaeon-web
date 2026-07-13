export const COMPANION_MODULE_BUBBLE_SEEN_KEY = 'nexaeon_companion_module_bubble_seen';
export const COMPANION_BUBBLE_DURATION = 5_000;
export const COMPANION_BUBBLE_DELAY = 900;
export const COMPANION_LOCALE_GREETING_DURATION = 3_200;

export const companionTranslations = Object.freeze({
  localeChangedGreeting: Object.freeze({
    zh: '語言已切換，我會繼續陪你探索 NexAeon。',
    ko: '언어가 변경되었어요. 계속 함께 NexAeon을 탐험해 볼게요.',
    en: 'The language has changed. I’ll continue exploring NexAeon with you.',
  }),
});

const messages = {
  identity: { zh: '每一個身份，都從一次凝視自己開始。', ko: '모든 정체성은 자신을 바라보는 순간부터 시작돼요.', en: 'Every identity begins with the moment we look inward.' },
  research: { zh: '讓我們先找到問題，再決定答案要往哪裡生長。', ko: '먼저 질문을 찾고, 답이 어디로 자라날지 함께 살펴봐요.', en: 'Let’s find the question first, then see where the answer can grow.' },
  coaching: { zh: '學習不是被帶領，而是一起找到方向。', ko: '배움은 누군가를 따라가는 일이 아니라, 함께 방향을 찾는 과정이에요.', en: 'Learning is not about being led; it is about finding direction together.' },
  knowledge: { zh: '知識不是收藏品，而是一張持續生長的網。', ko: '지식은 보관하는 것이 아니라 계속 자라나는 연결망이에요.', en: 'Knowledge is not a collection. It is a network that keeps growing.' },
  prototype: { zh: '想法只有被做出來，才會開始回答我們。', ko: '아이디어는 직접 만들어 볼 때 비로소 우리에게 답하기 시작해요.', en: 'An idea begins to answer us only after we make it real.' },
  action: { zh: '真正的理解，會在行動裡留下痕跡。', ko: '진정한 이해는 행동 속에 흔적을 남겨요.', en: 'Real understanding leaves traces in action.' },
  navigator: { zh: '你可以問我，也可以讓我帶你找到下一個入口。', ko: '저에게 질문해도 되고, 다음 입구를 함께 찾아도 돼요.', en: 'You can ask me a question, or let me guide you to the next entry point.' },
};

const MODULE_POSE_ROOT = '/pet/princess/module-poses';

export const companionImageSuitabilityRules = Object.freeze({
  'princess-module-pose-01.png': Object.freeze({ posture: 'frontal close portrait with direct eye contact', bestFor: Object.freeze(['identity']), accessories: Object.freeze(['none']), avoidAccessories: true }),
  'princess-module-pose-02.png': Object.freeze({ posture: 'frontal low resting pose, nearly full body', bestFor: Object.freeze(['home']), accessories: Object.freeze(['none']), avoidAccessories: true }),
  'princess-module-pose-03.png': Object.freeze({ posture: 'frontal full-body step with strong forward motion', bestFor: Object.freeze(['action']), accessories: Object.freeze(['none']), avoidAccessories: true }),
  'princess-module-pose-04.png': Object.freeze({ posture: 'frontal seated close-up with an open crown line', bestFor: Object.freeze(['coaching']), accessories: Object.freeze(['academic-cap', 'none']), avoidAccessories: false }),
  'princess-module-pose-05.png': Object.freeze({ posture: 'frontal standing full-body approach', bestFor: Object.freeze(['navigator']), accessories: Object.freeze(['none']), avoidAccessories: true }),
  'princess-module-pose-06.png': Object.freeze({ posture: 'three-quarter side close-up with a lowered thoughtful gaze', bestFor: Object.freeze(['research']), accessories: Object.freeze(['none']), avoidAccessories: true }),
  'princess-module-pose-07.png': Object.freeze({ posture: 'frontal low bow and exploratory stretch', bestFor: Object.freeze(['prototype']), accessories: Object.freeze(['none']), avoidAccessories: true }),
  'princess-module-pose-08.png': Object.freeze({ posture: 'frontal prone close-up with a gentle settled gaze', bestFor: Object.freeze(['knowledge']), accessories: Object.freeze(['none']), avoidAccessories: true }),
});

export const companionAccessorySuitabilityRules = Object.freeze({
  none: Object.freeze({ modules: Object.freeze(['home', 'identity', 'research', 'knowledge', 'prototype', 'action', 'navigator', 'fallback']) }),
  'round-glasses': Object.freeze({ modules: Object.freeze([]), images: Object.freeze([]) }),
  'academic-cap': Object.freeze({ modules: Object.freeze(['coaching']), images: Object.freeze(['princess-module-pose-04.png']) }),
});

export const companionInteractionFallbackRules = Object.freeze({
  stateVariants: Object.freeze({
    resting_awake: 'base', standing_attentive: 'attentive', attentive_portrait: 'attentive',
    curious: 'curious', wave: 'happy', happy: 'happy', sitting_smile: 'happy', affection: 'happy',
    rest: 'resting', quiet: 'sleepy', sleep: 'sleepy', sleeping_prone: 'sleepy',
  }),
  fallbackVariant: 'base',
  imageStrategy: 'preserve-module-base-image',
});

const profile = (value) => Object.freeze({
  duration: COMPANION_BUBBLE_DURATION,
  priority: 30,
  cooldown: 'session',
  ...value,
  // Compatibility aliases keep the behavior layer stable while the visual decision lives here.
  asset: value.baseImage,
  accessory: value.baseAccessory,
  emotion: value.baseEmotion,
});

const image = (filename) => `${MODULE_POSE_ROOT}/${filename}`;
const variants = (...values) => Object.freeze(values);
const accessoryRules = (hiddenStates = []) => Object.freeze({
  hideDuringStates: Object.freeze(hiddenStates),
  restoreOnBaseProfile: true,
});

const depth = (shadowType, shadowAnchor, shadowScale, depthScale, rimLightStrength, idleMotion = 'weighted') => Object.freeze({
  shadowType,
  shadowAnchor: Object.freeze(shadowAnchor),
  shadowScale: Object.freeze(shadowScale),
  depthScale,
  rimLightStrength,
  idleMotion,
});

export const companionModuleProfiles = Object.freeze({
  home: profile({ moduleKey: 'home', baseEmotion: 'calm', pose: 'resting_awake', baseImage: image('princess-module-pose-02.png'), baseAccessory: 'none', visualProfile: depth('ground', { x: 50, y: 86 }, { x: 1.18, y: 0.82 }, 0.99, 0.55, 'settled'), allowedInteractionVariants: variants('base', 'attentive', 'happy', 'resting', 'sleepy'), accessoryVisibilityRules: accessoryRules(), bubbleKey: null }),
  identity: profile({ moduleKey: 'identity', baseEmotion: 'attentive', pose: 'standing_attentive', baseImage: image('princess-module-pose-01.png'), baseAccessory: 'none', visualProfile: depth('soft-float', { x: 50, y: 78 }, { x: 0.9, y: 0.72 }, 1.01, 0.38, 'portrait'), allowedInteractionVariants: variants('base', 'attentive', 'curious', 'happy', 'resting', 'sleepy'), accessoryVisibilityRules: accessoryRules(), bubbleKey: 'identity', messages: messages.identity }),
  research: profile({ moduleKey: 'research', baseEmotion: 'curious', pose: 'standing_attentive', baseImage: image('princess-module-pose-06.png'), baseAccessory: 'none', visualProfile: depth('soft-float', { x: 52, y: 80 }, { x: 0.94, y: 0.72 }, 1.005, 0.42, 'portrait'), allowedInteractionVariants: variants('base', 'attentive', 'curious', 'resting', 'sleepy'), accessoryVisibilityRules: accessoryRules(), bubbleKey: 'research', messages: messages.research }),
  coaching: profile({ moduleKey: 'coaching', baseEmotion: 'happy', pose: 'sitting_smile', baseImage: image('princess-module-pose-04.png'), baseAccessory: 'academic-cap', visualProfile: depth('ground', { x: 50, y: 90 }, { x: 1.14, y: 0.78 }, 1, 0.48, 'settled'), allowedInteractionVariants: variants('base', 'attentive', 'happy', 'resting', 'sleepy'), accessoryVisibilityRules: accessoryRules(['quiet', 'sleep', 'sleeping_prone']), bubbleKey: 'coaching', messages: messages.coaching }),
  knowledge: profile({ moduleKey: 'knowledge', baseEmotion: 'attentive', pose: 'standing_attentive', baseImage: image('princess-module-pose-08.png'), baseAccessory: 'none', visualProfile: depth('ground', { x: 51, y: 87 }, { x: 1.34, y: 0.7 }, 0.995, 0.4, 'settled'), allowedInteractionVariants: variants('base', 'attentive', 'curious', 'resting', 'sleepy'), accessoryVisibilityRules: accessoryRules(), bubbleKey: 'knowledge', messages: messages.knowledge }),
  prototype: profile({ moduleKey: 'prototype', baseEmotion: 'curious', pose: 'standing_attentive', baseImage: image('princess-module-pose-07.png'), baseAccessory: 'none', visualScale: 1.6, visualProfile: depth('ground', { x: 51, y: 89 }, { x: 1.28, y: 0.72 }, 0.99, 0.5, 'weighted'), allowedInteractionVariants: variants('base', 'attentive', 'curious', 'happy', 'resting', 'sleepy'), accessoryVisibilityRules: accessoryRules(), bubbleKey: 'prototype', messages: messages.prototype }),
  action: profile({ moduleKey: 'action', baseEmotion: 'attentive', pose: 'standing_attentive', baseImage: image('princess-module-pose-03.png'), baseAccessory: 'none', visualProfile: depth('ground', { x: 50, y: 92 }, { x: 0.88, y: 0.68 }, 1.008, 0.58, 'weighted'), allowedInteractionVariants: variants('base', 'attentive', 'happy', 'resting', 'sleepy'), accessoryVisibilityRules: accessoryRules(), bubbleKey: 'action', messages: messages.action }),
  navigator: profile({ moduleKey: 'navigator', baseEmotion: 'attentive', pose: 'standing_attentive', baseImage: image('princess-module-pose-05.png'), baseAccessory: 'none', visualProfile: depth('ground', { x: 50, y: 92 }, { x: 0.92, y: 0.68 }, 1.006, 0.56, 'weighted'), allowedInteractionVariants: variants('base', 'attentive', 'curious', 'happy', 'resting', 'sleepy'), accessoryVisibilityRules: accessoryRules(), bubbleKey: 'navigator', messages: messages.navigator }),
  fallback: profile({ moduleKey: 'fallback', baseEmotion: 'calm', pose: 'resting_awake', baseImage: image('princess-module-pose-02.png'), baseAccessory: 'none', visualProfile: depth('ground', { x: 50, y: 86 }, { x: 1.18, y: 0.82 }, 0.99, 0.55, 'settled'), allowedInteractionVariants: variants('base', 'attentive', 'happy', 'resting', 'sleepy'), accessoryVisibilityRules: accessoryRules(), bubbleKey: null }),
});

// Percentages are relative to the existing Princess frame, so overlays follow drag and scale.
export const accessoryAnchorsByPose = Object.freeze({
  'round-glasses': Object.freeze({
  }),
  'academic-cap': Object.freeze({
    coaching: Object.freeze({
      desktop: Object.freeze({ left: 50, top: 10, width: 48, rotate: 0 }),
      mobile: Object.freeze({ left: 50, top: 11, width: 44, rotate: 0 }),
    }),
  }),
});

export function getAccessoryAnchor(accessory, moduleKey, viewportWidth, mobileBreakpoint = 520) {
  const anchors = accessoryAnchorsByPose[accessory]?.[moduleKey];
  if (!anchors) return null;
  return viewportWidth <= mobileBreakpoint ? anchors.mobile : anchors.desktop;
}

export function getCompanionDisplayedAsset(profile, currentFrame, petState, behaviorSource) {
  const debugInactivity = behaviorSource === 'debug' && ['rest', 'sleep', 'sleeping_prone'].includes(petState);
  const isStatePreview = behaviorSource === 'debug' && !debugInactivity;
  return !isStatePreview && profile?.baseImage ? profile.baseImage : currentFrame;
}

export function getCompanionInteractionVariant(profile, petState) {
  const requested = companionInteractionFallbackRules.stateVariants[petState] || companionInteractionFallbackRules.fallbackVariant;
  return profile?.allowedInteractionVariants?.includes(requested) ? requested : companionInteractionFallbackRules.fallbackVariant;
}

export function shouldShowCompanionAccessory(profile, { petState, introPhase = 'active', accessoriesEnabled = true } = {}) {
  const accessory = profile?.baseAccessory || 'none';
  if (!accessoriesEnabled || introPhase !== 'active' || accessory === 'none') return false;
  const filename = profile.baseImage?.split('/').pop();
  const suitability = companionAccessorySuitabilityRules[accessory];
  if (!suitability?.modules.includes(profile.moduleKey) || !suitability.images.includes(filename)) return false;
  return !profile.accessoryVisibilityRules?.hideDuringStates?.includes(petState);
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

export function getCompanionLocaleChangedGreeting(lang = 'en') {
  const messagesByLocale = companionTranslations.localeChangedGreeting;
  return messagesByLocale[lang] || messagesByLocale.en;
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
