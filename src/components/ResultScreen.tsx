// Post-game screen. The deliberate friction lives here: a clean result, then a
// beat of stillness before rematch becomes tappable. One tap to play again — we
// just don't auto-fire it or exploit the loop.
import { useEffect, useState } from 'react'
import type { Color, GameResult, DailyStats } from '../types'

interface ResultScreenProps {
  result: GameResult
  playerColor: Color
  stats: DailyStats
  onRematch: () => void
  onReview: () => void
  onSettings: () => void
}

const REASON_TEXT: Record<GameResult['reason'], string> = {
  checkmate: 'Checkmate',
  timeout: 'On time',
  resign: 'By resignation',
  stalemate: 'Stalemate',
  insufficient: 'Insufficient material',
  repetition: 'Threefold repetition',
  'fifty-move': 'Fifty-move rule',
  draw: 'Draw',
}

export function ResultScreen({
  result,
  playerColor,
  stats,
  onRematch,
  onReview,
  onSettings,
}: ResultScreenProps) {
  // the beat of stillness — rematch is reachable, just not instantly reflexive
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 900)
    return () => clearTimeout(t)
  }, [])

  const outcome =
    result.winner === null ? 'draw' : result.winner === playerColor ? 'win' : 'loss'

  const headline =
    outcome === 'win' ? 'You won' : outcome === 'loss' ? 'You lost' : 'Draw'
  const headlineColor =
    outcome === 'win' ? 'text-good' : outcome === 'loss' ? 'text-danger' : 'text-ink'

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-bg/92 px-6 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Game over"
    >
      <div className="text-center">
        <h2 className={`text-4xl font-extrabold ${headlineColor}`}>{headline}</h2>
        <p className="mt-2 text-sm text-muted">{REASON_TEXT[result.reason]}</p>
      </div>

      <p className="text-xs text-muted">
        Game {stats.games} today · {stats.wins}W · {stats.draws}D · {stats.losses}L
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={onRematch}
          disabled={!armed}
          className={`min-h-[52px] rounded-xl bg-accent text-base font-semibold text-bg transition-all duration-500 ${
            armed ? 'opacity-100' : 'pointer-events-none opacity-30'
          }`}
        >
          Rematch
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onReview}
            className="min-h-[48px] flex-1 rounded-xl bg-panel text-sm font-medium text-ink ring-1 ring-edge"
          >
            Review board
          </button>
          <button
            type="button"
            onClick={onSettings}
            className="min-h-[48px] flex-1 rounded-xl bg-panel text-sm font-medium text-ink ring-1 ring-edge"
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  )
}
