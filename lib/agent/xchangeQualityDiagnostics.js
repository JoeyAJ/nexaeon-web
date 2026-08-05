import { redactModelSecrets } from '../model/modelErrors.js';

const MAX_CODES = 20;
const MAX_PATHS = 24;
const MAX_REASONS = 12;
const MAX_REASON_CHARS = 180;

const CHECKS = Object.freeze([
  [/^Missing or empty section: (.+)$/u, 'MISSING_REQUIRED_SECTION', 'required_sections', (match) => [match[1]]],
  [/requires at least 3 (?:session stages|steps)/iu, 'FLOW_STAGE_COUNT_INVALID', 'flow_stage_count', () => ['sessionPlan']],
  [/^Duration total /u, 'DURATION_TOTAL_MISMATCH', 'duration_total', () => ['sessionPlan[].durationMinutes']],
  [/requires 3 to 6 learning objectives/iu, 'LEARNING_OBJECTIVE_COUNT_INVALID', 'learning_objective_count', () => ['learningObjectives']],
  [/measurable verbs/iu, 'LEARNING_OBJECTIVE_VERB_INVALID', 'learning_objective_verbs', () => ['learningObjectives[]']],
  [/concrete learning output/iu, 'LEARNING_OUTPUT_INCOMPLETE', 'learning_output', () => ['learningOutcomes']],
  [/assessment method and criteria/iu, 'ASSESSMENT_INCOMPLETE', 'assessment_structure', () => ['assessment']],
  [/teacher and learner actions/iu, 'STAGE_ACTIONS_INCOMPLETE', 'stage_actions', () => ['sessionPlan[]']],
  [/unsupported generic instruction/iu, 'GENERIC_INSTRUCTION', 'content_specificity', () => []],
  [/exactTitle was not preserved/iu, 'EXACT_TITLE_NOT_PRESERVED', 'preserved_exact_title', () => ['overview.courseTitle']],
  [/targetAudience was missing or replaced/iu, 'TARGET_AUDIENCE_NOT_PRESERVED', 'preserved_target_audience', () => ['overview.targetAudience']],
  [/format was missing or replaced/iu, 'FORMAT_NOT_PRESERVED', 'preserved_format', () => ['overview.format']],
  [/duration was not preserved/iu, 'DURATION_NOT_PRESERVED', 'preserved_duration', () => ['overview.durationMinutes']],
  [/difficulty was not preserved/iu, 'DIFFICULTY_NOT_PRESERVED', 'preserved_difficulty', () => ['overview.difficulty']],
  [/language was not preserved/iu, 'LANGUAGE_NOT_PRESERVED', 'preserved_language', () => ['overview.language']],
  [/Topic relevance is below/iu, 'TOPIC_RELEVANCE_BELOW_THRESHOLD', 'topic_relevance', () => []],
  [/excessive overlap/iu, 'PROMPT_OVERLAP_EXCESSIVE', 'prompt_overlap', () => []],
  [/Instruction leakage/iu, 'INSTRUCTION_LEAKAGE', 'instruction_leakage', () => []],
  [/natural teaching allocation/iu, 'SESSION_ALLOCATION_UNNATURAL', 'session_allocation', () => ['sessionPlan[].durationMinutes']],
  [/objectives are not specific enough/iu, 'AI_MARKETING_OBJECTIVES_INSUFFICIENT', 'ai_marketing_objectives', () => ['learningObjectives']],
  [/topic-specific group activity/iu, 'AI_MARKETING_GROUP_ACTIVITY_MISSING', 'ai_marketing_group_activity', () => ['activities']],
  [/Assessment criteria are not specific enough/iu, 'AI_MARKETING_ASSESSMENT_INSUFFICIENT', 'ai_marketing_assessment', () => ['assessment.criteria']],
  [/four AI risk categories/iu, 'AI_RISK_COVERAGE_INSUFFICIENT', 'ai_risk_coverage', () => ['risksAndNotes']],
  [/Generic template language/iu, 'GENERIC_TOPIC_TEMPLATE', 'topic_specificity', () => []],
  [/maximum length/iu, 'CONTENT_LENGTH_EXCEEDED', 'content_length', () => []],
  [/maximum block count/iu, 'BLOCK_COUNT_EXCEEDED', 'block_count', () => []],
  [/(?:Unsafe|Unverified source) URL/iu, 'UNSAFE_OR_UNVERIFIED_URL', 'url_allowlist', () => []],
]);

const WARNING_CODES = Object.freeze([
  [/repeated content/iu, 'REPEATED_CONTENT'],
]);

function boundedArray(values, limit) {
  return [...new Set((values || []).filter(Boolean))].slice(0, limit);
}

function safeReason(value) {
  return redactModelSecrets(value).replace(/https?:\/\/\S+/giu, '[url omitted]').slice(0, MAX_REASON_CHARS);
}

function mappedErrors(errors = []) {
  return errors.map((error) => {
    const text = String(error || '');
    for (const [pattern, code, check, paths] of CHECKS) {
      const match = text.match(pattern);
      if (match) return { code, check, paths: paths(match), reason: safeReason(text) };
    }
    return { code: 'QUALITY_CHECK_FAILED', check: 'quality_validation', paths: [], reason: 'A quality validation check failed.' };
  });
}

function numericDiagnostic(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildShadowQualityDiagnostic(quality) {
  if (!quality) return null;
  const failures = mappedErrors(quality.errors);
  const warningCodes = (quality.warnings || []).map((warning) => WARNING_CODES.find(([pattern]) => pattern.test(String(warning)))?.[1] || 'QUALITY_WARNING');
  const passed = ['Complete', 'Complete with warnings'].includes(quality.status);
  const reasons = failures.length
    ? failures.map(({ reason }) => reason)
    : (quality.qualityReasons || quality.warnings || []).map(safeReason);
  const constraints = quality.preservedConstraints || {};
  return Object.freeze({
    status: passed ? (quality.status === 'Complete with warnings' ? 'warning' : 'passed') : 'failed',
    errorCodes: boundedArray(failures.map(({ code }) => code), MAX_CODES),
    failedChecks: boundedArray(failures.map(({ check }) => check), MAX_CODES),
    warningCodes: boundedArray(warningCodes, MAX_CODES),
    qualityReasons: boundedArray(reasons, MAX_REASONS),
    topicRelevance: Object.freeze({
      score: numericDiagnostic(quality.topicRelevance?.score),
      threshold: numericDiagnostic(quality.topicRelevance?.threshold),
      valid: quality.topicRelevance?.valid === true,
    }),
    promptOverlap: Object.freeze({
      ratio: numericDiagnostic(quality.promptOverlap?.ratio),
      threshold: numericDiagnostic(quality.promptOverlap?.threshold),
      valid: quality.promptOverlap?.valid === true,
    }),
    durationValidation: Object.freeze({
      expectedMinutes: numericDiagnostic(quality.durationValidation?.expectedMinutes),
      actualMinutes: numericDiagnostic(quality.durationValidation?.actualMinutes),
      valid: quality.durationValidation?.valid === true,
    }),
    preservedConstraints: Object.freeze({
      exactTitle: constraints.exactTitle === true,
      targetAudience: constraints.targetAudience === true,
      format: constraints.format === true,
      durationMinutes: constraints.durationMinutes === true,
      difficulty: constraints.difficulty === true,
      language: constraints.language === true,
    }),
    failedPaths: boundedArray(failures.flatMap(({ paths }) => paths), MAX_PATHS),
  });
}

export const XCHANGE_QUALITY_DIAGNOSTIC_LIMITS = Object.freeze({
  maxCodes: MAX_CODES,
  maxPaths: MAX_PATHS,
  maxReasons: MAX_REASONS,
  maxReasonChars: MAX_REASON_CHARS,
});
