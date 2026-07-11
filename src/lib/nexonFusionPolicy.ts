import {
  NEXON_FUSION_OPERATION_TYPES,
  NEXON_FUSION_PHASES,
  NEXON_FUSION_RESULT_TYPES,
  type NexonFusionMetadata,
  type NexonFusionOperationType,
  type NexonFusionPhase,
  type NexonFusionResultType,
} from './nexonFusionTypes.ts';

const ACTIVE_PHASES = new Set<NexonFusionPhase>(['listening', 'interpreting', 'retrieving', 'connecting', 'guiding']);
const TERMINAL_PHASES = new Set<NexonFusionPhase>(['resolved', 'needsClarification', 'uncertain', 'unavailable', 'failed', 'aborted']);
const ALLOWED_TRANSITIONS: Readonly<Record<NexonFusionPhase, readonly NexonFusionPhase[]>> = Object.freeze({
  dormant: ['listening', 'guiding'],
  listening: ['interpreting', 'retrieving', 'connecting', 'guiding', 'needsClarification', 'uncertain', 'unavailable', 'failed', 'aborted'],
  interpreting: ['retrieving', 'connecting', 'guiding', 'needsClarification', 'uncertain', 'unavailable', 'failed', 'aborted'],
  retrieving: ['connecting', 'guiding', 'resolved', 'needsClarification', 'uncertain', 'unavailable', 'failed', 'aborted'],
  connecting: ['guiding', 'resolved', 'needsClarification', 'uncertain', 'unavailable', 'failed', 'aborted'],
  guiding: ['resolved', 'needsClarification', 'uncertain', 'unavailable', 'failed', 'aborted'],
  resolved: [], needsClarification: [], uncertain: [], unavailable: [], failed: [], aborted: [],
});

export function isValidFusionTransition(previous: NexonFusionPhase, next: NexonFusionPhase) {
  if (!NEXON_FUSION_PHASES.includes(previous) || !NEXON_FUSION_PHASES.includes(next) || previous === next) return false;
  if (ACTIVE_PHASES.has(previous) && (next === 'failed' || next === 'aborted')) return true;
  return ALLOWED_TRANSITIONS[previous]?.includes(next) || false;
}

export function isTerminalFusionPhase(phase: NexonFusionPhase) {
  return TERMINAL_PHASES.has(phase);
}

export function normalizeFusionOperationType(value: unknown): NexonFusionOperationType {
  return NEXON_FUSION_OPERATION_TYPES.includes(value as NexonFusionOperationType)
    ? value as NexonFusionOperationType : 'generic';
}

export function sanitizeFusionMetadata(value: Partial<NexonFusionMetadata>): NexonFusionMetadata | null {
  if (!value || typeof value !== 'object') return null;
  if (!value.fusionId || !value.requestId || !Number.isFinite(value.generation) || !Number.isFinite(value.timestamp)) return null;
  if (!NEXON_FUSION_PHASES.includes(value.phase as NexonFusionPhase)) return null;
  const resultType = NEXON_FUSION_RESULT_TYPES.includes(value.resultType as NexonFusionResultType) ? value.resultType : undefined;
  const metadata: NexonFusionMetadata = {
    fusionId: String(value.fusionId).slice(0, 96), requestId: String(value.requestId).slice(0, 96),
    generation: Number(value.generation), phase: value.phase as NexonFusionPhase,
    operationType: normalizeFusionOperationType(value.operationType), timestamp: Number(value.timestamp),
  };
  if (resultType) metadata.resultType = resultType;
  if (['none', 'partial', 'available'].includes(value.sourceAvailability || '')) metadata.sourceAvailability = value.sourceAvailability;
  if (['none', 'available'].includes(value.citationStatus || '')) metadata.citationStatus = value.citationStatus;
  if (['none', 'available', 'completed'].includes(value.navigationStatus || '')) metadata.navigationStatus = value.navigationStatus;
  if (typeof value.clarificationRequired === 'boolean') metadata.clarificationRequired = value.clarificationRequired;
  if (typeof value.recoverable === 'boolean') metadata.recoverable = value.recoverable;
  if (['identity', 'research', 'coaching', 'knowledge', 'prototype', 'action', 'navigator', 'generic'].includes(value.contextId || '')) metadata.contextId = value.contextId;
  return metadata;
}

export function deriveFusionOutcome({ ok, status, mode, reason, citationCount, partialSources }: {
  ok: boolean; status?: number; mode?: string; reason?: string; citationCount?: number; partialSources?: boolean;
}): Pick<NexonFusionMetadata, 'phase' | 'resultType' | 'sourceAvailability' | 'citationStatus' | 'clarificationRequired' | 'recoverable'> {
  const citationsAvailable = Number(citationCount) > 0;
  const common = { citationStatus: citationsAvailable ? 'available' as const : 'none' as const };
  if (!ok) return { ...common, phase: status === 429 ? 'unavailable' : 'failed', resultType: status === 429 ? 'unavailable' : 'failed', sourceAvailability: 'none', recoverable: true };
  if (reason === 'moderated') return { ...common, phase: 'needsClarification', resultType: 'clarification', sourceAvailability: citationsAvailable ? 'available' : 'none', clarificationRequired: true, recoverable: true };
  if (reason === 'no_sources') return { ...common, phase: 'uncertain', resultType: 'partial', sourceAvailability: 'none', recoverable: true };
  if (partialSources) return { ...common, phase: 'uncertain', resultType: 'partial', sourceAvailability: citationsAvailable ? 'partial' : 'none', recoverable: true };
  if (['disabled', 'missing_configuration', 'model_unavailable'].includes(reason || '') && !citationsAvailable) {
    return { ...common, phase: 'unavailable', resultType: 'unavailable', sourceAvailability: 'none', recoverable: true };
  }
  return { ...common, phase: 'resolved', resultType: citationsAvailable ? 'cited' : 'answered', sourceAvailability: citationsAvailable ? 'available' : (mode === 'sources_only' ? 'none' : 'available'), recoverable: false };
}
