export const PRINCESS_FRAMES = Object.freeze({
  idle: Object.freeze({
    x: 39,
    y: 5,
    width: 114,
    height: 198,
  }),
  blink: Object.freeze({
    x: 342,
    y: 5,
    width: 114,
    height: 198,
  }),
  tilt: Object.freeze({
    x: 190,
    y: 5,
    width: 114,
    height: 198,
  }),
  lookLeft: Object.freeze({
    x: 190,
    y: 5,
    width: 114,
    height: 198,
  }),
  lookRight: Object.freeze({
    x: 493,
    y: 5,
    width: 114,
    height: 198,
  }),
});

export const IDLE_COMPANION_FRAME = PRINCESS_FRAMES.idle;

export function getCompanionFrame(frameName = 'idle') {
  return PRINCESS_FRAMES[frameName] || PRINCESS_FRAMES.idle;
}
