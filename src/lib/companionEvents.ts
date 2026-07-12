import {
  COMPANION_BEHAVIOR_TIMING,
  COMPANION_SYSTEM_EVENTS,
  type CompanionSystemEventType,
} from './companionBehaviorConfig.ts';

export const COMPANION_BEHAVIOR_EVENT = 'nexaeon:companion-behavior';

export type CompanionEventDetail = Readonly<{
  type: CompanionSystemEventType;
  duration?: number;
}>;

const VALID_EVENTS = new Set<string>(COMPANION_SYSTEM_EVENTS);

export function normalizeCompanionEventDetail(detail: unknown): CompanionEventDetail | null {
  if (!detail || typeof detail !== 'object') return null;
  const value = detail as { type?: unknown; duration?: unknown };
  if (typeof value.type !== 'string' || !VALID_EVENTS.has(value.type)) return null;
  const type = value.type as CompanionSystemEventType;
  const defaultDuration = type === 'reset' ? undefined : COMPANION_BEHAVIOR_TIMING.eventDuration[type];
  const duration = Number.isFinite(value.duration)
    ? Math.min(10_000, Math.max(500, Number(value.duration)))
    : defaultDuration;
  return duration == null ? { type } : { type, duration };
}

export function triggerCompanionEvent(detail: CompanionEventDetail, target: Window | null = typeof window === 'undefined' ? null : window): boolean {
  const normalized = normalizeCompanionEventDetail(detail);
  if (!target || !normalized) return false;
  target.dispatchEvent(new CustomEvent(COMPANION_BEHAVIOR_EVENT, { detail: normalized }));
  return true;
}
