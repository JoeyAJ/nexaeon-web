const ellipse = (cx, cy, rx, ry, rotate = 0) => Object.freeze({ cx, cy, rx, ry, rotate });
const motions = (...values) => Object.freeze(values);

const profile = (value) => Object.freeze({
  motionIntensity: 0.62,
  headAmplitude: 1.35,
  earAmplitude: 2.4,
  supportedMotions: motions('breathing', 'blink', 'earTwitch', 'headTilt', 'pointerFocus', 'muzzle'),
  ...value,
  regions: Object.freeze(value.regions),
});

// Coordinates are percentages of the untouched source canvas. Elliptical masks use
// generous overlap so transforms stay inside the original fur silhouette.
export const PRINCESS_ROTO_PROFILES = Object.freeze({
  'princess-module-pose-01.png': profile({
    imageKey: 'princess-module-pose-01.png', poseType: 'portrait', sourceSize: Object.freeze({ width: 1448, height: 1086 }),
    bodyAnchor: Object.freeze({ x: 50, y: 94 }), headAnchor: Object.freeze({ x: 42, y: 61 }),
    regions: { head: ellipse(43, 56, 35, 43), leftEar: ellipse(22, 20, 15, 23, -14), rightEar: ellipse(67, 20, 15, 24, 14), leftEye: ellipse(34, 49, 5.8, 5), rightEye: ellipse(52, 49, 5.8, 5), muzzle: ellipse(44, 69, 17, 13) },
    shadowProfile: Object.freeze({ enabled: false }), motionIntensity: 0.48,
  }),
  'princess-module-pose-02.png': profile({
    imageKey: 'princess-module-pose-02.png', poseType: 'resting', sourceSize: Object.freeze({ width: 1085, height: 1450 }),
    bodyAnchor: Object.freeze({ x: 45, y: 73 }), headAnchor: Object.freeze({ x: 59, y: 50 }),
    regions: { head: ellipse(59, 48, 29, 27, -4), leftEar: ellipse(44, 30, 10, 15, -17), rightEar: ellipse(72, 31, 10, 15, 15), leftEye: ellipse(52, 44, 4.4, 3.8), rightEye: ellipse(66, 43, 4.4, 3.8), muzzle: ellipse(59, 55, 14, 10) },
    shadowProfile: Object.freeze({ enabled: true, anchor: Object.freeze({ x: 50, y: 86 }) }), motionIntensity: 0.55,
  }),
  'princess-module-pose-03.png': profile({
    imageKey: 'princess-module-pose-03.png', poseType: 'standing', sourceSize: Object.freeze({ width: 1085, height: 1450 }),
    bodyAnchor: Object.freeze({ x: 58, y: 94 }), headAnchor: Object.freeze({ x: 58, y: 31 }),
    regions: { head: ellipse(58, 28, 25, 24), leftEar: ellipse(45, 11, 8, 14, -12), rightEar: ellipse(70, 11, 8, 14, 12), leftEye: ellipse(53, 26, 3.7, 3.3), rightEye: ellipse(64, 25, 3.7, 3.3), muzzle: ellipse(59, 35, 11, 8), tail: ellipse(88, 48, 14, 7, 12) },
    shadowProfile: Object.freeze({ enabled: true, anchor: Object.freeze({ x: 50, y: 92 }) }), supportedMotions: motions('breathing', 'blink', 'earTwitch', 'headTilt', 'pointerFocus', 'muzzle', 'weightShift', 'tail'),
  }),
  'princess-module-pose-04.png': profile({
    imageKey: 'princess-module-pose-04.png', poseType: 'sitting', sourceSize: Object.freeze({ width: 1078, height: 1459 }),
    bodyAnchor: Object.freeze({ x: 50, y: 93 }), headAnchor: Object.freeze({ x: 50, y: 39 }), accessoryAnchor: Object.freeze({ x: 50, y: 14 }),
    regions: { head: ellipse(50, 35, 29, 27), leftEar: ellipse(34, 15, 10, 17, -12), rightEar: ellipse(66, 14, 10, 17, 12), leftEye: ellipse(43, 31, 4.2, 3.6), rightEye: ellipse(58, 31, 4.2, 3.6), muzzle: ellipse(51, 42, 13, 9) },
    shadowProfile: Object.freeze({ enabled: true, anchor: Object.freeze({ x: 50, y: 90 }) }),
  }),
  'princess-module-pose-05.png': profile({
    imageKey: 'princess-module-pose-05.png', poseType: 'standing', sourceSize: Object.freeze({ width: 874, height: 1800 }),
    bodyAnchor: Object.freeze({ x: 50, y: 91 }), headAnchor: Object.freeze({ x: 50, y: 35 }),
    regions: { head: ellipse(50, 33, 28, 22), leftEar: ellipse(35, 20, 9, 13, -14), rightEar: ellipse(65, 20, 9, 13, 14), leftEye: ellipse(43, 31, 4.1, 3.2), rightEye: ellipse(57, 31, 4.1, 3.2), muzzle: ellipse(50, 39, 13, 8) },
    shadowProfile: Object.freeze({ enabled: true, anchor: Object.freeze({ x: 50, y: 92 }) }), supportedMotions: motions('breathing', 'blink', 'earTwitch', 'headTilt', 'pointerFocus', 'muzzle', 'weightShift'),
  }),
  'princess-module-pose-06.png': profile({
    imageKey: 'princess-module-pose-06.png', poseType: 'closeup', sourceSize: Object.freeze({ width: 1085, height: 1450 }),
    bodyAnchor: Object.freeze({ x: 66, y: 96 }), headAnchor: Object.freeze({ x: 46, y: 48 }),
    regions: { head: ellipse(45, 48, 35, 36, -7), leftEar: ellipse(29, 19, 11, 18, -17), rightEar: ellipse(53, 18, 10, 19, 12), leftEye: ellipse(39, 43, 4.4, 3.2, -5), rightEye: ellipse(51, 42, 4.2, 3.1, -5), muzzle: ellipse(42, 58, 15, 10, -6) },
    shadowProfile: Object.freeze({ enabled: false }), motionIntensity: 0.42,
  }),
  'princess-module-pose-07.png': profile({
    imageKey: 'princess-module-pose-07.png', poseType: 'bow', sourceSize: Object.freeze({ width: 1448, height: 1086 }),
    bodyAnchor: Object.freeze({ x: 46, y: 82 }), headAnchor: Object.freeze({ x: 47, y: 54 }),
    regions: { head: ellipse(47, 52, 17, 27), leftEar: ellipse(40, 29, 6, 12, -12), rightEar: ellipse(55, 28, 6, 12, 12), leftEye: ellipse(44, 49, 2.8, 3), rightEye: ellipse(51, 49, 2.8, 3), muzzle: ellipse(48, 62, 8, 7) },
    shadowProfile: Object.freeze({ enabled: true, anchor: Object.freeze({ x: 51, y: 89 }) }), motionIntensity: 0.44,
  }),
  'princess-module-pose-08.png': profile({
    imageKey: 'princess-module-pose-08.png', poseType: 'prone', sourceSize: Object.freeze({ width: 1085, height: 1450 }),
    bodyAnchor: Object.freeze({ x: 50, y: 80 }), headAnchor: Object.freeze({ x: 55, y: 70 }),
    regions: { head: ellipse(55, 68, 39, 25), leftEar: ellipse(28, 50, 13, 13, -12), rightEar: ellipse(81, 51, 13, 13, 12), leftEye: ellipse(45, 65, 4.8, 3.5), rightEye: ellipse(65, 65, 4.8, 3.5), muzzle: ellipse(56, 77, 17, 9) },
    shadowProfile: Object.freeze({ enabled: true, anchor: Object.freeze({ x: 51, y: 87 }) }), motionIntensity: 0.38,
    supportedMotions: motions('breathing', 'blink', 'sleepyEyelids', 'earTwitch', 'headLower', 'muzzle'),
  }),
});

export const PRINCESS_ROTO_LIMITS = Object.freeze({
  headDegrees: 2.2, earDegrees: 4, pointerDegrees: 1.35, translationPercent: 0.8,
});

export function getPrincessRotoProfile(imagePath = '') {
  const key = imagePath.split('/').pop();
  return PRINCESS_ROTO_PROFILES[key] || PRINCESS_ROTO_PROFILES['princess-module-pose-02.png'];
}

export function supportsPrincessMotion(profile, motion) {
  return Boolean(profile?.supportedMotions?.includes(motion));
}
