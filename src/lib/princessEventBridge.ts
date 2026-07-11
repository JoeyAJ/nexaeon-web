export const PRINCESS_EVENT_TYPES = [
  'route_enter',
  'route_leave',
  'module_enter',
  'subpage_enter',
  'language_change',
  'theme_change',
  'scroll_milestone',
  'idle_long',
  'action_success',
  'action_error',
  'navigator_question_submitted',
  'navigator_response_started',
  'navigator_response_completed',
  'navigator_navigation_completed',
  'navigator_response_error',
  'navigator_response_aborted',
  'module_activity',
] as const;

export type PrincessEventType = (typeof PRINCESS_EVENT_TYPES)[number];
export type PrincessWebsiteState = 'idle' | 'walkLeft' | 'sit' | 'wave' | 'happy' | 'curious' | 'quiet' | 'rest' | 'sleep';

export const PRINCESS_MODULE_ACTION_TYPES = [
  'search-submitted', 'filter-applied', 'item-opened', 'item-expanded', 'item-closed',
  'demo-opened', 'external-demo-opened', 'course-opened', 'resource-opened',
  'project-opened', 'navigation-arrived', 'meaningful-action-completed', 'action-error',
] as const;
export type PrincessModuleActionType = (typeof PRINCESS_MODULE_ACTION_TYPES)[number];
export type PrincessModuleContextId = 'identity' | 'research' | 'coaching' | 'knowledge' | 'prototype' | 'action' | 'navigator';
export type PrincessModuleActivityEvent = {
  activityId: string;
  contextId: PrincessModuleContextId;
  actionType: PrincessModuleActionType;
  entityType?: string;
  errorCategory?: 'unavailable' | 'invalid-target' | 'network' | 'permission' | 'unknown';
  source: 'user' | 'navigator';
  timestamp: number;
};

export type PrincessWebsiteEvent = {
  type: PrincessEventType;
  key?: string;
  moduleId?: string;
  milestone?: 'half' | 'bottom';
  requestId?: string;
  targetRoute?: string;
  errorType?: 'network' | 'api' | 'rate_limit' | 'unknown';
  timestamp?: number;
  activity?: PrincessModuleActivityEvent;
};

export type PrincessEventRequest = {
  event: PrincessWebsiteEvent;
  state: PrincessWebsiteState;
  duration: number;
  priority: number;
  canWakeSleeping?: boolean;
};

type EventHandler = (request: PrincessEventRequest) => boolean;

export const PRINCESS_EVENT_COOLDOWNS: Readonly<Record<PrincessEventType, number>> = Object.freeze({
  route_enter: 12_000,
  route_leave: 0,
  module_enter: 8_000,
  subpage_enter: 60_000,
  language_change: 6_000,
  theme_change: 8_000,
  scroll_milestone: 30_000,
  idle_long: 0,
  action_success: 4_000,
  action_error: 4_000,
  navigator_question_submitted: 0,
  navigator_response_started: 0,
  navigator_response_completed: 4_000,
  navigator_navigation_completed: 1_500,
  navigator_response_error: 4_000,
  navigator_response_aborted: 0,
  module_activity: 0,
});

const EVENT_PRIORITIES: Readonly<Record<PrincessEventType, number>> = Object.freeze({
  action_success: 5,
  action_error: 5,
  navigator_response_error: 8,
  navigator_response_completed: 7,
  navigator_navigation_completed: 7,
  navigator_response_started: 6,
  navigator_question_submitted: 5,
  navigator_response_aborted: 9,
  module_enter: 4,
  route_enter: 3,
  route_leave: 3,
  subpage_enter: 3,
  language_change: 2,
  theme_change: 2,
  scroll_milestone: 1,
  idle_long: 0,
  module_activity: 4,
});

const MODULE_STATE: Readonly<Record<string, PrincessWebsiteState>> = Object.freeze({
  identity: 'curious',
  research: 'curious',
  teaching: 'happy',
  'knowledge-lab': 'curious',
  projects: 'wave',
  'field-lab': 'happy',
});

export const PRINCESS_EVENT_DURATIONS: Readonly<Partial<Record<PrincessEventType, number>>> = Object.freeze({
  module_enter: 2_400,
  subpage_enter: 2_400,
  language_change: 1_600,
  theme_change: 2_400,
  scroll_milestone: 2_400,
  action_success: 1_600,
  action_error: 2_400,
  navigator_question_submitted: 1_000,
  navigator_response_started: 2_400,
  navigator_response_completed: 2_000,
  navigator_navigation_completed: 1_800,
  navigator_response_error: 2_800,
  navigator_response_aborted: 0,
  module_activity: 2_000,
});

export const PRINCESS_MODULE_ACTIVITY_COOLDOWNS: Readonly<Record<PrincessModuleActionType, number>> = Object.freeze({
  'search-submitted': 3_000, 'filter-applied': 4_000, 'item-opened': 3_000,
  'item-expanded': 3_000, 'item-closed': 3_000, 'demo-opened': 6_000,
  'external-demo-opened': 6_000, 'course-opened': 5_000, 'resource-opened': 4_000,
  'project-opened': 5_000, 'navigation-arrived': 2_000,
  'meaningful-action-completed': 7_000, 'action-error': 5_000,
});

const MODULE_ACTIVITY_PRIORITY: Readonly<Record<PrincessModuleActionType, number>> = Object.freeze({
  'action-error': 6, 'meaningful-action-completed': 6, 'demo-opened': 5,
  'external-demo-opened': 5, 'course-opened': 5, 'project-opened': 5,
  'search-submitted': 4, 'filter-applied': 4, 'item-opened': 4,
  'item-expanded': 4, 'item-closed': 4, 'resource-opened': 4, 'navigation-arrived': 5,
});

const MODULE_REACTIONS: Readonly<Partial<Record<PrincessModuleContextId, Partial<Record<PrincessModuleActionType, PrincessWebsiteState>>>>> = Object.freeze({
  research: { 'search-submitted': 'curious', 'filter-applied': 'wave', 'item-opened': 'sit', 'item-expanded': 'wave', 'resource-opened': 'sit' },
  knowledge: { 'search-submitted': 'curious', 'filter-applied': 'wave', 'item-opened': 'sit', 'item-expanded': 'wave', 'resource-opened': 'sit' },
  coaching: { 'course-opened': 'curious', 'item-opened': 'curious', 'item-expanded': 'wave', 'resource-opened': 'sit' },
  prototype: { 'demo-opened': 'happy', 'external-demo-opened': 'wave', 'item-opened': 'curious', 'filter-applied': 'wave' },
  action: { 'project-opened': 'curious', 'item-opened': 'curious', 'item-expanded': 'wave', 'filter-applied': 'wave' },
  identity: { 'item-opened': 'sit', 'item-expanded': 'wave', 'filter-applied': 'wave' },
  navigator: { 'navigation-arrived': 'wave' },
});

function mapModuleActivity(activity: PrincessModuleActivityEvent): PrincessEventRequest {
  const fallback: Partial<Record<PrincessModuleActionType, PrincessWebsiteState>> = {
    'search-submitted': 'curious', 'filter-applied': 'wave', 'item-opened': 'sit',
    'item-expanded': 'wave', 'item-closed': 'sit', 'demo-opened': 'happy',
    'external-demo-opened': 'wave', 'course-opened': 'curious', 'resource-opened': 'sit',
    'project-opened': 'curious', 'navigation-arrived': 'wave',
    'meaningful-action-completed': 'happy', 'action-error': 'quiet',
  };
  return {
    event: { type: 'module_activity', activity },
    state: MODULE_REACTIONS[activity.contextId]?.[activity.actionType] || fallback[activity.actionType] || 'curious',
    duration: activity.contextId === 'identity' ? 1_400 : 2_000,
    priority: MODULE_ACTIVITY_PRIORITY[activity.actionType],
    canWakeSleeping: ['meaningful-action-completed', 'demo-opened', 'project-opened', 'navigation-arrived'].includes(activity.actionType),
  };
}

export function mapPrincessEvent(event: PrincessWebsiteEvent): PrincessEventRequest | null {
  if (event.type === 'module_activity' && event.activity) return mapModuleActivity(event.activity);
  let state: PrincessWebsiteState | null = null;

  if (event.type === 'module_enter') state = MODULE_STATE[event.moduleId || ''] || 'curious';
  if (event.type === 'subpage_enter') state = 'curious';
  if (event.type === 'language_change') state = 'wave';
  if (event.type === 'theme_change') state = 'curious';
  if (event.type === 'scroll_milestone') state = event.milestone === 'bottom' ? 'happy' : 'curious';
  if (event.type === 'action_success') state = 'happy';
  if (event.type === 'action_error') state = 'quiet';
  if (event.type === 'navigator_question_submitted') state = 'curious';
  if (event.type === 'navigator_response_started') state = 'sit';
  if (event.type === 'navigator_response_completed') state = 'happy';
  if (event.type === 'navigator_navigation_completed') state = 'happy';
  if (event.type === 'navigator_response_error') state = 'quiet';
  if (event.type === 'navigator_response_aborted') state = 'idle';

  if (!state) return null;
  return {
    event,
    state,
    duration: PRINCESS_EVENT_DURATIONS[event.type] || 2_400,
    priority: EVENT_PRIORITIES[event.type],
  };
}

export function createPrincessEventBridge({ now = Date.now, debug = false } = {}) {
  const handlers = new Set<EventHandler>();
  const allowedAt = new Map<string, number>();
  let pending: PrincessEventRequest | null = null;
  let flushScheduled = false;
  let activeNavigatorRequestId: string | null = null;
  let navigatorTerminalEvent: PrincessEventType | null = null;
  let routeEventsSuppressedUntil = 0;
  let reactionCooldownMultiplier = 1;
  const seenNavigatorRequestIds = new Set<string>();
  const seenActivityIds = new Map<string, number>();
  const recentActivityAt = new Map<string, number>();
  let activityBurst: number[] = [];
  let moduleContextAllowedAt = 0;

  const log = (event: PrincessWebsiteEvent, accepted: boolean, reason: string) => {
    if (!debug || typeof console === 'undefined') return;
    console.debug('[Princess Event Bridge]', {
      event: event.type,
      requestId: event.requestId,
      activityId: event.activity?.activityId,
      contextId: event.activity?.contextId,
      actionType: event.activity?.actionType,
      accepted,
      reason,
    });
  };

  const validateNavigatorEvent = (event: PrincessWebsiteEvent) => {
    if (!event.type.startsWith('navigator_')) return { accepted: true, reason: 'website_event' };
    if (!event.requestId) return { accepted: false, reason: 'missing_request_id' };

    if (event.type === 'navigator_question_submitted') {
      if (seenNavigatorRequestIds.has(event.requestId)) {
        return { accepted: false, reason: 'duplicate_submission' };
      }
      seenNavigatorRequestIds.add(event.requestId);
      activeNavigatorRequestId = event.requestId;
      navigatorTerminalEvent = null;
      return { accepted: true, reason: 'active_request_started' };
    }

    if (event.requestId !== activeNavigatorRequestId) {
      return { accepted: false, reason: 'stale_request' };
    }
    if (navigatorTerminalEvent && event.type !== 'navigator_navigation_completed') {
      return { accepted: false, reason: 'request_already_terminal' };
    }
    if (event.type === 'navigator_response_completed' || event.type === 'navigator_response_error' || event.type === 'navigator_response_aborted') {
      navigatorTerminalEvent = event.type;
    }
    if (event.type === 'navigator_navigation_completed') {
      routeEventsSuppressedUntil = now() + PRINCESS_EVENT_COOLDOWNS.navigator_navigation_completed;
    }
    return { accepted: true, reason: 'active_request' };
  };

  const getCooldownKey = (event: PrincessWebsiteEvent) => `${event.type}:${event.key || event.moduleId || ''}`;

  const flush = () => {
    flushScheduled = false;
    const request = pending;
    pending = null;
    if (!request) return;

    const accepted = Array.from(handlers).some((handler) => handler(request));
    if (!accepted) return;

    const cooldownKey = getCooldownKey(request.event);
    const multiplier = request.event.type.startsWith('navigator_') ? 1 : reactionCooldownMultiplier;
    allowedAt.set(cooldownKey, now() + (PRINCESS_EVENT_COOLDOWNS[request.event.type] * multiplier));
  };

  return {
    emit(event: PrincessWebsiteEvent) {
      if (event.type === 'module_activity') {
        const activity = event.activity;
        if (!activity || !activity.activityId || !PRINCESS_MODULE_ACTION_TYPES.includes(activity.actionType)) {
          log(event, false, 'invalid_activity'); return false;
        }
        const timestamp = now();
        for (const [activityId, seenAt] of seenActivityIds) {
          if (timestamp - seenAt > 10_000) seenActivityIds.delete(activityId);
        }
        if (seenActivityIds.has(activity.activityId)) { log(event, false, 'duplicate_activity_id'); return false; }
        activityBurst = activityBurst.filter((at) => timestamp - at < 2_000);
        if (activityBurst.length >= 3) { log(event, false, 'burst_protection'); return false; }
        const dedupKey = `${activity.contextId}:${activity.actionType}:${activity.entityType || ''}`;
        const cooldown = PRINCESS_MODULE_ACTIVITY_COOLDOWNS[activity.actionType] * reactionCooldownMultiplier;
        if (timestamp < (recentActivityAt.get(dedupKey) || 0) || (timestamp < moduleContextAllowedAt && activity.actionType !== 'action-error')) {
          log(event, false, 'activity_cooldown'); return false;
        }
        seenActivityIds.set(activity.activityId, timestamp);
        recentActivityAt.set(dedupKey, timestamp + cooldown);
        moduleContextAllowedAt = timestamp + Math.min(2_000, cooldown / 2);
        activityBurst.push(timestamp);
      }
      if ((event.type === 'module_enter' || event.type === 'subpage_enter' || event.type === 'route_enter') && now() < routeEventsSuppressedUntil) {
        log(event, false, 'navigator_navigation_deduplication');
        return false;
      }
      const validation = validateNavigatorEvent(event);
      if (!validation.accepted) {
        log(event, false, validation.reason);
        return false;
      }
      const request = mapPrincessEvent(event);
      if (!request) {
        log(event, false, 'unmapped_event');
        return false;
      }
      const cooldownKey = getCooldownKey(event);
      if (now() < (allowedAt.get(cooldownKey) || 0)) {
        log(event, false, 'cooldown');
        return false;
      }

      if (!pending || request.priority > pending.priority) pending = request;
      if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(flush);
      }
      log(event, true, 'queued');
      return true;
    },
    subscribe(handler: EventHandler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    setContextProfile(profile: { reactionCooldownMultiplier?: number } | null) {
      const nextMultiplier = profile?.reactionCooldownMultiplier;
      reactionCooldownMultiplier = Number.isFinite(nextMultiplier) && Number(nextMultiplier) > 0
        ? Number(nextMultiplier)
        : 1;
    },
  };
}

export type PrincessEventBridge = ReturnType<typeof createPrincessEventBridge>;
