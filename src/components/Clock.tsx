// Pure display. The countdown + flag detection live in App's clock tick (kept
// independent of the engine/move loop); this just renders a side's remaining
// time with the low-time color shift + pulse that make the clock the emotional
// center of the screen.
import { formatClock } from '../lib/time'

interface ClockProps {
  ms: number
  active: boolean
  /** label, e.g. "You" / "Bot" */
  label: string
  /** brief +increment flash when time ticked up */
  incrementFlash?: boolean
}

const LOW_TIME_MS = 10_000

export function Clock({ ms, active, label, incrementFlash }: ClockProps) {
  const low = ms <= LOW_TIME_MS
  const flagged = ms <= 0

  const color = flagged
    ? 'text-danger'
    : low
      ? active
        ? 'text-danger'
        : 'text-warn'
      : active
        ? 'text-ink'
        : 'text-muted'

  return (
    <div
      className={[
        'flex items-center justify-between rounded-xl px-4 py-2 transition-colors',
        active ? 'bg-panel ring-1 ring-edge' : 'bg-panel/40',
        low && active && !flagged ? 'animate-pulse2' : '',
      ].join(' ')}
      aria-live={active ? 'polite' : 'off'}
      aria-label={`${label} clock: ${formatClock(ms)}`}
    >
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <span className="relative flex items-baseline gap-2">
        {incrementFlash && (
          <span className="animate-fade-in text-sm font-semibold text-good">+</span>
        )}
        <span className={`font-clock text-4xl font-bold tabular-nums ${color}`}>
          {formatClock(ms)}
        </span>
      </span>
    </div>
  )
}
