// Settings panel. Board theme / sound / haptics apply immediately; time
// control, strength and color take effect on the next new game (shown in UI).
import { useState } from 'react'
import type {
  BoardTheme,
  PlayerColorPref,
  RatingState,
  Settings as SettingsT,
  TimeControl,
} from '../types'
import { TIME_PRESETS, tcEquals } from '../lib/time'
import { formatRating } from '../lib/glicko'
import { eloForLevel } from '../engine/botStrength'

interface SettingsProps {
  settings: SettingsT
  rating: RatingState
  onChange: (patch: Partial<SettingsT>) => void
  onResetRating: () => void
  onClose: () => void
  onStartNewGame: () => void
}

const THEMES: { id: BoardTheme; label: string; light: string; dark: string }[] = [
  { id: 'brown', label: 'Brown', light: '#f0d9b5', dark: '#b58863' },
  { id: 'blue', label: 'Blue', light: '#dee3e6', dark: '#8ca2ad' },
  { id: 'green', label: 'Green', light: '#eeeed2', dark: '#769656' },
  { id: 'slate', label: 'Slate', light: '#c6cdd6', dark: '#5d6b85' },
]

const COLORS: { id: PlayerColorPref; label: string }[] = [
  { id: 'white', label: 'White' },
  { id: 'black', label: 'Black' },
  { id: 'random', label: 'Random' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[40px] rounded-lg px-3 text-sm font-medium ring-1 transition-colors ${
        active ? 'bg-accent text-bg ring-accent' : 'bg-panel text-ink ring-edge active:bg-edge'
      }`}
    >
      {children}
    </button>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[44px] items-center justify-between rounded-lg bg-panel px-3 ring-1 ring-edge"
    >
      <span className="text-sm text-ink">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-edge'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

export function Settings({
  settings,
  rating,
  onChange,
  onResetRating,
  onClose,
  onStartNewGame,
}: SettingsProps) {
  const isCustomTc = !TIME_PRESETS.some((p) => tcEquals(p.tc, settings.timeControl))
  const [customInitial, setCustomInitial] = useState(String(settings.timeControl.initial))
  const [customInc, setCustomInc] = useState(String(settings.timeControl.increment))

  const applyCustom = () => {
    const initial = Math.max(10, Math.min(3600, Math.round(Number(customInitial) || 0)))
    const increment = Math.max(0, Math.min(60, Math.round(Number(customInc) || 0)))
    const tc: TimeControl = { initial, increment }
    onChange({ timeControl: tc })
  }

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-bg animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <header className="flex items-center justify-between border-b border-edge px-4 py-3">
        <h2 className="text-lg font-bold">Settings</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="min-h-[40px] min-w-[40px] rounded-lg text-2xl text-muted active:bg-edge"
        >
          ✕
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
        <Section title="Time control">
          <div className="grid grid-cols-5 gap-2">
            {TIME_PRESETS.map((p) => (
              <Chip
                key={p.label}
                active={tcEquals(p.tc, settings.timeControl)}
                onClick={() => onChange({ timeControl: p.tc })}
              >
                {p.label}
              </Chip>
            ))}
          </div>
          <div className="mt-1 flex items-end gap-2">
            <label className="flex flex-col text-xs text-muted">
              Minutes·sec base (s)
              <input
                inputMode="numeric"
                value={customInitial}
                onChange={(e) => setCustomInitial(e.target.value)}
                onBlur={applyCustom}
                className="mt-1 w-24 rounded-lg bg-panel px-2 py-2 text-ink ring-1 ring-edge"
              />
            </label>
            <label className="flex flex-col text-xs text-muted">
              Increment (s)
              <input
                inputMode="numeric"
                value={customInc}
                onChange={(e) => setCustomInc(e.target.value)}
                onBlur={applyCustom}
                className="mt-1 w-24 rounded-lg bg-panel px-2 py-2 text-ink ring-1 ring-edge"
              />
            </label>
            {isCustomTc && <span className="pb-2 text-xs text-accent">custom</span>}
          </div>
        </Section>

        <Section title={`Strength · level ${settings.skill} · ~${eloForLevel(settings.skill)} Elo`}>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={settings.skill}
            onChange={(e) => onChange({ skill: Number(e.target.value) })}
            className="w-full accent-accent"
            aria-label="Bot strength 1 to 10"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>Gentle</span>
            <span>Brutal</span>
          </div>
        </Section>

        <Section title="Estimated rating">
          <div className="flex items-center justify-between rounded-lg bg-panel px-3 py-3 ring-1 ring-edge">
            <div className="flex flex-col">
              <span className="font-clock text-2xl font-bold text-ink">
                {rating.games > 0 ? formatRating(rating, rating.games) : '—'}
              </span>
              <span className="text-[11px] text-muted">
                {rating.games === 0
                  ? 'Play a few games to calibrate'
                  : `${rating.games} rated game${rating.games === 1 ? '' : 's'}${
                      rating.games < 8 ? ' · provisional' : ''
                    }`}
              </span>
            </div>
            <button
              type="button"
              onClick={onResetRating}
              disabled={rating.games === 0}
              className="min-h-[40px] rounded-lg bg-bg px-3 text-sm font-medium text-danger ring-1 ring-edge active:bg-edge disabled:opacity-40"
            >
              Reset
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            A Glicko-2 estimate from your results vs the bot at its calibrated strength.
            It needs several games to settle and reflects your blitz/bullet play, so treat
            it as a ballpark — not an official rating.
          </p>
        </Section>

        <Section title="Play as">
          <div className="grid grid-cols-3 gap-2">
            {COLORS.map((c) => (
              <Chip
                key={c.id}
                active={settings.colorPref === c.id}
                onClick={() => onChange({ colorPref: c.id })}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Board theme">
          <div className="grid grid-cols-4 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange({ boardTheme: t.id })}
                aria-label={`${t.label} board`}
                aria-pressed={settings.boardTheme === t.id}
                className={`flex flex-col items-center gap-1 rounded-lg p-2 ring-1 transition-colors ${
                  settings.boardTheme === t.id ? 'ring-accent' : 'ring-edge'
                }`}
              >
                <span className="grid h-8 w-8 grid-cols-2 grid-rows-2 overflow-hidden rounded">
                  <span style={{ background: t.light }} />
                  <span style={{ background: t.dark }} />
                  <span style={{ background: t.dark }} />
                  <span style={{ background: t.light }} />
                </span>
                <span className="text-[10px] text-muted">{t.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Feedback">
          <Toggle
            checked={settings.sound}
            onChange={(v) => onChange({ sound: v })}
            label="Sound effects"
          />
          <Toggle
            checked={settings.haptics}
            onChange={(v) => onChange({ haptics: v })}
            label="Haptics (vibration)"
          />
        </Section>
      </div>

      <footer className="border-t border-edge px-4 py-3">
        <button
          type="button"
          onClick={onStartNewGame}
          className="min-h-[52px] w-full rounded-xl bg-accent text-base font-semibold text-bg"
        >
          Start new game
        </button>
      </footer>
    </div>
  )
}
