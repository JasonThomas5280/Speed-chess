import type { TimeControl } from '../types'

export interface TimePreset {
  label: string
  tc: TimeControl
}

// Bullet / blitz presets, fastest → slowest.
export const TIME_PRESETS: TimePreset[] = [
  { label: '1+0', tc: { initial: 60, increment: 0 } },
  { label: '2+1', tc: { initial: 120, increment: 1 } },
  { label: '3+0', tc: { initial: 180, increment: 0 } },
  { label: '3+2', tc: { initial: 180, increment: 2 } },
  { label: '5+0', tc: { initial: 300, increment: 0 } },
]

export function tcLabel(tc: TimeControl): string {
  const mins = tc.initial / 60
  // show whole minutes when clean, else seconds-style label
  const base = Number.isInteger(mins) ? `${mins}` : `${tc.initial}s`
  return `${base}+${tc.increment}`
}

export function tcEquals(a: TimeControl, b: TimeControl): boolean {
  return a.initial === b.initial && a.increment === b.increment
}

/**
 * Format milliseconds remaining as a clock string.
 * - ≥ 20s: M:SS
 * - < 20s: SS.d (tenths) so the final scramble reads as urgent
 */
export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms)
  const totalSeconds = clamped / 1000
  if (totalSeconds < 20) {
    const s = Math.floor(totalSeconds)
    const tenths = Math.floor((totalSeconds - s) * 10)
    return `${s}.${tenths}`
  }
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}
