// chess.js is the single source of truth for game state. chessground is display
// only; this wrapper is the bridge — it owns the rules and hands chessground
// exactly the shapes it needs (dests map, colors, last move).
import { Chess, type Move, type Square } from 'chess.js'
import type { Color, GameResult } from '../types'

export type Key = string // algebraic square, e.g. "e2"
export type Dests = Map<Key, Key[]>

export function toCgColor(c: 'w' | 'b'): Color {
  return c === 'w' ? 'white' : 'black'
}

export function otherColor(c: Color): Color {
  return c === 'white' ? 'black' : 'white'
}

export class ChessState {
  private chess: Chess

  constructor(fen?: string) {
    this.chess = new Chess(fen)
  }

  fen(): string {
    return this.chess.fen()
  }

  load(fen: string): boolean {
    try {
      this.chess.load(fen)
      return true
    } catch {
      return false
    }
  }

  reset(): void {
    this.chess.reset()
  }

  /** whose move it is, in chessground's vocabulary */
  turn(): Color {
    return toCgColor(this.chess.turn())
  }

  inCheck(): boolean {
    return this.chess.inCheck()
  }

  /** Map of from-square -> legal to-squares, for chessground's movable.dests */
  dests(): Dests {
    const dests: Dests = new Map()
    for (const m of this.chess.moves({ verbose: true }) as Move[]) {
      const arr = dests.get(m.from)
      if (arr) arr.push(m.to)
      else dests.set(m.from, [m.to])
    }
    return dests
  }

  /** The square of the king in check, if any (for chessground's check highlight) */
  checkSquare(): Key | undefined {
    if (!this.chess.inCheck()) return undefined
    const turn = this.chess.turn()
    for (const row of this.chess.board()) {
      for (const piece of row) {
        if (piece && piece.type === 'k' && piece.color === turn) return piece.square
      }
    }
    return undefined
  }

  /** Is this from->to a pawn move that reaches the last rank? */
  isPromotion(from: Key, to: Key): boolean {
    const piece = this.chess.get(from as Square)
    if (!piece || piece.type !== 'p') return false
    const rank = to[1]
    return rank === '8' || rank === '1'
  }

  /**
   * Apply a move. Returns the resolved Move (with flags) or null if illegal.
   * `promotion` defaults to queen.
   */
  move(from: Key, to: Key, promotion: 'q' | 'r' | 'b' | 'n' = 'q'): Move | null {
    try {
      return this.chess.move({ from, to, promotion })
    } catch {
      return null
    }
  }

  lastMove(): [Key, Key] | undefined {
    const hist = this.chess.history({ verbose: true }) as Move[]
    const last = hist[hist.length - 1]
    return last ? [last.from, last.to] : undefined
  }

  isGameOver(): boolean {
    return this.chess.isGameOver()
  }

  /**
   * Resolve a game-over reason from the board alone (i.e. not timeout/resign,
   * which the clock/UI own). Returns null if the game is still live.
   */
  result(): GameResult | null {
    if (!this.chess.isGameOver()) return null
    if (this.chess.isCheckmate()) {
      // side to move is checkmated → the other side won
      const loser = this.turn()
      return { winner: loser === 'white' ? 'black' : 'white', reason: 'checkmate' }
    }
    if (this.chess.isStalemate()) return { winner: null, reason: 'stalemate' }
    if (this.chess.isInsufficientMaterial()) return { winner: null, reason: 'insufficient' }
    if (this.chess.isThreefoldRepetition()) return { winner: null, reason: 'repetition' }
    if (this.chess.isDrawByFiftyMoves?.()) return { winner: null, reason: 'fifty-move' }
    return { winner: null, reason: 'draw' }
  }
}
