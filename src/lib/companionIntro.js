export const COMPANION_INTRO_EVENT = 'nexaeon:companion-intro';
export const INTRO_SEEN_KEY = 'nexaeon_intro_seen';
export const INTRO_DOCKED_KEY = 'nexaeon_princess_intro_docked';

// Calibrated against public/assets/nexaeon-hero-v1.3.mov (890×720, 8.00s, 24fps).
export const COMPANION_INTRO_TIMELINE = Object.freeze({
  expectedDuration: 8,
  summonStart: 3.5,
  materializeStart: 3.65,
  finalLightPoint: 5.25,
  emergenceEnd: 5.85,
  greetingStart: 5.95,
  dockStart: 7.15,
  complete: 7.9,
});

export const INTRO_LIGHT_POINT = Object.freeze({ x: 445, y: 310, width: 890, height: 720 });

export const INTRO_GREETING = Object.freeze({
  zh: '你好，我是 Princess。很高興再次陪你一起探索 NexAeon。',
  ko: '안녕하세요, Princess예요. 다시 함께 NexAeon을 탐험하게 되어 반가워요.',
  en: 'Hello, I’m Princess. I’m glad to explore NexAeon with you again.',
});

export function hasSeenCompanionIntro(storage) {
  try {
    return storage?.getItem(INTRO_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markCompanionIntroSeen(storage) {
  try {
    storage?.setItem(INTRO_SEEN_KEY, 'true');
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function hasCompanionIntroDocked(storage) {
  try {
    return storage?.getItem(INTRO_DOCKED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markCompanionIntroDocked(storage, docked = true) {
  try {
    if (docked) storage?.setItem(INTRO_DOCKED_KEY, 'true');
    else storage?.removeItem(INTRO_DOCKED_KEY);
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function clampIntroProgress(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function getCompanionIntroFrame(currentTime, timeline = COMPANION_INTRO_TIMELINE) {
  const time = Number.isFinite(currentTime) ? currentTime : 0;
  const materializeProgress = clampIntroProgress(
    (time - timeline.materializeStart) / (timeline.finalLightPoint - timeline.materializeStart),
  );
  const emergenceProgress = clampIntroProgress(
    (time - timeline.finalLightPoint) / (timeline.emergenceEnd - timeline.finalLightPoint),
  );
  const dockingProgress = clampIntroProgress(
    (time - timeline.dockStart) / (timeline.complete - timeline.dockStart),
  );
  let phase = 'dormant';
  if (time >= timeline.complete) phase = 'active';
  else if (time >= timeline.dockStart) phase = 'docking';
  else if (time >= timeline.greetingStart) phase = 'greeting';
  else if (time >= timeline.finalLightPoint) phase = 'emerging';
  else if (time >= timeline.summonStart) phase = 'materializing';
  return { phase, materializeProgress, emergenceProgress, dockingProgress, currentTime: time };
}

export function mapVideoPointToViewport({ point = INTRO_LIGHT_POINT, videoRect, videoWidth, videoHeight, objectFit = 'contain' }) {
  const sourceWidth = videoWidth || point.width;
  const sourceHeight = videoHeight || point.height;
  const scale = objectFit === 'cover'
    ? Math.max(videoRect.width / sourceWidth, videoRect.height / sourceHeight)
    : Math.min(videoRect.width / sourceWidth, videoRect.height / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  return {
    x: videoRect.left + (videoRect.width - renderedWidth) / 2 + point.x * scale,
    y: videoRect.top + (videoRect.height - renderedHeight) / 2 + point.y * scale,
  };
}

export function dispatchCompanionIntro(detail, windowTarget = typeof window === 'undefined' ? null : window) {
  windowTarget?.dispatchEvent?.(new CustomEvent(COMPANION_INTRO_EVENT, { detail }));
}
