export const TOOL_PERMISSION = Object.freeze({
  READ: 'READ',
  WRITE_CONFIRM: 'WRITE_CONFIRM',
  RESTRICTED: 'RESTRICTED',
});

export const ACTION_DRAFT_TOOL_ID = 'createActionDraft';
export const ACTION_DRAFT_DATA_SOURCE = 'airtable-action-projects';
export const XCHANGE_DRAFT_DATA_SOURCE = 'notion-teaching-materials';
export const N8N_TOOL_CONTRACT_VERSION = 'n8n-tool.v1';

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

const n8nTool = ({ toolId, description, allowedAgents, allowedTaskTypes, inputSchema, responseSchema, riskLevel, approvalPolicy, timeoutMs, workflowBinding, workflowName, enabled = true }) => Object.freeze({
  toolId, description, agentId: allowedAgents[0], allowedAgents: Object.freeze(allowedAgents),
  allowedTaskTypes: Object.freeze(allowedTaskTypes), permissionLevel: riskLevel === 'write' ? TOOL_PERMISSION.WRITE_CONFIRM : TOOL_PERMISSION.READ,
  inputSchema: Object.freeze(inputSchema), responseSchema: Object.freeze(responseSchema),
  allowedDataSources: Object.freeze(['n8n']), requiresConfirmation: approvalPolicy === 'confirm_required',
  idempotencyPolicy: riskLevel === 'write' ? 'nexaeon_authority_required' : 'not_required',
  auditPolicy: 'every_external_attempt', timeout: timeoutMs, timeoutMs, errorMapping: 'n8n-tool-v1',
  rollbackSupport: false, enabled, runtime: 'n8n', riskLevel, approvalPolicy, workflowBinding, workflowName,
});

const searchResultSchema = Object.freeze({
  type: 'object', additionalProperties: false, required: ['results'], properties: {
    results: {
      type: 'array', maxItems: 20, items: {
        type: 'object', additionalProperties: false, required: ['title', 'url', 'snippet'], properties: {
          title: textField(500), url: { ...textField(2000), format: 'web-url' }, snippet: textField(5000), score: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  },
});

const vectorMetadataSchema = Object.freeze({
  type: 'object', additionalProperties: false, properties: {
    source: textField(500), title: textField(500), url: { ...textField(2000), format: 'web-url' },
    tags: { type: 'array', maxItems: 30, items: textField(100) },
  },
});

const vectorResultSchema = Object.freeze({
  type: 'object', additionalProperties: false, required: ['matches'], properties: {
    matches: {
      type: 'array', maxItems: 20, items: {
        type: 'object', additionalProperties: false, required: ['id', 'content'], properties: {
          id: textField(200), content: textField(10_000), score: { type: 'number', minimum: 0, maximum: 1 },
          metadata: vectorMetadataSchema,
        },
      },
    },
  },
});

export const TOOL_REGISTRY = Object.freeze([
  readTool('searchPublicKnowledge', 'navigator'),
  readTool('searchResearchLiterature', 'explorer'),
  readTool('searchLearningResources', 'xchange'),
  readTool('searchKnowledgeResources', 'archivist'),
  readTool('searchPrototypeRecords', 'engineer'),
  readTool('searchActionItems', 'orchestrator'),
  readTool('searchIdentityProfiles', 'networker'),
  n8nTool({
    toolId: 'web.search', description: 'Search the public web through the allowlisted Explorer n8n workflow.',
    allowedAgents: ['explorer'], allowedTaskTypes: ['research.search'],
    inputSchema: { type: 'object', additionalProperties: false, required: ['query'], properties: {
      query: textField(1000), maxResults: { type: 'integer', minimum: 1, maximum: 10 }, locale: { enum: ['zh', 'ko', 'en'] },
    } },
    responseSchema: searchResultSchema, riskLevel: 'read', approvalPolicy: 'none', timeoutMs: 15_000,
    workflowBinding: 'N8N_EXPLORER_WEBHOOK_URL', workflowName: 'explorer-web-search',
  }),
  n8nTool({
    toolId: 'vector.search', description: 'Search the allowlisted Archivist vector workflow.',
    allowedAgents: ['archivist'], allowedTaskTypes: ['knowledge.search'],
    inputSchema: { type: 'object', additionalProperties: false, required: ['query'], properties: {
      query: textField(2000), limit: { type: 'integer', minimum: 1, maximum: 20 }, namespace: textField(80),
    } },
    responseSchema: vectorResultSchema, riskLevel: 'read', approvalPolicy: 'none', timeoutMs: 10_000,
    workflowBinding: 'N8N_ARCHIVIST_SEARCH_URL', workflowName: 'archivist-vector-search',
  }),
  n8nTool({
    toolId: 'vector.ingest', description: 'Reserved guarded Archivist vector ingestion workflow.',
    allowedAgents: ['archivist'], allowedTaskTypes: ['knowledge.ingest'],
    inputSchema: { type: 'object', additionalProperties: false, required: ['documentId', 'content'], properties: {
      documentId: textField(200), content: textField(20_000), metadata: vectorMetadataSchema,
    } },
    responseSchema: { type: 'object', additionalProperties: false, required: ['documentId', 'status'], properties: {
      documentId: textField(200), status: { enum: ['ingested'] },
    } },
    riskLevel: 'write', approvalPolicy: 'confirm_required', timeoutMs: 20_000,
    workflowBinding: 'N8N_ARCHIVIST_INGEST_URL', workflowName: 'archivist-vector-ingest', enabled: false,
  }),
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
  if (!(tool.allowedAgents || [tool.agentId]).includes(agentId)) throw Object.assign(new Error('agent_not_allowed'), { code: 'AGENT_NOT_ALLOWED' });
  if (tool.permissionLevel === TOOL_PERMISSION.RESTRICTED) throw Object.assign(new Error('restricted_tool'), { code: 'RESTRICTED_TOOL' });
  if (targetDataSource && !tool.allowedDataSources.includes(targetDataSource)) {
    throw Object.assign(new Error('data_source_not_allowed'), { code: 'DATA_SOURCE_NOT_ALLOWED' });
  }
  return tool;
}
