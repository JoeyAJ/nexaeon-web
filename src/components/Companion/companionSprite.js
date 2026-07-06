import { COMPANION_STATES } from './companion.types.js';

export const SPRITESHEET_SIZE = Object.freeze({
  width: 1536,
  height: 1872,
});

// MVP mapping measured from the existing Princess spritesheet. Future spritesheets can refine
// these crop rectangles without changing the Companion state machine or Princess identity.
export const COMPANION_FRAME_SETS = Object.freeze({
  [COMPANION_STATES.idle]: [
    { x: 30, y: 12, width: 132, height: 214 },
    { x: 218, y: 12, width: 134, height: 214 },
  ],
  [COMPANION_STATES.blink]: [
    { x: 218, y: 12, width: 134, height: 214 },
    { x: 405, y: 12, width: 134, height: 214 },
    { x: 218, y: 12, width: 134, height: 214 },
  ],
  [COMPANION_STATES.tilt]: [
    { x: 218, y: 12, width: 134, height: 214 },
    { x: 602, y: 12, width: 142, height: 214 },
    { x: 218, y: 12, width: 134, height: 214 },
  ],
  [COMPANION_STATES.lookAround]: [
    { x: 30, y: 12, width: 132, height: 214 },
    { x: 798, y: 12, width: 138, height: 214 },
    { x: 985, y: 12, width: 138, height: 214 },
    { x: 218, y: 12, width: 134, height: 214 },
  ],
  [COMPANION_STATES.walk]: [
    { x: 4, y: 242, width: 190, height: 202 },
    { x: 205, y: 238, width: 208, height: 206 },
    { x: 407, y: 256, width: 214, height: 188 },
    { x: 615, y: 244, width: 214, height: 200 },
    { x: 820, y: 242, width: 214, height: 202 },
    { x: 1026, y: 242, width: 214, height: 202 },
  ],
  [COMPANION_STATES.sleep]: [
    { x: 28, y: 1166, width: 142, height: 214 },
    { x: 218, y: 1166, width: 142, height: 214 },
    { x: 592, y: 1178, width: 218, height: 158 },
  ],
  [COMPANION_STATES.wake]: [
    { x: 592, y: 1178, width: 218, height: 158 },
    { x: 405, y: 1166, width: 142, height: 214 },
    { x: 218, y: 12, width: 134, height: 214 },
  ],
  [COMPANION_STATES.tap]: [
    { x: 30, y: 720, width: 142, height: 214 },
    { x: 215, y: 718, width: 154, height: 218 },
    { x: 408, y: 720, width: 142, height: 214 },
    { x: 215, y: 718, width: 154, height: 218 },
  ],
});

export const COMPANION_FRAME_INTERVAL_MS = Object.freeze({
  [COMPANION_STATES.idle]: 1_100,
  [COMPANION_STATES.blink]: 160,
  [COMPANION_STATES.tilt]: 220,
  [COMPANION_STATES.lookAround]: 260,
  [COMPANION_STATES.walk]: 150,
  [COMPANION_STATES.sleep]: 1_600,
  [COMPANION_STATES.wake]: 180,
  [COMPANION_STATES.tap]: 170,
});

export function getCompanionFrames(state) {
  return COMPANION_FRAME_SETS[state] || COMPANION_FRAME_SETS[COMPANION_STATES.idle];
}

export function getCompanionFrame(state, frameIndex) {
  const frames = getCompanionFrames(state);
  return frames[frameIndex % frames.length];
}
