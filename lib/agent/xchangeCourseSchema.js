const text = (maxLength = 4000, minLength = 1) => ({ type: 'string', minLength, maxLength });
const integer = (minimum = 1, maximum = 10_080) => ({ type: 'integer', minimum, maximum });
const strings = (minItems = 1, maxItems = 20, maxLength = 1000) => ({ type: 'array', minItems, maxItems, items: text(maxLength) });
const object = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const array = (items, minItems = 1, maxItems = 20) => ({ type: 'array', minItems, maxItems, items });

export const XCHANGE_COURSE_DRAFT_SCHEMA = Object.freeze(object({
  overview: object({
    courseTitle: text(320), topic: text(320), purpose: text(2000), targetAudience: strings(1, 20, 180),
    difficulty: text(120), durationMinutes: integer(), language: text(40), format: strings(1, 20, 180),
  }),
  learningObjectives: strings(3, 6, 500),
  learningOutcomes: strings(1, 10, 1000),
  sessionPlan: array(object({
    title: text(320), durationMinutes: integer(), teacherActions: strings(1, 12, 1000),
    learnerActions: strings(1, 12, 1000), output: text(1000),
  }), 3, 20),
  coreContent: array(object({ title: text(320), explanation: text(4000), keyPoints: strings(1, 20, 1000) }), 1, 20),
  activities: array(object({
    title: text(320), purpose: text(2000), durationMinutes: integer(), groupFormat: text(320),
    steps: strings(1, 20, 1000), teacherGuidance: text(3000), learnerOutput: text(2000),
    completionCriteria: strings(1, 20, 1000),
  }), 1, 12),
  discussionQuestions: strings(1, 12, 1000),
  assessment: object({ method: text(2000), criteria: strings(1, 20, 1000), feedbackMethod: text(2000) }),
  resources: object({
    teacherPreparation: strings(1, 20, 1000), learnerPreparation: strings(1, 20, 1000),
    materials: strings(1, 30, 500), tools: strings(1, 20, 500), contingencyPlan: text(2000),
  }),
  risksAndNotes: strings(1, 20, 2000),
  extension: object({ followUpTask: text(2000), reflectionQuestions: strings(1, 12, 1000) }),
}));

export const XCHANGE_COURSE_SCHEMA_NAME = 'nexaeon_xchange_course_draft_v1';
