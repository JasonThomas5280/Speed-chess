// Synthesized sound cues via Web Audio — no audio files to download, so the
// offline bundle stays tiny. Cues are short and toggleable. The AudioContext
// must be (re)started from a user gesture, so call `unlock()` on first tap.
let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean): void {
  enabled = on
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  return ctx
}

/** Resume the audio context from within a user gesture (autoplay policy). */
export function unlock(): void {
  const c = ac()
  if (c && c.state === 'suspended') void c.resume()
}

function blip(freq: number, durMs: number, type: OscillatorType, gain = 0.12): void {
  if (!enabled) return
  const c = ac()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const now = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  // quick attack, exponential release — a clean "tick", not a beep
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(gain, now + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000)
  osc.connect(g).connect(c.destination)
  osc.start(now)
  osc.stop(now + durMs / 1000 + 0.02)
}

export const sound = {
  move: () => blip(440, 70, 'triangle', 0.1),
  capture: () => blip(180, 110, 'square', 0.12),
  check: () => {
    blip(660, 90, 'sawtooth', 0.09)
    setTimeout(() => blip(880, 90, 'sawtooth', 0.09), 70)
  },
  lowTime: () => blip(1000, 60, 'sine', 0.08),
  gameEnd: () => {
    blip(523, 120, 'triangle', 0.1)
    setTimeout(() => blip(392, 160, 'triangle', 0.1), 110)
  },
}
