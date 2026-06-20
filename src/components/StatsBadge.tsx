// Neutral information, not a guilt trip or a streak to defend. Just a count,
// plus the running estimated rating once any games have been played.
import type { DailyStats, RatingState } from '../types'
import { formatRating } from '../lib/glicko'

export function StatsBadge({ stats, rating }: { stats: DailyStats; rating: RatingState }) {
  const hasRating = rating.games > 0
  if (stats.games === 0 && !hasRating) return null

  return (
    <p className="text-center text-xs text-muted">
      {hasRating && (
        <span className="text-ink">Rating {formatRating(rating, rating.games)}</span>
      )}
      {hasRating && stats.games > 0 && <span className="text-edge"> · </span>}
      {stats.games > 0 && (
        <>
          Game {stats.games} today <span className="text-edge">·</span> {stats.wins}W ·{' '}
          {stats.draws}D · {stats.losses}L
        </>
      )}
    </p>
  )
}
