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
] as const;

export type PrincessEventType = (typeof PRINCESS_EVENT_TYPES)[number];
export type PrincessWebsiteState = 'walkLeft' | 'sit' | 'wave' | 'happy' | 'curious' | 'quiet' | 'rest' | 'sleep';

export type PrincessWebsiteEvent = {
  type: PrincessEventType;
  key?: string;
  moduleId?: string;
  milestone?: 'half' | 'bottom';
};

export type PrincessEventRequest = {
  event: PrincessWebsiteEvent;
  state: PrincessWebsiteState;
  duration: number;
  priority: number;
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
});

const EVENT_PRIORITIES: Readonly<Record<PrincessEventType, number>> = Object.freeze({
  action_success: 5,
  action_error: 5,
  module_enter: 4,
  route_enter: 3,
  route_leave: 3,
  subpage_enter: 3,
  language_change: 2,
  theme_change: 2,
  scroll_milestone: 1,
  idle_long: 0,
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
});

export function mapPrincessEvent(event: PrincessWebsiteEvent): PrincessEventRequest | null {
  let state: PrincessWebsiteState | null = null;

  if (event.type === 'module_enter') state = MODULE_STATE[event.moduleId || ''] || 'curious';
  if (event.type === 'subpage_enter') state = 'curious';
  if (event.type === 'language_change') state = 'wave';
  if (event.type === 'theme_change') state = 'curious';
  if (event.type === 'scroll_milestone') state = event.milestone === 'bottom' ? 'happy' : 'curious';
  if (event.type === 'action_success') state = 'happy';
  if (event.type === 'action_error') state = 'quiet';

  if (!state) return null;
  return {
    event,
    state,
    duration: PRINCESS_EVENT_DURATIONS[event.type] || 2_400,
    priority: EVENT_PRIORITIES[event.type],
  };
}

export function createPrincessEventBridge({ now = Date.now } = {}) {
  const handlers = new Set<EventHandler>();
  const allowedAt = new Map<string, number>();
  let pending: PrincessEventRequest | null = null;
  let flushScheduled = false;

  const getCooldownKey = (event: PrincessWebsiteEvent) => `${event.type}:${event.key || event.moduleId || ''}`;

  const flush = () => {
    flushScheduled = false;
    const request = pending;
    pending = null;
    if (!request) return;

    const accepted = Array.from(handlers).some((handler) => handler(request));
    if (!accepted) return;

    const cooldownKey = getCooldownKey(request.event);
    allowedAt.set(cooldownKey, now() + PRINCESS_EVENT_COOLDOWNS[request.event.type]);
  };

  return {
    emit(event: PrincessWebsiteEvent) {
      const request = mapPrincessEvent(event);
      if (!request) return false;
      const cooldownKey = getCooldownKey(event);
      if (now() < (allowedAt.get(cooldownKey) || 0)) return false;

      if (!pending || request.priority > pending.priority) pending = request;
      if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(flush);
      }
      return true;
    },
    subscribe(handler: EventHandler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
}

export type PrincessEventBridge = ReturnType<typeof createPrincessEventBridge>;
