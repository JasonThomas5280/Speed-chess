// Glicko-2 rating, updated one game at a time (each game = a one-game rating
// period). This is the standard, statistically sound way to estimate a rating
// from results against opponents of known strength — here, the calibrated bot.
//
// Reference: Glickman, "Example of the Glicko-2 system" (glicko.net/glicko/glicko2.pdf)

export interface Glicko {
  /** rating on the familiar Elo-like scale */
  rating: number
  /** rating deviation — the ± uncertainty (smaller = more confident) */
  rd: number
  /** volatility — expected fluctuation in rating */
  vol: number
}

export const DEFAULT_GLICKO: Glicko = { rating: 1500, rd: 350, vol: 0.06 }

// System constant: constrains volatility change. 0.3–1.2; lower = steadier.
const TAU = 0.5
const SCALE = 173.7178
// Keep RD from collapsing so the estimate stays responsive to recent form.
const MIN_RD = 30
const MAX_RD = 350

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
}

function expectedScore(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)))
}

/** Solve for the new volatility via the Illinois (regula falsi) algorithm. */
function newVolatility(phi: number, v: number, delta: number, sigma: number): number {
  const a = Math.log(sigma * sigma)
  const eps = 0.000001
  const phi2 = phi * phi
  const delta2 = delta * delta

  const f = (x: number): number => {
    const ex = Math.exp(x)
    const num = ex * (delta2 - phi2 - v - ex)
    const den = 2 * (phi2 + v + ex) * (phi2 + v + ex)
    return num / den - (x - a) / (TAU * TAU)
  }

  let A = a
  let B: number
  if (delta2 > phi2 + v) {
    B = Math.log(delta2 - phi2 - v)
  } else {
    let k = 1
    while (f(a - k * TAU) < 0) k += 1
    B = a - k * TAU
  }

  let fA = f(A)
  let fB = f(B)
  let iter = 0
  while (Math.abs(B - A) > eps && iter < 100) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) {
      A = B
      fA = fB
    } else {
      fA = fA / 2
    }
    B = C
    fB = fC
    iter += 1
  }
  return Math.exp(A / 2)
}

/**
 * Update a player's Glicko-2 after a single game.
 * @param player    current rating/RD/volatility
 * @param oppRating opponent's rating (the bot's calibrated Elo)
 * @param oppRd     opponent's rating deviation (small — its strength is known)
 * @param score     1 = win, 0.5 = draw, 0 = loss (from the player's view)
 */
export function updateGlicko(
  player: Glicko,
  oppRating: number,
  oppRd: number,
  score: number,
): Glicko {
  // Step 2: to the Glicko-2 scale
  const mu = (player.rating - 1500) / SCALE
  const phi = Math.min(player.rd, MAX_RD) / SCALE
  const muJ = (oppRating - 1500) / SCALE
  const phiJ = oppRd / SCALE

  // Step 3–4: variance and improvement of the one game
  const gJ = g(phiJ)
  const E = expectedScore(mu, muJ, phiJ)
  const v = 1 / (gJ * gJ * E * (1 - E))
  const delta = v * gJ * (score - E)

  // Step 5: new volatility
  const sigmaP = newVolatility(phi, v, delta, player.vol)

  // Step 6–7: new RD and rating (Glicko-2 scale)
  const phiStar = Math.sqrt(phi * phi + sigmaP * sigmaP)
  const phiP = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  const muP = mu + phiP * phiP * gJ * (score - E)

  // Step 8: back to the Elo-like scale
  const rating = SCALE * muP + 1500
  const rd = Math.min(MAX_RD, Math.max(MIN_RD, SCALE * phiP))
  return { rating, rd, vol: sigmaP }
}

/** A game count below this means the estimate is still settling. */
export const PROVISIONAL_GAMES = 8

/** Human-readable rating, e.g. "1485 ± 96" or "~1485?" while provisional. */
export function formatRating(g: Glicko, games: number): string {
  const r = Math.round(g.rating)
  if (games < PROVISIONAL_GAMES || g.rd > 110) return `~${r}?`
  return `${r} ± ${Math.round(g.rd)}`
}
