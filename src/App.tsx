import { useCallback, useEffect, useRef, useState } from 'react'
import { Board, type BoardHandle } from './components/Board'
import { Clock } from './components/Clock'
import { Controls } from './components/Controls'
import { ResultScreen } from './components/ResultScreen'
import { Settings } from './components/Settings'
import { StatsBadge } from './components/StatsBadge'
import { ChessState, otherColor, type Dests } from './engine/chessState'
import { useStockfish } from './engine/useStockfish'
import {
  loadRating,
  loadSettings,
  loadStats,
  recordGame,
  recordRatedGame,
  resetRating,
  saveSettings,
  type RatingUpdate,
} from './lib/storage'
import { eloForLevel } from './engine/botStrength'
import { haptics, setHapticsEnabled } from './lib/haptics'
import { setSoundEnabled, sound, unlock } from './lib/sound'
import type { Color, GameResult, PlayerColorPref, Settings as SettingsT } from './types'

interface Position {
  fen: string
  turnColor: Color
  check: boolean
  lastMove?: [string, string]
  dests: Dests
}

type PromoPiece = 'q' | 'r' | 'n' | 'b'
type View = 'board' | 'settings'

const EMPTY_DESTS: Dests = new Map()

function resolveColor(pref: PlayerColorPref): Color {
  if (pref === 'white' || pref === 'black') return pref
  return Math.random() < 0.5 ? 'white' : 'black'
}

export default function App() {
  const stockfish = useStockfish()

  const [settings, setSettings] = useState<SettingsT>(() => loadSettings())
  const [stats, setStats] = useState(() => loadStats())
  const [rating, setRating] = useState(() => loadRating())
  const [ratingChange, setRatingChange] = useState<RatingUpdate | null>(null)
  const [view, setView] = useState<View>('board')

  const [started, setStarted] = useState(false)
  const [playerColor, setPlayerColor] = useState<Color>('white')
  const [orientation, setOrientation] = useState<Color>('white')
  const [position, setPosition] = useState<Position>(() => {
    const c = new ChessState()
    return { fen: c.fen(), turnColor: c.turn(), check: false, dests: EMPTY_DESTS }
  })
  const [clocks, setClocks] = useState({ white: 0, black: 0 })
  const [thinking, setThinking] = useState(false)
  const [gameResult, setGameResult] = useState<GameResult | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null)
  const [flashSide, setFlashSide] = useState<Color | null>(null)

  // --- refs for use inside async callbacks / the clock interval ---
  const chessRef = useRef(new ChessState())
  const playerColorRef = useRef<Color>('white')
  const gameOverRef = useRef(false)
  const recordedRef = useRef(false)
  const thinkingRef = useRef(false)
  // the difficulty level locked in at the start of the current game — used for
  // the rating update so mid-game settings changes don't skew it
  const gameLevelRef = useRef(settings.skill)
  const boardRef = useRef<BoardHandle>(null)
  const attemptPremoveRef = useRef(false)
  // forward-reference: the bot's async callback applies a move, but applyMove is
  // defined after triggerBot. A ref keeps it current and breaks the cycle.
  const applyMoveRef = useRef<
    (from: string, to: string, promo: PromoPiece, isBot: boolean) => void
  >(() => {})

  // clock authority
  const clockRef = useRef({ white: 0, black: 0 })
  const activeRef = useRef<Color | null>(null)
  const lastTickRef = useRef(0)

  // keep the engine's feedback toggles in sync with settings
  useEffect(() => {
    setSoundEnabled(settings.sound)
    setHapticsEnabled(settings.haptics)
    saveSettings(settings)
  }, [settings])

  // ---- clock tick: independent of the move/engine loop; owns flag detection ----
  useEffect(() => {
    const id = window.setInterval(() => {
      const active = activeRef.current
      if (!active || gameOverRef.current) return
      const now = performance.now()
      const dt = now - lastTickRef.current
      lastTickRef.current = now
      const next = clockRef.current[active] - dt
      clockRef.current[active] = next
      if (next <= 0) {
        clockRef.current[active] = 0
        setClocks({ white: clockRef.current.white, black: clockRef.current.black })
        // the side that ran out loses on time
        endGame({ winner: otherColor(active), reason: 'timeout' })
        return
      }
      setClocks({ white: clockRef.current.white, black: clockRef.current.black })
    }, 100)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setActive = useCallback((color: Color | null) => {
    activeRef.current = color
    lastTickRef.current = performance.now()
  }, [])

  const syncPosition = useCallback(() => {
    const c = chessRef.current
    const isPlayerTurn = c.turn() === playerColorRef.current
    setPosition({
      fen: c.fen(),
      turnColor: c.turn(),
      check: c.inCheck(),
      lastMove: c.lastMove(),
      dests: isPlayerTurn ? c.dests() : EMPTY_DESTS,
    })
  }, [])

  const endGame = useCallback((result: GameResult) => {
    if (gameOverRef.current) return
    gameOverRef.current = true
    setActive(null)
    thinkingRef.current = false
    setThinking(false)
    stockfish.stop()
    setReviewing(false)
    setGameResult(result)
    if (!recordedRef.current) {
      recordedRef.current = true
      const outcome =
        result.winner === null
          ? 'draw'
          : result.winner === playerColorRef.current
            ? 'win'
            : 'loss'
      setStats(recordGame(outcome))
      const update = recordRatedGame(outcome, eloForLevel(gameLevelRef.current))
      setRating(update.after)
      setRatingChange(update)
    }
    sound.gameEnd()
    haptics.gameEnd()
  }, [setActive, stockfish])

  const flashIncrement = useCallback((color: Color) => {
    setFlashSide(color)
    window.setTimeout(() => setFlashSide((s) => (s === color ? null : s)), 600)
  }, [])

  const triggerBot = useCallback(() => {
    if (gameOverRef.current || thinkingRef.current) return
    const botColor = otherColor(playerColorRef.current)
    if (chessRef.current.turn() !== botColor) return
    thinkingRef.current = true
    setThinking(true)
    const fen = chessRef.current.fen()
    stockfish.requestMove(fen, settings.skill).then((mv) => {
      thinkingRef.current = false
      setThinking(false)
      if (!mv || gameOverRef.current) return
      if (chessRef.current.turn() !== botColor) return
      applyMoveRef.current(mv.from, mv.to, mv.promotion ?? 'q', true)
    })
  }, [settings.skill, stockfish])

  // Apply a fully-resolved move to the source of truth, then fan out effects.
  const applyMove = useCallback(
    (from: string, to: string, promo: PromoPiece, isBot: boolean) => {
      const c = chessRef.current
      const mover = c.turn() // color about to move
      const move = c.move(from, to, promo)
      if (!move) {
        // illegal (e.g. a premove that no longer works) — just re-sync the board
        syncPosition()
        return
      }

      // feedback
      const captured = move.flags.includes('c') || move.flags.includes('e')
      if (c.inCheck()) {
        sound.check()
        haptics.check()
      } else if (captured) {
        sound.capture()
        haptics.capture()
      } else {
        sound.move()
        haptics.move()
      }

      // Fischer increment to the side that just moved
      const inc = settings.timeControl.increment * 1000
      if (inc > 0) {
        clockRef.current[mover] += inc
        flashIncrement(mover)
      }
      setClocks({ white: clockRef.current.white, black: clockRef.current.black })

      syncPosition()

      const result = c.result()
      if (result) {
        endGame(result)
        return
      }

      // hand the clock to the other side
      setActive(otherColor(mover))

      if (isBot) {
        // bot just moved → it's the player's turn → fire any queued premove
        attemptPremoveRef.current = true
      } else {
        // player moved → bot thinks
        triggerBot()
      }
    },
    [endGame, flashIncrement, setActive, settings.timeControl.increment, syncPosition, triggerBot],
  )
  applyMoveRef.current = applyMove

  // After the board re-renders to the player's turn following a bot move,
  // execute a queued premove (Board's effect runs before this one).
  useEffect(() => {
    if (!attemptPremoveRef.current) return
    attemptPremoveRef.current = false
    boardRef.current?.playPremove()
  }, [position])

  const handlePlayerMove = useCallback(
    (orig: string, dest: string) => {
      unlock()
      if (gameOverRef.current) {
        syncPosition()
        return
      }
      if (chessRef.current.turn() !== playerColorRef.current) {
        // not our turn (stale) — revert any visual change
        syncPosition()
        return
      }
      if (chessRef.current.isPromotion(orig, dest)) {
        setPromotion({ from: orig, to: dest })
        return
      }
      applyMove(orig, dest, 'q', false)
    },
    [applyMove, syncPosition],
  )

  const choosePromotion = useCallback(
    (piece: PromoPiece) => {
      const p = promotion
      setPromotion(null)
      if (p) applyMove(p.from, p.to, piece, false)
    },
    [applyMove, promotion],
  )

  const cancelPromotion = useCallback(() => {
    setPromotion(null)
    boardRef.current?.cancelPremove()
    syncPosition()
  }, [syncPosition])

  const startGame = useCallback(() => {
    unlock()
    const color = resolveColor(settings.colorPref)
    playerColorRef.current = color
    setPlayerColor(color)
    setOrientation(color)

    chessRef.current = new ChessState()
    gameOverRef.current = false
    recordedRef.current = false
    thinkingRef.current = false
    setThinking(false)
    setGameResult(null)
    setReviewing(false)
    setRatingChange(null)
    setPromotion(null)
    // lock in the difficulty for rating purposes
    gameLevelRef.current = settings.skill

    const ms = settings.timeControl.initial * 1000
    clockRef.current = { white: ms, black: ms }
    setClocks({ white: ms, black: ms })

    stockfish.stop()
    stockfish.newGame()

    syncPosition()
    setStarted(true)
    setView('board')

    // white always moves first; start white's clock
    setActive('white')
    if (color === 'black') {
      // the bot is white and opens the game
      triggerBot()
    }
  }, [
    settings.colorPref,
    settings.timeControl.initial,
    settings.skill,
    stockfish,
    syncPosition,
    setActive,
    triggerBot,
  ])

  const handleResign = useCallback(() => {
    if (gameOverRef.current || !started) return
    endGame({ winner: otherColor(playerColorRef.current), reason: 'resign' })
  }, [endGame, started])

  const updateSettings = useCallback((patch: Partial<SettingsT>) => {
    setSettings((s) => ({ ...s, ...patch }))
  }, [])

  const handleResetRating = useCallback(() => {
    setRating(resetRating())
    setRatingChange(null)
  }, [])

  // ----- derived render values -----
  const live = started && !gameResult
  const botColor = otherColor(playerColor)
  const movableColor: Color | undefined = live ? playerColor : undefined
  const premoveEnabled = live && position.turnColor === botColor
  const topColor = otherColor(orientation) // opponent shown on top
  const topClockColor = topColor
  const bottomClockColor = orientation
  const topMs = clocks[topClockColor]
  const bottomMs = clocks[bottomClockColor]
  const topLabel = topColor === playerColor ? 'You' : 'Bot'
  const bottomLabel = bottomClockColor === playerColor ? 'You' : 'Bot'

  const showResult = !!gameResult && !reviewing && view === 'board'

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-1 pt-3">
        <h1 className="text-base font-bold tracking-tight">
          Speed<span className="text-accent">Chess</span>
        </h1>
        <span className="text-xs text-muted">
          {thinking ? 'Bot thinking…' : live ? 'Your move' : 'Ready'}
        </span>
      </header>

      {/* Top clock (opponent) */}
      <div className="px-4">
        <Clock
          ms={topMs}
          active={live && position.turnColor === topClockColor}
          label={topLabel}
          incrementFlash={flashSide === topClockColor}
        />
      </div>

      {/* Board */}
      <main className="relative flex flex-1 items-center px-2 py-2">
        <Board
          ref={boardRef}
          fen={position.fen}
          orientation={orientation}
          turnColor={position.turnColor}
          movableColor={movableColor}
          dests={position.dests}
          lastMove={position.lastMove}
          check={position.check}
          premoveEnabled={premoveEnabled}
          theme={settings.boardTheme}
          onMove={handlePlayerMove}
        />

        {!started && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-bg/85 px-6 backdrop-blur-sm">
            <p className="text-center text-sm text-muted">
              Bullet &amp; blitz vs a Stockfish bot. Offline-ready.
            </p>
            <button
              type="button"
              onClick={startGame}
              className="min-h-[52px] w-48 rounded-xl bg-accent text-base font-semibold text-bg"
            >
              Play
            </button>
          </div>
        )}

        {promotion && (
          <PromotionPicker color={playerColor} onPick={choosePromotion} onCancel={cancelPromotion} />
        )}

        {showResult && (
          <ResultScreen
            result={gameResult!}
            playerColor={playerColor}
            stats={stats}
            rating={rating}
            ratingChange={ratingChange}
            onRematch={startGame}
            onReview={() => setReviewing(true)}
            onSettings={() => setView('settings')}
          />
        )}
      </main>

      {/* Bottom clock (you) */}
      <div className="px-4">
        <Clock
          ms={bottomMs}
          active={live && position.turnColor === bottomClockColor}
          label={bottomLabel}
          incrementFlash={flashSide === bottomClockColor}
        />
      </div>

      {/* Stats + controls */}
      <div className="flex flex-col gap-2 px-4 pb-3 pt-2">
        <StatsBadge stats={stats} rating={rating} />
        <Controls
          playing={live}
          onResign={handleResign}
          onNewGame={startGame}
          onFlip={() => setOrientation((o) => otherColor(o))}
          onOpenSettings={() => setView('settings')}
        />
      </div>

      {view === 'settings' && (
        <Settings
          settings={settings}
          rating={rating}
          onChange={updateSettings}
          onResetRating={handleResetRating}
          onClose={() => setView('board')}
          onStartNewGame={startGame}
        />
      )}
    </div>
  )
}

function PromotionPicker({
  color,
  onPick,
  onCancel,
}: {
  color: Color
  onPick: (p: PromoPiece) => void
  onCancel: () => void
}) {
  const pieces: { role: PromoPiece; glyph: string }[] = [
    { role: 'q', glyph: color === 'white' ? '♕' : '♛' },
    { role: 'r', glyph: color === 'white' ? '♖' : '♜' },
    { role: 'b', glyph: color === 'white' ? '♗' : '♝' },
    { role: 'n', glyph: color === 'white' ? '♘' : '♞' },
  ]
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-bg/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Choose promotion piece"
      onClick={onCancel}
    >
      <div
        className="grid grid-cols-2 gap-2 rounded-2xl bg-panel p-3 ring-1 ring-edge"
        onClick={(e) => e.stopPropagation()}
      >
        {pieces.map((p) => (
          <button
            key={p.role}
            type="button"
            onClick={() => onPick(p.role)}
            aria-label={`Promote to ${p.role}`}
            className="flex h-16 w-16 items-center justify-center rounded-xl bg-bg text-4xl text-ink ring-1 ring-edge active:bg-edge"
          >
            {p.glyph}
          </button>
        ))}
      </div>
    </div>
  )
}
