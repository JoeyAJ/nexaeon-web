export const NEXON_FUSION_PHASES = [
  'dormant', 'listening', 'interpreting', 'retrieving', 'connecting', 'guiding',
  'resolved', 'needsClarification', 'uncertain', 'unavailable', 'failed', 'aborted',
] as const;

export const NEXON_FUSION_OPERATION_TYPES = [
  'question', 'knowledge-search', 'module-navigation', 'citation-navigation',
  'research-assistance', 'course-guidance', 'knowledge-retrieval',
  'prototype-guidance', 'action-guidance', 'generic',
] as const;

export const NEXON_FUSION_RESULT_TYPES = [
  'answered', 'navigated', 'cited', 'partial', 'clarification', 'unavailable', 'failed', 'aborted',
] as const;

export type NexonFusionPhase = (typeof NEXON_FUSION_PHASES)[number];
export type NexonFusionOperationType = (typeof NEXON_FUSION_OPERATION_TYPES)[number];
export type NexonFusionResultType = (typeof NEXON_FUSION_RESULT_TYPES)[number];
export type NexonFusionContextId = 'identity' | 'research' | 'coaching' | 'knowledge' | 'prototype' | 'action' | 'navigator' | 'generic';

export type NexonFusionMetadata = {
  fusionId: string;
  requestId: string;
  generation: number;
  phase: NexonFusionPhase;
  operationType: NexonFusionOperationType;
  resultType?: NexonFusionResultType;
  sourceAvailability?: 'none' | 'partial' | 'available';
  citationStatus?: 'none' | 'available';
  navigationStatus?: 'none' | 'available' | 'completed';
  clarificationRequired?: boolean;
  recoverable?: boolean;
  contextId?: NexonFusionContextId;
  timestamp: number;
};

export type NexonFusionToken = Readonly<Pick<NexonFusionMetadata, 'fusionId' | 'requestId' | 'generation'>>;

