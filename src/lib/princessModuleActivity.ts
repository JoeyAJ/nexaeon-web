import type {
  PrincessEventBridge,
  PrincessEventType,
  PrincessModuleActionType,
  PrincessModuleActivityEvent,
  PrincessModuleContextId,
  PrincessWebsiteEvent,
} from './princessEventBridge';

let sequence = 0;
const SAFE_ERROR_CATEGORIES = new Set(['unavailable', 'invalid-target', 'network', 'permission', 'unknown']);

export function createPrincessModuleActivityAdapter(eventBridge: PrincessEventBridge, contextId: PrincessModuleContextId, now = Date.now) {
  const emit = (type: PrincessEventType, options: Omit<PrincessWebsiteEvent, 'type' | 'moduleId' | 'timestamp'> = {}) => eventBridge.emit({
    ...options,
    type,
    moduleId: contextId,
    timestamp: now(),
  });
  const dispatch = (actionType: PrincessModuleActionType, options: { entityType?: string; source?: 'user' | 'navigator'; errorCategory?: string } = {}) => {
    const timestamp = now();
    const activity: PrincessModuleActivityEvent = {
      activityId: `${contextId}-${timestamp}-${++sequence}`,
      contextId,
      actionType,
      source: options.source === 'navigator' ? 'navigator' : 'user',
      timestamp,
    };
    if (options.entityType) activity.entityType = String(options.entityType).replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'item';
    if (actionType === 'action-error') activity.errorCategory = SAFE_ERROR_CATEGORIES.has(options.errorCategory || '')
      ? options.errorCategory as PrincessModuleActivityEvent['errorCategory'] : 'unknown';
    return eventBridge.emit({ type: 'module_activity', activity });
  };

  return {
    emit,
    dispatch,
    search(resultCount: number, options: { entityType?: string; key?: string } = {}) {
      dispatch('search-submitted', { entityType: options.entityType || 'item' });
      emit('search_start', { key: options.key || contextId });
      queueMicrotask(() => emit(resultCount > 0 ? 'search_success' : 'search_empty', { key: options.key || contextId }));
    },
  };
}
