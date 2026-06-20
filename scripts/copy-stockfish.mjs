// Copies the single-threaded Stockfish Web Worker + wasm into /public so Vite
// serves them as static assets and the PWA service worker can precache them.
//
// The single-threaded build resolves its .wasm by relative name, so the two
// files MUST live side-by-side and keep their original filenames.
import { mkdir, copyFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const srcDir = join(root, 'node_modules', 'stockfish', 'src')
const outDir = join(root, 'public', 'engine')

const files = ['stockfish-nnue-16-single.js', 'stockfish-nnue-16-single.wasm']

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  await mkdir(outDir, { recursive: true })
  for (const f of files) {
    const from = join(srcDir, f)
    const to = join(outDir, f)
    if (!(await exists(from))) {
      console.error(`[copy-stockfish] missing ${from} — did "npm install" run?`)
      process.exitCode = 1
      return
    }
    await copyFile(from, to)
    console.log(`[copy-stockfish] ${f} -> public/engine/`)
  }
}

main().catch((err) => {
  console.error('[copy-stockfish] failed:', err)
  process.exitCode = 1
})
