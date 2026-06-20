// Wraps chessground. chessground is display-only: it reports the squares a user
// touched, and we render whatever position the parent (driven by chess.js) tells
// us to. The parent owns truth; this component owns pixels.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Config } from '@lichess-org/chessground/config'
import type { Key, Dests as CgDests } from '@lichess-org/chessground/types'
import type { Color, BoardTheme } from '../types'
import type { Dests } from '../engine/chessState'

export interface BoardHandle {
  /** Run any queued premove now that it's the player's turn. */
  playPremove: () => boolean
  cancelPremove: () => void
}

interface BoardProps {
  fen: string
  orientation: Color
  turnColor: Color
  /** which color the human may move/premove right now */
  movableColor: Color | undefined
  dests: Dests
  lastMove?: [string, string]
  check: boolean
  premoveEnabled: boolean
  theme: BoardTheme
  onMove: (orig: string, dest: string) => void
  onPremove?: (orig: string, dest: string) => void
  onPremoveUnset?: () => void
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const Board = forwardRef<BoardHandle, BoardProps>(function Board(props, ref) {
  const elRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<Api | null>(null)

  // Keep callbacks in refs so chessground's long-lived config always calls the
  // latest handler without us recreating the board.
  const onMoveRef = useRef(props.onMove)
  const onPremoveRef = useRef(props.onPremove)
  const onPremoveUnsetRef = useRef(props.onPremoveUnset)
  onMoveRef.current = props.onMove
  onPremoveRef.current = props.onPremove
  onPremoveUnsetRef.current = props.onPremoveUnset

  useImperativeHandle(ref, () => ({
    playPremove: () => apiRef.current?.playPremove() ?? false,
    cancelPremove: () => apiRef.current?.cancelPremove(),
  }))

  // Create once.
  useEffect(() => {
    if (!elRef.current) return
    const config: Config = {
      fen: props.fen,
      orientation: props.orientation,
      turnColor: props.turnColor,
      check: props.check,
      lastMove: props.lastMove as Key[] | undefined,
      coordinates: true,
      animation: { enabled: !prefersReducedMotion(), duration: 200 },
      highlight: { lastMove: true, check: true },
      movable: {
        free: false,
        color: props.movableColor,
        dests: props.dests as unknown as CgDests,
        showDests: true,
        events: {
          after: (orig: Key, dest: Key) => onMoveRef.current(orig, dest),
        },
      },
      premovable: {
        enabled: props.premoveEnabled,
        showDests: true,
        events: {
          set: (orig: Key, dest: Key) => onPremoveRef.current?.(orig, dest),
          unset: () => onPremoveUnsetRef.current?.(),
        },
      },
      draggable: { enabled: true, showGhost: true },
      selectable: { enabled: true }, // tap-to-move lives alongside drag
      drawable: { enabled: false },
    }
    apiRef.current = Chessground(elRef.current, config)
    return () => {
      apiRef.current?.destroy()
      apiRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push position/state updates on every relevant prop change.
  useEffect(() => {
    const api = apiRef.current
    if (!api) return
    api.set({
      fen: props.fen,
      orientation: props.orientation,
      turnColor: props.turnColor,
      check: props.check,
      lastMove: props.lastMove as Key[] | undefined,
      movable: {
        color: props.movableColor,
        dests: props.dests as unknown as CgDests,
      },
      premovable: { enabled: props.premoveEnabled },
    })
  }, [
    props.fen,
    props.orientation,
    props.turnColor,
    props.check,
    props.lastMove,
    props.movableColor,
    props.dests,
    props.premoveEnabled,
  ])

  return (
    <div className={`aspect-square w-full touch-none select-none`}>
      <div ref={elRef} className={`cg-wrap board-${props.theme} h-full w-full`} />
    </div>
  )
})
