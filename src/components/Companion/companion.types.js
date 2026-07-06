/**
 * @typedef {'idle' | 'blink' | 'tilt' | 'lookAround' | 'lookLeft' | 'lookRight' | 'walk' | 'sleep' | 'wake' | 'tap'} CompanionState
 */

/**
 * @typedef {Object} CompanionFrame
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} CompanionPosition
 * @property {number} x
 * @property {number} y
 */

export const COMPANION_STATES = Object.freeze({
  idle: 'idle',
  blink: 'blink',
  tilt: 'tilt',
  lookAround: 'lookAround',
  walk: 'walk',
  sleep: 'sleep',
  wake: 'wake',
  tap: 'tap',
});
