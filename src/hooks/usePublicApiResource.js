import { useCallback, useEffect, useRef, useState } from 'react';
import {
  classifyPublicApiError,
  fetchPublicApiResource,
  normalizePublicApiPayload,
  PUBLIC_RESOURCE_STATUS,
} from '../lib/publicApiClient.js';

let companionResourceSequence = 0;
const COMPANION_LOADING_DELAY = 300;

function createIdleState() {
  return {
    payload: null,
    items: [],
    status: PUBLIC_RESOURCE_STATUS.IDLE,
    errorType: null,
    isLoading: false,
    isRefreshing: false,
    retryCount: 0,
  };
}

export function shouldIgnorePublicApiError(errorType) {
  return errorType === 'aborted';
}

export function shouldApplyPublicApiResponse(activeRequestId, requestId, isAborted = false) {
  return activeRequestId === requestId && !isAborted;
}

export function resolvePublicApiNextState(current, event) {
  if (event.type === 'start') {
    const hasItems = current.items.length > 0;
    return {
      ...current,
      status: hasItems ? current.status : PUBLIC_RESOURCE_STATUS.LOADING,
      errorType: null,
      isLoading: !hasItems,
      isRefreshing: hasItems,
    };
  }

  if (event.type === 'success') {
    return {
      payload: event.payload,
      items: event.items,
      status: event.status,
      errorType: null,
      isLoading: false,
      isRefreshing: false,
      retryCount: current.retryCount,
    };
  }

  if (event.type === 'error') {
    return {
      ...current,
      payload: current.payload || event.fallbackPayload || null,
      items: current.items.length ? current.items : event.fallbackItems || [],
      status: PUBLIC_RESOURCE_STATUS.ERROR,
      errorType: event.errorType,
      isLoading: false,
      isRefreshing: false,
    };
  }

  if (event.type === 'retry') {
    return {
      ...current,
      retryCount: current.retryCount + 1,
    };
  }

  return current;
}

function normalizeClientFallback(createClientFallbackPayload) {
  if (typeof createClientFallbackPayload !== 'function') return { payload: null, items: [] };
  const fallback = createClientFallbackPayload();
  const normalized = normalizePublicApiPayload(fallback);
  if (!normalized.ok) return { payload: null, items: [] };
  return { payload: normalized.payload, items: normalized.items };
}

export function usePublicApiResource(endpoint, options = {}) {
  const { timeoutMs, createClientFallbackPayload, companionEventAdapter } = options;
  const [resourceState, setResourceState] = useState(createIdleState);
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const hasResolvedDataRef = useRef(false);
  const companionLoadingTimerRef = useRef(null);

  const clearCompanionLoadingTimer = useCallback(() => {
    if (companionLoadingTimerRef.current === null) return;
    clearTimeout(companionLoadingTimerRef.current);
    companionLoadingTimerRef.current = null;
  }, []);

  const load = useCallback(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    abortRef.current?.abort(new DOMException('Request replaced', 'AbortError'));
    const controller = new AbortController();
    abortRef.current = controller;
    const companionRequestId = `resource-${++companionResourceSequence}-${String(endpoint || 'unknown').replace(/[^a-z0-9_-]/gi, '').slice(0, 36)}`;
    const isBackgroundRefresh = hasResolvedDataRef.current;

    clearCompanionLoadingTimer();
    if (!isBackgroundRefresh && companionEventAdapter?.emit) {
      companionLoadingTimerRef.current = setTimeout(() => {
        companionLoadingTimerRef.current = null;
        if (!controller.signal.aborted) companionEventAdapter.emit('data_loading', { requestId: companionRequestId, key: endpoint });
      }, COMPANION_LOADING_DELAY);
    }

    setResourceState((current) => resolvePublicApiNextState(current, { type: 'start' }));

    fetchPublicApiResource(endpoint, { signal: controller.signal, timeoutMs })
      .then((result) => {
        if (!shouldApplyPublicApiResponse(requestIdRef.current, requestId, controller.signal.aborted)) return;
        clearCompanionLoadingTimer();
        hasResolvedDataRef.current = true;
        if (!isBackgroundRefresh) companionEventAdapter?.emit?.('data_success', { requestId: companionRequestId, key: endpoint });
        setResourceState((current) => resolvePublicApiNextState(current, {
          type: 'success',
          payload: result.payload,
          items: result.items,
          status: result.status,
        }));
      })
      .catch((error) => {
        const errorType = classifyPublicApiError(error);
        clearCompanionLoadingTimer();
        if (shouldIgnorePublicApiError(errorType) || !shouldApplyPublicApiResponse(requestIdRef.current, requestId)) {
          companionEventAdapter?.emit?.('data_aborted', { requestId: companionRequestId, key: endpoint });
          return;
        }

        const fallback = normalizeClientFallback(createClientFallbackPayload);
        hasResolvedDataRef.current = fallback.items.length > 0;
        companionEventAdapter?.emit?.('data_error', { requestId: companionRequestId, key: endpoint });
        setResourceState((current) => resolvePublicApiNextState(current, {
          type: 'error',
          errorType,
          fallbackPayload: fallback.payload,
          fallbackItems: fallback.items,
        }));
      });
  }, [clearCompanionLoadingTimer, companionEventAdapter, createClientFallbackPayload, endpoint, timeoutMs]);

  const retry = useCallback(() => {
    setResourceState((current) => resolvePublicApiNextState(current, { type: 'retry' }));
    load();
  }, [load]);

  useEffect(() => {
    let isActive = true;
    queueMicrotask(() => {
      if (isActive) load();
    });

    return () => {
      isActive = false;
      clearCompanionLoadingTimer();
      requestIdRef.current += 1;
      abortRef.current?.abort(new DOMException('Component unmounted', 'AbortError'));
    };
  }, [clearCompanionLoadingTimer, load]);

  return {
    ...(resourceState.payload || {}),
    ...resourceState,
    resourceStatus: resourceState.status,
    retry,
  };
}
