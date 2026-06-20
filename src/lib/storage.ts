// Typed localStorage access. All app persistence flows through here so keys and
// shapes stay in one place. Everything degrades gracefully if storage is
// unavailable (private mode, quota) — reads fall back to defaults.
import type { DailyStats, Settings } from '../types'

const KEYS = {
  settings: 'sc.settings.v1',
  stats: 'sc.stats.v1',
} as const

export const DEFAULT_SETTINGS: Settings = {
  timeControl: { initial: 180, increment: 2 }, // 3+2 — a friendly blitz default
  skill: 4,
  colorPref: 'white',
  boardTheme: 'brown',
  sound: true,
  haptics: true,
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) }
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked — non-fatal */
  }
}

export function loadSettings(): Settings {
  const s = read<Settings>(KEYS.settings, DEFAULT_SETTINGS)
  // nested object needs its own merge so partial saves stay valid
  return { ...s, timeControl: { ...DEFAULT_SETTINGS.timeControl, ...s.timeControl } }
}

export function saveSettings(s: Settings): void {
  write(KEYS.settings, s)
}

export function todayKey(d = new Date()): string {
  // local-time YYYY-MM-DD
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function loadStats(): DailyStats {
  const blank: DailyStats = { date: todayKey(), games: 0, wins: 0, losses: 0, draws: 0 }
  const s = read<DailyStats>(KEYS.stats, blank)
  // roll over at local midnight — "games today" means today
  if (s.date !== todayKey()) return blank
  return s
}

export function recordGame(outcome: 'win' | 'loss' | 'draw'): DailyStats {
  const s = loadStats()
  const next: DailyStats = {
    date: todayKey(),
    games: s.games + 1,
    wins: s.wins + (outcome === 'win' ? 1 : 0),
    losses: s.losses + (outcome === 'loss' ? 1 : 0),
    draws: s.draws + (outcome === 'draw' ? 1 : 0),
  }
  write(KEYS.stats, next)
  return next
}
