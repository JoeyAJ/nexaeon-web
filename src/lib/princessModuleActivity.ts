import type { PrincessEventBridge, PrincessModuleActionType, PrincessModuleActivityEvent, PrincessModuleContextId } from './princessEventBridge';

let sequence = 0;
const SAFE_ERROR_CATEGORIES = new Set(['unavailable', 'invalid-target', 'network', 'permission', 'unknown']);

export function createPrincessModuleActivityAdapter(eventBridge: PrincessEventBridge, contextId: PrincessModuleContextId, now = Date.now) {
  return {
    dispatch(actionType: PrincessModuleActionType, options: { entityType?: string; source?: 'user' | 'navigator'; errorCategory?: string } = {}) {
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
    },
  };
}
