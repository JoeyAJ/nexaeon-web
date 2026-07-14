export const PRINCESS_VISUAL_ASSETS = {
  active: '/images/princess/princess-active.png',
  restingProne: '/images/princess/princess-resting-prone.png',
  sleepingProne: '/images/princess/princess-sleeping-prone.png',
  seasonalReindeer: '/images/princess/princess-seasonal-reindeer.png',
  introBlueDress: '/pet/princess/frames/frame-001.png',
} as const;

export const PRINCESS_INTRO_ASSET = PRINCESS_VISUAL_ASSETS.introBlueDress;

export const princessAnimations = {
  idle: {
    name: 'idle',
    label: 'Idle / 待機',
    fps: 0.6,
    loop: true,
    frames: [
      PRINCESS_VISUAL_ASSETS.active,
    ],
    blinkFrames: [
      PRINCESS_VISUAL_ASSETS.active,
    ],
  },
  walkRight: {
    name: 'walkRight',
    label: 'Walk Right / 向右小步走',
    fps: 6,
    loop: true,
    frames: [
      PRINCESS_VISUAL_ASSETS.seasonalReindeer,
    ],
  },
  walkLeft: {
    name: 'walkLeft',
    label: 'Walk Left / 向左小步走',
    fps: 6,
    loop: true,
    frames: [
      PRINCESS_VISUAL_ASSETS.seasonalReindeer,
    ],
  },
  sit: {
    name: 'sit',
    label: 'Sit / 坐下等待',
    fps: 1.5,
    loop: true,
    frames: [
      PRINCESS_VISUAL_ASSETS.active,
    ],
  },
  sitting_smile: {
    name: 'sitting_smile',
    label: 'Sitting Smile / 坐著微笑',
    localizedLabel: {
      zh: '坐著微笑',
      ko: '앉아서 미소',
      en: 'Sitting Smile',
    },
    ariaLabel: {
      zh: '公主正坐著微笑陪伴你',
      ko: '공주가 앉아서 미소 지으며 함께하고 있음',
      en: 'Princess sitting and smiling gently',
    },
    animationClass: 'sittingSmileAlive',
    priority: 1,
    transition: 'settled-idle',
    fallback: 'sit',
    fps: 1,
    loop: true,
    preload: false,
    frames: [
      PRINCESS_VISUAL_ASSETS.active,
    ],
  },
  resting_awake: {
    name: 'resting_awake',
    label: 'Resting Awake / 清醒休息',
    localizedLabel: {
      zh: '清醒休息',
      ko: '깨어서 휴식',
      en: 'Resting Awake',
    },
    ariaLabel: {
      zh: 'Princess 正清醒地安靜休息',
      ko: 'Princess가 깨어서 조용히 쉬고 있음',
      en: 'Princess resting quietly while awake',
    },
    fps: 1,
    loop: true,
    preload: false,
    frames: [
      PRINCESS_VISUAL_ASSETS.active,
    ],
  },
  standing_attentive: {
    name: 'standing_attentive',
    label: 'Standing Attentive / 站立專注',
    localizedLabel: {
      zh: '站立專注',
      ko: '집중해서 서 있기',
      en: 'Standing Attentive',
    },
    ariaLabel: {
      zh: 'Princess 正站著專注看向你',
      ko: 'Princess가 서서 당신을 집중해 바라보고 있음',
      en: 'Princess standing attentively and looking toward you',
    },
    fps: 1,
    loop: true,
    preload: false,
    frames: [
      PRINCESS_VISUAL_ASSETS.active,
    ],
  },
  attentive_portrait: {
    name: 'attentive_portrait',
    label: 'Attentive Portrait / 專注半身像',
    localizedLabel: {
      zh: '專注半身像',
      ko: '집중하는 상반신 모습',
      en: 'Attentive Portrait',
    },
    ariaLabel: {
      zh: 'Princess 以專注的半身姿勢看向你',
      ko: 'Princess가 상반신 자세로 당신을 집중해 바라보고 있음',
      en: 'Princess looking toward you in an attentive portrait pose',
    },
    fps: 1,
    loop: true,
    preload: false,
    frames: [
      PRINCESS_VISUAL_ASSETS.active,
    ],
  },
  wave: {
    name: 'wave',
    label: 'Paw / Wave / 抬手打招呼',
    fps: 3,
    loop: false,
    frames: [
      PRINCESS_VISUAL_ASSETS.seasonalReindeer,
    ],
  },
  rest: {
    name: 'rest',
    label: 'Rest / Lie Down / 趴下休息',
    fps: 1,
    loop: true,
    frames: [
      PRINCESS_VISUAL_ASSETS.restingProne,
    ],
  },
  happy: {
    name: 'happy',
    label: 'Happy / Excited / 開心',
    fps: 4,
    loop: false,
    frames: [
      PRINCESS_VISUAL_ASSETS.seasonalReindeer,
    ],
  },
  quiet: {
    name: 'quiet',
    label: 'Quiet / Lonely / 安靜低落',
    fps: 1,
    loop: true,
    frames: [
      PRINCESS_VISUAL_ASSETS.restingProne,
    ],
  },
  sleep: {
    name: 'sleep',
    label: 'Sleep / Nap / 小睡',
    fps: 0.8,
    loop: true,
    frames: [
      PRINCESS_VISUAL_ASSETS.restingProne,
    ],
  },
  sleeping_prone: {
    name: 'sleeping_prone',
    label: 'Sleeping Prone / 趴著睡覺',
    localizedLabel: {
      zh: '趴著睡覺',
      ko: '엎드려 자기',
      en: 'Sleeping',
    },
    ariaLabel: {
      zh: '公主正趴著安靜睡覺',
      ko: '공주가 편안하게 엎드려 자고 있음',
      en: 'Princess sleeping peacefully',
    },
    fps: 1,
    loop: true,
    preload: false,
    frames: [
      PRINCESS_VISUAL_ASSETS.sleepingProne,
    ],
  },
  curious: {
    name: 'curious',
    label: 'Curious / Look Around / 好奇觀察',
    fps: 2,
    loop: false,
    frames: [
      PRINCESS_VISUAL_ASSETS.active,
    ],
  },
  affection: {
    name: 'affection',
    label: 'Affection / Nuzzle / 親近撒嬌',
    fps: 3,
    loop: false,
    frames: [
      PRINCESS_VISUAL_ASSETS.active,
    ],
  },
} as const;
