export const princessAnimations = {
  idle: {
    name: 'idle',
    label: 'Idle / 待機',
    fps: 0.6,
    loop: true,
    frames: [
      '/pet/princess/frames/frame-001.png',
    ],
    blinkFrames: [
      '/pet/princess/frames/frame-003.png',
    ],
  },
  walkRight: {
    name: 'walkRight',
    label: 'Walk Right / 向右小步走',
    fps: 6,
    loop: true,
    frames: [
      '/pet/princess/frames/frame-010.png',
      '/pet/princess/frames/frame-011.png',
      '/pet/princess/frames/frame-012.png',
      '/pet/princess/frames/frame-013.png',
    ],
  },
  walkLeft: {
    name: 'walkLeft',
    label: 'Walk Left / 向左小步走',
    fps: 6,
    loop: true,
    frames: [
      '/pet/princess/frames/frame-010.png',
      '/pet/princess/frames/frame-011.png',
      '/pet/princess/frames/frame-012.png',
      '/pet/princess/frames/frame-013.png',
    ],
  },
  sit: {
    name: 'sit',
    label: 'Sit / 坐下等待',
    fps: 1.5,
    loop: true,
    frames: [
      '/pet/princess/frames/frame-046.png',
      '/pet/princess/frames/frame-048.png',
      '/pet/princess/frames/frame-051.png',
    ],
  },
  wave: {
    name: 'wave',
    label: 'Paw / Wave / 抬手打招呼',
    fps: 3,
    loop: false,
    frames: [
      '/pet/princess/frames/frame-023.png',
      '/pet/princess/frames/frame-024.png',
      '/pet/princess/frames/frame-025.png',
      '/pet/princess/frames/frame-024.png',
      '/pet/princess/frames/frame-023.png',
    ],
  },
  rest: {
    name: 'rest',
    label: 'Rest / Lie Down / 趴下休息',
    fps: 1,
    loop: true,
    frames: [
      '/pet/princess/frames/frame-035.png',
    ],
  },
  happy: {
    name: 'happy',
    label: 'Happy / Excited / 開心',
    fps: 4,
    loop: false,
    frames: [
      '/pet/princess/frames/frame-052.png',
      '/pet/princess/frames/frame-053.png',
      '/pet/princess/frames/frame-056.png',
      '/pet/princess/frames/frame-057.png',
    ],
  },
  quiet: {
    name: 'quiet',
    label: 'Quiet / Lonely / 安靜低落',
    fps: 1,
    loop: true,
    frames: [
      '/pet/princess/frames/frame-039.png',
    ],
  },
  sleep: {
    name: 'sleep',
    label: 'Sleep / Nap / 小睡',
    fps: 0.8,
    loop: true,
    frames: [
      '/pet/princess/frames/frame-033.png',
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
      '/pet/princess/frames/princess-sleeping-prone.webp',
    ],
  },
  curious: {
    name: 'curious',
    label: 'Curious / Look Around / 好奇觀察',
    fps: 2,
    loop: false,
    frames: [
      '/pet/princess/frames/frame-001.png',
      '/pet/princess/frames/frame-040.png',
      '/pet/princess/frames/frame-004.png',
      '/pet/princess/frames/frame-001.png',
    ],
  },
  affection: {
    name: 'affection',
    label: 'Affection / Nuzzle / 親近撒嬌',
    fps: 3,
    loop: false,
    frames: [
      '/pet/princess/frames/frame-001.png',
      '/pet/princess/frames/frame-054.png',
      '/pet/princess/frames/frame-055.png',
      '/pet/princess/frames/frame-054.png',
      '/pet/princess/frames/frame-001.png',
    ],
  },
} as const;
