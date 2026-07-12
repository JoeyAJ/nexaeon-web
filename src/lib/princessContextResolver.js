export const PRINCESS_CONTEXT_IDS = Object.freeze({
  HOME: 'home',
  IDENTITY: 'identity',
  RESEARCH: 'research',
  COACHING: 'coaching',
  KNOWLEDGE: 'knowledge',
  PROTOTYPE: 'prototype',
  ACTION: 'action',
  NAVIGATOR: 'navigator',
  GENERIC: 'generic',
});

const profile = (value) => Object.freeze({
  ...value,
  preferredPersistentStates: Object.freeze(value.preferredPersistentStates),
  idleAnimationPool: Object.freeze(value.idleAnimationPool),
  presenceBias: Object.freeze(value.presenceBias),
});

export const PRINCESS_CONTEXT_PROFILES = Object.freeze({
  home: profile({ id: 'home', preferredPersistentStates: ['activeIdle', 'calmIdle'], idleAnimationPool: ['idle', 'sitting_smile', 'sit'], presenceBias: { calm: 1.2, rest: 1.25, sleep: 1.5 }, restBias: 0.8, attentionBias: 1.2, reactionCooldownMultiplier: 0.9, preferredAnchor: 'bottomRight', allowAutoSleep: true }),
  identity: profile({ id: 'identity', preferredPersistentStates: ['calmIdle', 'activeIdle'], idleAnimationPool: ['sitting_smile', 'sit', 'idle'], presenceBias: { calm: 0.85, rest: 1, sleep: 1.15 }, restBias: 1, attentionBias: 0.75, reactionCooldownMultiplier: 1.2, preferredAnchor: 'bottomRight', allowAutoSleep: true }),
  research: profile({ id: 'research', preferredPersistentStates: ['calmIdle', 'resting'], idleAnimationPool: ['sitting_smile', 'sit', 'idle'], presenceBias: { calm: 0.75, rest: 0.85, sleep: 1.2 }, restBias: 1.2, attentionBias: 0.65, reactionCooldownMultiplier: 1.3, preferredAnchor: 'bottomRight', allowAutoSleep: true }),
  coaching: profile({ id: 'coaching', preferredPersistentStates: ['activeIdle', 'calmIdle'], idleAnimationPool: ['idle', 'sitting_smile', 'sit'], presenceBias: { calm: 1, rest: 1.05, sleep: 1.2 }, restBias: 0.9, attentionBias: 1.05, reactionCooldownMultiplier: 1, preferredAnchor: 'bottomRight', allowAutoSleep: true }),
  knowledge: profile({ id: 'knowledge', preferredPersistentStates: ['calmIdle', 'resting', 'sleeping'], idleAnimationPool: ['sitting_smile', 'sit', 'idle'], presenceBias: { calm: 0.7, rest: 0.8, sleep: 0.95 }, restBias: 1.25, attentionBias: 0.55, reactionCooldownMultiplier: 1.35, preferredAnchor: 'bottomRight', allowAutoSleep: true }),
  prototype: profile({ id: 'prototype', preferredPersistentStates: ['activeIdle', 'calmIdle'], idleAnimationPool: ['idle', 'sitting_smile', 'sit'], presenceBias: { calm: 1.15, rest: 1.2, sleep: 1.35 }, restBias: 0.75, attentionBias: 1.2, reactionCooldownMultiplier: 0.9, preferredAnchor: 'bottomRight', allowAutoSleep: true }),
  action: profile({ id: 'action', preferredPersistentStates: ['activeIdle', 'calmIdle'], idleAnimationPool: ['idle', 'sitting_smile', 'sit'], presenceBias: { calm: 1.2, rest: 1.25, sleep: 1.4 }, restBias: 0.7, attentionBias: 1.15, reactionCooldownMultiplier: 0.9, preferredAnchor: 'bottomRight', allowAutoSleep: true }),
  navigator: profile({ id: 'navigator', preferredPersistentStates: ['calmIdle', 'activeIdle'], idleAnimationPool: ['sitting_smile', 'sit', 'idle'], presenceBias: { calm: 0.8, rest: 1.1, sleep: 1.25 }, restBias: 0.9, attentionBias: 0.8, reactionCooldownMultiplier: 1.1, preferredAnchor: 'bottomLeft', allowAutoSleep: true }),
  generic: profile({ id: 'generic', preferredPersistentStates: ['calmIdle', 'activeIdle'], idleAnimationPool: ['sitting_smile', 'idle', 'sit'], presenceBias: { calm: 0.9, rest: 1, sleep: 1 }, restBias: 1, attentionBias: 0.8, reactionCooldownMultiplier: 1, preferredAnchor: 'bottomRight', allowAutoSleep: true }),
});

export function resolvePrincessContext({ pathname = '/', routeKey, locale, viewportCategory } = {}) {
  const normalized = String(pathname || '/').split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  let id = PRINCESS_CONTEXT_IDS.GENERIC;
  if (normalized === '/') id = PRINCESS_CONTEXT_IDS.HOME;
  else if (normalized === '/identity/nexaeon-navigator') id = PRINCESS_CONTEXT_IDS.NAVIGATOR;
  else if (normalized === '/identity' || normalized.startsWith('/identity/')) id = PRINCESS_CONTEXT_IDS.IDENTITY;
  else if (normalized === '/research' || normalized.startsWith('/research/')) id = PRINCESS_CONTEXT_IDS.RESEARCH;
  else if (normalized === '/teaching' || normalized.startsWith('/teaching/')) id = PRINCESS_CONTEXT_IDS.COACHING;
  else if (normalized === '/knowledge-lab' || normalized.startsWith('/knowledge-lab/')) id = PRINCESS_CONTEXT_IDS.KNOWLEDGE;
  else if (normalized === '/projects' || normalized.startsWith('/projects/')) id = PRINCESS_CONTEXT_IDS.PROTOTYPE;
  else if (normalized === '/field-lab' || normalized.startsWith('/field-lab/')) id = PRINCESS_CONTEXT_IDS.ACTION;
  return {
    id,
    pathname: normalized,
    routeKey: routeKey || null,
    locale: locale || null,
    viewportCategory: viewportCategory || null,
    profile: getPrincessContextProfile(id),
  };
}

export function getPrincessContextProfile(contextId) {
  return PRINCESS_CONTEXT_PROFILES[contextId] || PRINCESS_CONTEXT_PROFILES.generic;
}

export function selectContextIdleAnimation(contextProfile, persistentState) {
  return getCompanionInactivityBehavior(persistentState, contextProfile?.id).pose;
}

export function selectContextCompanionBehavior(contextProfile, persistentState = 'activeIdle') {
  return persistentState === 'activeIdle'
    ? getCompanionModuleBehavior(contextProfile?.id)
    : getCompanionInactivityBehavior(persistentState, contextProfile?.id);
}

export function getContextPreferredPosition({ preferredAnchor = 'bottomRight', viewport, size, safeArea, savedPosition = null }) {
  if (savedPosition) return { position: savedPosition, source: 'saved', corrected: false };
  const x = preferredAnchor === 'bottomLeft'
    ? safeArea.left
    : viewport.width - safeArea.right - size.width;
  return {
    position: {
      x: Math.max(safeArea.left, Math.min(x, viewport.width - safeArea.right - size.width)),
      y: Math.max(safeArea.top, viewport.height - safeArea.bottom - size.height),
    },
    source: 'context_anchor',
    corrected: false,
  };
}

export function correctContextPositionOnce({ position, viewport, size, safeArea, alreadyCorrected = false }) {
  if (alreadyCorrected) return { position, corrected: false };
  const correctedPosition = {
    x: Math.max(safeArea.left, Math.min(position.x, viewport.width - safeArea.right - size.width)),
    y: Math.max(safeArea.top, Math.min(position.y, viewport.height - safeArea.bottom - size.height)),
  };
  const corrected = correctedPosition.x !== position.x || correctedPosition.y !== position.y;
  return { position: corrected ? correctedPosition : position, corrected };
}
import { getCompanionInactivityBehavior, getCompanionModuleBehavior } from './companionBehaviorConfig.ts';
