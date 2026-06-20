// Bottom action row — reachable by one thumb. Draw offers are intentionally
// absent: there's no human to negotiate with vs a bot.
interface ControlsProps {
  playing: boolean
  onResign: () => void
  onNewGame: () => void
  onFlip: () => void
  onOpenSettings: () => void
}

function Btn({
  onClick,
  children,
  ariaLabel,
  tone = 'default',
}: {
  onClick: () => void
  children: React.ReactNode
  ariaLabel: string
  tone?: 'default' | 'danger' | 'accent'
}) {
  const toneCls =
    tone === 'danger'
      ? 'text-danger active:bg-danger/10'
      : tone === 'accent'
        ? 'text-accent active:bg-accent/10'
        : 'text-ink active:bg-edge'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-panel px-2 py-2 text-xs font-medium ring-1 ring-edge transition-colors ${toneCls}`}
    >
      {children}
    </button>
  )
}

export function Controls({ playing, onResign, onNewGame, onFlip, onOpenSettings }: ControlsProps) {
  return (
    <div className="flex items-stretch gap-2">
      {playing ? (
        <Btn onClick={onResign} ariaLabel="Resign game" tone="danger">
          <span aria-hidden className="text-lg leading-none">⚑</span>
          Resign
        </Btn>
      ) : (
        <Btn onClick={onNewGame} ariaLabel="Start a new game" tone="accent">
          <span aria-hidden className="text-lg leading-none">▶</span>
          New
        </Btn>
      )}
      <Btn onClick={onFlip} ariaLabel="Flip board">
        <span aria-hidden className="text-lg leading-none">⇅</span>
        Flip
      </Btn>
      <Btn onClick={onOpenSettings} ariaLabel="Open settings">
        <span aria-hidden className="text-lg leading-none">⚙</span>
        Settings
      </Btn>
    </div>
  )
}
