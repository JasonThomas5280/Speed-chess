export type Color = 'white' | 'black'

export interface TimeControl {
  /** starting time per side, in seconds */
  initial: number
  /** Fischer increment added after each move, in seconds */
  increment: number
}

export type BoardTheme = 'brown' | 'blue' | 'green' | 'slate'

export type PlayerColorPref = 'white' | 'black' | 'random'

export interface Settings {
  timeControl: TimeControl
  /** friendly 1–10 strength, mapped to Stockfish skill + movetime */
  skill: number
  colorPref: PlayerColorPref
  boardTheme: BoardTheme
  sound: boolean
  haptics: boolean
}

export type GameResultReason =
  | 'checkmate'
  | 'timeout'
  | 'resign'
  | 'stalemate'
  | 'insufficient'
  | 'repetition'
  | 'fifty-move'
  | 'draw'

export interface GameResult {
  /** who won, or null for a draw */
  winner: Color | null
  reason: GameResultReason
}

export interface DailyStats {
  /** local date key, YYYY-MM-DD */
  date: string
  games: number
  wins: number
  losses: number
  draws: number
}

export interface RatingState {
  /** Glicko-2 rating on the Elo-like scale */
  rating: number
  /** rating deviation (± uncertainty) */
  rd: number
  /** Glicko-2 volatility */
  vol: number
  /** total rated games played */
  games: number
}
