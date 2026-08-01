export const TOOL_PERMISSION = Object.freeze({
  READ: 'READ',
  WRITE_CONFIRM: 'WRITE_CONFIRM',
  RESTRICTED: 'RESTRICTED',
});

export const ACTION_DRAFT_TOOL_ID = 'createActionDraft';
export const ACTION_DRAFT_DATA_SOURCE = 'airtable-action-projects';
export const XCHANGE_DRAFT_DATA_SOURCE = 'notion-teaching-materials';

const textField = (maxLength) => Object.freeze({ type: 'string', minLength: 1, maxLength });

export const ACTION_DRAFT_INPUT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description'],
  properties: Object.freeze({
    title: textField(160),
    description: textField(4000),
  }),
});

export const ACTION_DRAFT_OUTPUT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'operationId', 'executionStatus', 'targetDataSource', 'externalRecordId', 'idempotencyKey', 'replayed'],
  properties: Object.freeze({
    ok: { type: 'boolean' }, operationId: textField(80), executionStatus: { enum: ['succeeded'] },
    targetDataSource: { enum: [ACTION_DRAFT_DATA_SOURCE] }, externalRecordId: textField(120),
    idempotencyKey: textField(80), replayed: { type: 'boolean' },
  }),
});

const readTool = (toolId, agentId) => Object.freeze({
  toolId, agentId, permissionLevel: TOOL_PERMISSION.READ, inputSchema: Object.freeze({ type: 'object' }),
  outputSchema: Object.freeze({ type: 'object' }), allowedDataSources: Object.freeze(['public']),
  requiresConfirmation: false, idempotencyPolicy: 'not_required', auditPolicy: 'metadata_only',
  timeout: 10_000, errorMapping: 'standard', rollbackSupport: false, enabled: true,
});

export const TOOL_REGISTRY = Object.freeze([
  readTool('searchPublicKnowledge', 'navigator'),
  readTool('searchResearchLiterature', 'explorer'),
  readTool('searchLearningResources', 'xchange'),
  readTool('searchKnowledgeResources', 'archivist'),
  readTool('searchPrototypeRecords', 'engineer'),
  readTool('searchActionItems', 'orchestrator'),
  readTool('searchIdentityProfiles', 'networker'),
  Object.freeze({
    toolId: ACTION_DRAFT_TOOL_ID,
    agentId: 'orchestrator',
    permissionLevel: TOOL_PERMISSION.WRITE_CONFIRM,
    inputSchema: ACTION_DRAFT_INPUT_SCHEMA,
    outputSchema: ACTION_DRAFT_OUTPUT_SCHEMA,
    allowedDataSources: Object.freeze([ACTION_DRAFT_DATA_SOURCE]),
    requiresConfirmation: true,
    idempotencyPolicy: 'payload_hash_primary_field_airtable_upsert',
    auditPolicy: 'every_write_attempt',
    timeout: 8_000,
    errorMapping: 'standard',
    rollbackSupport: false,
    enabled: true,
  }),
  ...['createCourseDraft', 'createLearningActivityDraft'].map((toolId) => Object.freeze({
    toolId,
    agentId: 'xchange',
    permissionLevel: TOOL_PERMISSION.WRITE_CONFIRM,
    inputSchema: Object.freeze({ type: 'object', additionalProperties: false }),
    outputSchema: Object.freeze({ type: 'object', additionalProperties: false }),
    allowedDataSources: Object.freeze([XCHANGE_DRAFT_DATA_SOURCE]),
    requiresConfirmation: true,
    idempotencyPolicy: 'normalized_payload_actor_tool_target_preview_ttl',
    auditPolicy: 'preview_only_formal_audit',
    timeout: 8_000,
    errorMapping: 'standard',
    rollbackSupport: false,
    enabled: true,
    executeEnabled: false,
  })),
  Object.freeze({
    toolId: 'deleteAction', agentId: 'orchestrator', permissionLevel: TOOL_PERMISSION.RESTRICTED,
    inputSchema: Object.freeze({ type: 'object' }), outputSchema: Object.freeze({ type: 'object' }),
    allowedDataSources: Object.freeze([]), requiresConfirmation: true, idempotencyPolicy: 'blocked',
    auditPolicy: 'blocked_attempts', timeout: 0, errorMapping: 'restricted', rollbackSupport: false, enabled: false,
  }),
]);

const TOOL_BY_ID = new Map(TOOL_REGISTRY.map((tool) => [tool.toolId, tool]));

export function getExecutionTool(toolId) {
  return TOOL_BY_ID.get(toolId) || null;
}

export function assertToolAccess({ toolId, agentId, targetDataSource }) {
  const tool = getExecutionTool(toolId);
  if (!tool || !tool.enabled) throw Object.assign(new Error('tool_not_allowed'), { code: 'TOOL_NOT_ALLOWED' });
  if (tool.agentId !== agentId) throw Object.assign(new Error('agent_not_allowed'), { code: 'AGENT_NOT_ALLOWED' });
  if (tool.permissionLevel === TOOL_PERMISSION.RESTRICTED) throw Object.assign(new Error('restricted_tool'), { code: 'RESTRICTED_TOOL' });
  if (targetDataSource && !tool.allowedDataSources.includes(targetDataSource)) {
    throw Object.assign(new Error('data_source_not_allowed'), { code: 'DATA_SOURCE_NOT_ALLOWED' });
  }
  return tool;
}
