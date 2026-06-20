// Neutral information, not a guilt trip or a streak to defend. Just a count.
import type { DailyStats } from '../types'

export function StatsBadge({ stats }: { stats: DailyStats }) {
  if (stats.games === 0) return null
  const record = `${stats.wins}W · ${stats.draws}D · ${stats.losses}L`
  return (
    <p className="text-center text-xs text-muted">
      Game {stats.games} today <span className="text-edge">·</span> {record}
    </p>
  )
}
