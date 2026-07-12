export const COMPANION_EMOTIONS = Object.freeze({
  CALM: 'calm',
  HAPPY: 'happy',
  ATTENTIVE: 'attentive',
  SLEEPY: 'sleepy',
  SAD: 'sad',
  CURIOUS: 'curious',
} as const);

export type CompanionEmotion = (typeof COMPANION_EMOTIONS)[keyof typeof COMPANION_EMOTIONS];

export const COMPANION_BEHAVIOR_SOURCES = Object.freeze({
  SYSTEM: 'system',
  INTERACTION: 'interaction',
  CONTEXT: 'context',
  INACTIVITY: 'inactivity',
  IDLE: 'idle',
  DEBUG: 'debug',
} as const);

export type CompanionBehaviorSource = (typeof COMPANION_BEHAVIOR_SOURCES)[keyof typeof COMPANION_BEHAVIOR_SOURCES];

export const COMPANION_BEHAVIOR_PRIORITY = Object.freeze({
  idle: 10,
  inactivity: 20,
  context: 30,
  interaction: 40,
  system: 50,
  debug: 100,
});

export const COMPANION_BEHAVIOR_TIMING = Object.freeze({
  inactivity: Object.freeze({
    calm: 45_000,
    sleepy: 90_000,
    sleeping: 150_000,
    reevaluation: 5_000,
  }),
  hover: Object.freeze({
    debounce: 180,
    minimumHold: 1_800,
    returnDelay: 2_000,
  }),
  click: Object.freeze({
    duration: 3_000,
    minimumHold: 2_000,
  }),
  drag: Object.freeze({
    minimumHold: 900,
    returnDelay: 1_800,
  }),
  wake: Object.freeze({
    duration: 2_000,
    minimumHold: 1_500,
  }),
  transition: 320,
  stateMinimumDuration: Object.freeze({
    idle: 600,
    inactivity: 1_500,
    context: 1_800,
    interaction: 2_000,
    system: 2_500,
    debug: 0,
  }),
  eventDuration: Object.freeze({
    success: 3_000,
    error: 3_500,
    loading: 3_000,
    taskComplete: 3_000,
    greeting: 3_000,
    attention: 2_200,
  }),
});

export type CompanionBehavior = Readonly<{
  emotion: CompanionEmotion;
  pose: string;
}>;

export const COMPANION_MODULE_BEHAVIORS: Readonly<Record<string, CompanionBehavior>> = Object.freeze({
  home: Object.freeze({ emotion: COMPANION_EMOTIONS.CALM, pose: 'resting_awake' }),
  identity: Object.freeze({ emotion: COMPANION_EMOTIONS.ATTENTIVE, pose: 'standing_attentive' }),
  research: Object.freeze({ emotion: COMPANION_EMOTIONS.ATTENTIVE, pose: 'standing_attentive' }),
  coaching: Object.freeze({ emotion: COMPANION_EMOTIONS.HAPPY, pose: 'sitting_smile' }),
  knowledge: Object.freeze({ emotion: COMPANION_EMOTIONS.CURIOUS, pose: 'resting_awake' }),
  prototype: Object.freeze({ emotion: COMPANION_EMOTIONS.CURIOUS, pose: 'standing_attentive' }),
  action: Object.freeze({ emotion: COMPANION_EMOTIONS.ATTENTIVE, pose: 'standing_attentive' }),
  navigator: Object.freeze({ emotion: COMPANION_EMOTIONS.ATTENTIVE, pose: 'standing_attentive' }),
  generic: Object.freeze({ emotion: COMPANION_EMOTIONS.CALM, pose: 'resting_awake' }),
});

export const COMPANION_INACTIVITY_BEHAVIORS: Readonly<Record<string, CompanionBehavior>> = Object.freeze({
  activeIdle: Object.freeze({ emotion: COMPANION_EMOTIONS.CALM, pose: 'resting_awake' }),
  calmIdle: Object.freeze({ emotion: COMPANION_EMOTIONS.CALM, pose: 'resting_awake' }),
  resting: Object.freeze({ emotion: COMPANION_EMOTIONS.SLEEPY, pose: 'sleep' }),
  sleeping: Object.freeze({ emotion: COMPANION_EMOTIONS.SLEEPY, pose: 'sleeping_prone' }),
});

export const COMPANION_SYSTEM_EVENTS = [
  'success',
  'error',
  'loading',
  'taskComplete',
  'greeting',
  'attention',
  'reset',
] as const;

export type CompanionSystemEventType = (typeof COMPANION_SYSTEM_EVENTS)[number];

export const COMPANION_EVENT_BEHAVIORS: Readonly<Partial<Record<CompanionSystemEventType, CompanionBehavior>>> = Object.freeze({
  success: Object.freeze({ emotion: COMPANION_EMOTIONS.HAPPY, pose: 'sitting_smile' }),
  error: Object.freeze({ emotion: COMPANION_EMOTIONS.SAD, pose: 'quiet' }),
  loading: Object.freeze({ emotion: COMPANION_EMOTIONS.ATTENTIVE, pose: 'standing_attentive' }),
  taskComplete: Object.freeze({ emotion: COMPANION_EMOTIONS.HAPPY, pose: 'sitting_smile' }),
  greeting: Object.freeze({ emotion: COMPANION_EMOTIONS.HAPPY, pose: 'wave' }),
  attention: Object.freeze({ emotion: COMPANION_EMOTIONS.ATTENTIVE, pose: 'standing_attentive' }),
});

const POSE_EMOTIONS: Readonly<Record<string, CompanionEmotion>> = Object.freeze({
  idle: COMPANION_EMOTIONS.CALM,
  walkLeft: COMPANION_EMOTIONS.ATTENTIVE,
  walkRight: COMPANION_EMOTIONS.ATTENTIVE,
  sit: COMPANION_EMOTIONS.CALM,
  sitting_smile: COMPANION_EMOTIONS.HAPPY,
  resting_awake: COMPANION_EMOTIONS.CALM,
  standing_attentive: COMPANION_EMOTIONS.ATTENTIVE,
  attentive_portrait: COMPANION_EMOTIONS.ATTENTIVE,
  wave: COMPANION_EMOTIONS.HAPPY,
  happy: COMPANION_EMOTIONS.HAPPY,
  curious: COMPANION_EMOTIONS.CURIOUS,
  affection: COMPANION_EMOTIONS.HAPPY,
  quiet: COMPANION_EMOTIONS.SAD,
  rest: COMPANION_EMOTIONS.CALM,
  sleep: COMPANION_EMOTIONS.SLEEPY,
  sleeping_prone: COMPANION_EMOTIONS.SLEEPY,
});

export function getCompanionEmotionForPose(pose: string): CompanionEmotion {
  return POSE_EMOTIONS[pose] || COMPANION_EMOTIONS.CALM;
}

export function getCompanionModuleBehavior(contextId = 'generic'): CompanionBehavior {
  return COMPANION_MODULE_BEHAVIORS[contextId] || COMPANION_MODULE_BEHAVIORS.generic;
}

export function getCompanionInactivityBehavior(persistentState: string, contextId = 'generic'): CompanionBehavior {
  if (persistentState === 'activeIdle') return getCompanionModuleBehavior(contextId);
  return COMPANION_INACTIVITY_BEHAVIORS[persistentState] || getCompanionModuleBehavior(contextId);
}

export function getCompanionEventBehavior(type: CompanionSystemEventType): CompanionBehavior | null {
  return COMPANION_EVENT_BEHAVIORS[type] || null;
}

export function getCompanionSourcePriority(source: CompanionBehaviorSource): number {
  return COMPANION_BEHAVIOR_PRIORITY[source] || COMPANION_BEHAVIOR_PRIORITY.idle;
}

export function getCompanionMinimumDuration(source: CompanionBehaviorSource): number {
  return COMPANION_BEHAVIOR_TIMING.stateMinimumDuration[source] || 0;
}
