// Calibrated bot strength. For rating estimation each difficulty must map to a
// *known* opponent Elo, so above Stockfish's UCI_Elo floor (~1320) we drive the
// engine with UCI_LimitStrength + UCI_Elo (it targets that Elo directly). Below
// the floor we fall back to Skill Level and treat the Elo as a nominal estimate.
//
// These Elo values are approximate — short think times and the engine's own
// limit-strength slop mean they're a ballpark, not gospel. Glicko's rating
// deviation is what absorbs that uncertainty.

export interface BotConfig {
  /** the opponent Elo this difficulty represents (used for rating updates) */
  elo: number
  /** true → UCI_LimitStrength + UCI_Elo; false → Skill Level fallback */
  limitStrength: boolean
  /** Stockfish Skill Level 0–20, used only when limitStrength is false */
  skillLevel: number
  /** think time cap (ms) — kept low for a snappy blitz feel */
  movetime: number
}

const STOCKFISH_ELO_FLOOR = 1320

// level 1–10 → nominal Elo. Monotonic, spanning beginner → strong club player.
const ELO_BY_LEVEL: Record<number, number> = {
  1: 800,
  2: 1000,
  3: 1200,
  4: 1320,
  5: 1500,
  6: 1700,
  7: 1900,
  8: 2100,
  9: 2400,
  10: 2850,
}

export function eloForLevel(level: number): number {
  const l = Math.min(10, Math.max(1, Math.round(level)))
  return ELO_BY_LEVEL[l]
}

export function botConfig(level: number): BotConfig {
  const l = Math.min(10, Math.max(1, Math.round(level)))
  const elo = ELO_BY_LEVEL[l]
  const t = (l - 1) / 9 // 0..1, for movetime scaling
  const movetime = Math.round(150 + t * 450) // 150..600ms

  if (elo >= STOCKFISH_ELO_FLOOR) {
    return { elo, limitStrength: true, skillLevel: 20, movetime }
  }
  // below the engine's Elo floor: approximate weakness with Skill Level
  // (0,1,2 → roughly the 800/1000/1200 buckets)
  const skillLevel = Math.max(0, l - 1)
  return { elo, limitStrength: false, skillLevel, movetime }
}
