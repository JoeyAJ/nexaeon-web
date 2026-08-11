const SECRET_PATTERN = /(?:sk-[a-z0-9_-]{8,}|(?:authorization|cookie|password|secret|session|api.?key)\s*[:=]\s*[^\s,;]+)/giu;
const MAX_TEXT = 180;
const MAX_LIST_ITEMS = 20;

function safeText(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value).replace(/\s+/gu, ' ').trim().replace(SECRET_PATTERN, '[redacted]').slice(0, MAX_TEXT);
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function safeList(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_LIST_ITEMS).map(safeText).filter(Boolean);
}

export function projectModelAuditDetails(record = {}) {
  const output = record.sanitizedOutput && typeof record.sanitizedOutput === 'object' ? record.sanitizedOutput : {};
  const model = output.modelGeneration && typeof output.modelGeneration === 'object' ? output.modelGeneration : {};
  const shadow = output.shadowComparison && typeof output.shadowComparison === 'object' ? output.shadowComparison : {};
  const diagnostic = shadow.qualityDiagnostic && typeof shadow.qualityDiagnostic === 'object' ? shadow.qualityDiagnostic
    : output.qualityDiagnostic && typeof output.qualityDiagnostic === 'object' ? output.qualityDiagnostic : {};
  const usage = shadow.tokenUsage && typeof shadow.tokenUsage === 'object' ? shadow.tokenUsage
    : model.tokenUsage && typeof model.tokenUsage === 'object' ? model.tokenUsage : {};
  const details = Object.freeze({
    modelMode: safeText(model.mode || model.generationMode),
    requestedProvider: safeText(model.requestedProvider),
    actualProvider: safeText(shadow.provider || model.actualProvider || model.provider),
    model: safeText(shadow.model || model.model),
    shadowExecuted: safeBoolean(shadow.shadowExecuted),
    comparisonStatus: safeText(shadow.comparisonStatus),
    schemaPassed: safeBoolean(shadow.schemaPassed),
    qualityPassed: safeBoolean(shadow.qualityPassed),
    latencyMs: safeNumber(shadow.latencyMs ?? model.latencyMs),
    inputTokens: safeNumber(usage.inputTokens),
    outputTokens: safeNumber(usage.outputTokens),
    totalTokens: safeNumber(usage.totalTokens),
    fallbackUsed: safeBoolean(shadow.fallbackUsed ?? model.fallbackUsed),
    schemaStatus: safeText(shadow.schemaValidationStatus || model.schemaValidationStatus),
    qualityStatus: safeText(shadow.qualityValidationStatus || model.qualityValidationStatus),
    errorCode: safeText(shadow.errorCode || record.errorCode),
    writesPerformed: safeNumber(output.writesPerformed),
    failedChecks: safeList(diagnostic.failedChecks),
    qualityReasons: safeList(diagnostic.qualityReasons),
    failedPaths: safeList(diagnostic.failedPaths),
  });
  return Object.freeze({
    ...details,
    hasDetails: Object.entries(details).some(([, value]) => Array.isArray(value) ? value.length > 0 : value !== null),
  });
}
