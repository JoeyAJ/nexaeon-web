export const princessAnimations = {
  idle: {
    name: 'idle',
    label: 'Idle / 待機',
    fps: 2,
    loop: true,
    frames: [
      '/pet/princess/frames/frame-001.png',
      '/pet/princess/frames/frame-002.png',
      '/pet/princess/frames/frame-004.png',
      '/pet/princess/frames/frame-005.png',
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
} as const;
