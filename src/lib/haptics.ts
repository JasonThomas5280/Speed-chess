// Thin wrapper over the Vibration API. Cheap tactile feedback that makes the
// board feel physical. No-ops where unsupported (iOS Safari ignores it).
let enabled = true

export function setHapticsEnabled(on: boolean): void {
  enabled = on
}

function vibrate(pattern: number | number[]): void {
  if (!enabled) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}

export const haptics = {
  move: () => vibrate(10),
  capture: () => vibrate(18),
  check: () => vibrate([14, 30, 14]),
  lowTime: () => vibrate(8),
  gameEnd: () => vibrate([20, 40, 20, 40, 40]),
}
