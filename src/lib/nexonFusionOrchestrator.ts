import type { PrincessEventBridge } from './princessEventBridge.ts';
import { isTerminalFusionPhase, isValidFusionTransition, normalizeFusionOperationType, sanitizeFusionMetadata } from './nexonFusionPolicy.ts';
import type { NexonFusionContextId, NexonFusionMetadata, NexonFusionOperationType, NexonFusionPhase, NexonFusionToken } from './nexonFusionTypes.ts';

export function createNexonFusionOrchestrator({ eventBridge, now = Date.now, debug = false }: {
  eventBridge: PrincessEventBridge; now?: () => number; debug?: boolean;
}) {
  let active: NexonFusionMetadata | null = null;
  let generation = 0;
  let sequence = 0;
  let disposed = false;
  const seenSemanticKeys = new Map<string, number>();

  const log = (metadata: Partial<NexonFusionMetadata>, accepted: boolean, reason: string) => {
    if (!debug || typeof console === 'undefined') return;
    console.debug('[Nexon Fusion]', {
      fusionId: metadata.fusionId, requestId: metadata.requestId, phase: metadata.phase,
      operationType: metadata.operationType, resultType: metadata.resultType, accepted, reason,
    });
  };
  const tokenFor = (metadata: NexonFusionMetadata): NexonFusionToken => Object.freeze({
    fusionId: metadata.fusionId, requestId: metadata.requestId, generation: metadata.generation,
  });
  const dispatch = (metadata: NexonFusionMetadata) => {
    const semanticKey = `${metadata.requestId}:${metadata.operationType}:${metadata.phase}:${metadata.resultType || ''}`;
    const timestamp = now();
    for (const [key, seenAt] of seenSemanticKeys) if (timestamp - seenAt > 10_000) seenSemanticKeys.delete(key);
    if (seenSemanticKeys.has(semanticKey)) { log(metadata, false, 'semantic_deduplication'); return false; }
    seenSemanticKeys.set(semanticKey, timestamp);
    const accepted = eventBridge.emit({ type: 'nexon_fusion_state', fusion: metadata, timestamp });
    log(metadata, accepted, accepted ? 'dispatched' : 'bridge_ignored');
    return accepted;
  };

  return {
    start({ requestId, operationType = 'generic', contextId = 'navigator', initialPhase = 'listening' }: {
      requestId: string; operationType?: NexonFusionOperationType | string; contextId?: NexonFusionContextId; initialPhase?: 'listening' | 'guiding';
    }): NexonFusionToken | null {
      if (disposed || !requestId) return null;
      if (active?.requestId === requestId && !isTerminalFusionPhase(active.phase)) return tokenFor(active);
      generation += 1;
      const timestamp = now();
      const metadata = sanitizeFusionMetadata({
        fusionId: `fusion-${timestamp}-${++sequence}`, requestId, generation, phase: initialPhase,
        operationType: normalizeFusionOperationType(operationType), contextId, timestamp,
      });
      if (!metadata) return null;
      active = metadata;
      dispatch(metadata);
      return tokenFor(metadata);
    },
    transition(token: NexonFusionToken | null, phase: NexonFusionPhase, details: Partial<NexonFusionMetadata> = {}) {
      if (disposed || !token || !active) return false;
      if (token.generation !== generation || token.generation !== active.generation || token.requestId !== active.requestId || token.fusionId !== active.fusionId) {
        log({ ...details, ...token, phase }, false, 'stale_generation'); return false;
      }
      if (!isValidFusionTransition(active.phase, phase)) { log({ ...active, phase }, false, active.phase === phase ? 'duplicate_phase' : 'invalid_transition'); return false; }
      const metadata = sanitizeFusionMetadata({ ...active, ...details, phase, timestamp: now() });
      if (!metadata) { log({ ...active, phase }, false, 'invalid_metadata'); return false; }
      active = metadata;
      dispatch(metadata);
      return true;
    },
    abort(token: NexonFusionToken | null) {
      return this.transition(token, 'aborted', { resultType: 'aborted', recoverable: true });
    },
    getActive: () => active ? { ...active } : null,
    dispose() { disposed = true; active = null; seenSemanticKeys.clear(); generation += 1; },
  };
}

export type NexonFusionOrchestrator = ReturnType<typeof createNexonFusionOrchestrator>;
