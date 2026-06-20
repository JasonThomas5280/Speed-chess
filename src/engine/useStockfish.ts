// Stockfish lifecycle: spin up the single-threaded WASM build as a Web Worker,
// translate "give me a move for this FEN" into UCI, and parse `bestmove` back
// out. The worker keeps the engine off the main thread so the UI never freezes.
import { useCallback, useEffect, useRef } from 'react'
import { botConfig } from './botStrength'

export interface BotMove {
  from: string
  to: string
  promotion?: 'q' | 'r' | 'b' | 'n'
}

function parseBestmove(line: string): BotMove | null {
  // "bestmove e2e4" | "bestmove e7e8q ponder ..." | "bestmove (none)"
  const parts = line.split(/\s+/)
  const uci = parts[1]
  if (!uci || uci === '(none)') return null
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  const promo = uci.slice(4, 5)
  const move: BotMove = { from, to }
  if (promo === 'q' || promo === 'r' || promo === 'b' || promo === 'n') {
    move.promotion = promo
  }
  return move
}

const WORKER_URL = `${import.meta.env.BASE_URL}engine/stockfish-nnue-16-single.js`

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null)
  const resolveRef = useRef<((m: BotMove | null) => void) | null>(null)

  useEffect(() => {
    let worker: Worker
    try {
      worker = new Worker(WORKER_URL)
    } catch (err) {
      console.error('[stockfish] failed to start worker', err)
      return
    }
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : ''
      if (line.startsWith('bestmove')) {
        const resolve = resolveRef.current
        resolveRef.current = null
        resolve?.(parseBestmove(line))
      }
    }
    worker.onerror = (e) => console.error('[stockfish] worker error', e.message)

    worker.postMessage('uci')
    worker.postMessage('ucinewgame')
    worker.postMessage('isready')

    return () => {
      resolveRef.current = null
      try {
        worker.postMessage('quit')
      } catch {
        /* ignore */
      }
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  /** Ask the engine for a move. Resolves with the bestmove, or null if none. */
  const requestMove = useCallback(
    (fen: string, skill: number): Promise<BotMove | null> => {
      return new Promise((resolve) => {
        const worker = workerRef.current
        if (!worker) {
          resolve(null)
          return
        }
        // If a search was somehow still pending, abandon it.
        resolveRef.current?.(null)
        resolveRef.current = resolve

        const cfg = botConfig(skill)
        if (cfg.limitStrength) {
          worker.postMessage('setoption name UCI_LimitStrength value true')
          worker.postMessage('setoption name UCI_Elo value ' + cfg.elo)
        } else {
          worker.postMessage('setoption name UCI_LimitStrength value false')
          worker.postMessage('setoption name Skill Level value ' + cfg.skillLevel)
        }
        worker.postMessage('position fen ' + fen)
        worker.postMessage('go movetime ' + cfg.movetime)
      })
    },
    [],
  )

  /** Tell the engine a fresh game is starting (clears its hash/heuristics). */
  const newGame = useCallback(() => {
    workerRef.current?.postMessage('ucinewgame')
  }, [])

  /** Abort any in-flight search (e.g. on resign / new game). */
  const stop = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(null)
      resolveRef.current = null
    }
    workerRef.current?.postMessage('stop')
  }, [])

  return { requestMove, newGame, stop }
}
