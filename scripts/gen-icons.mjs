// Generates the PWA icons with zero dependencies: builds raw RGBA bitmaps and
// encodes them as PNG via Node's zlib. The icon is a simple, recognizable
// checkerboard on the app's dark chrome — crisp at any size, tiny on disk.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// ---- colors (RGBA) ----
const BG = [15, 17, 21, 255] // #0f1115
const LIGHT = [231, 236, 243, 255] // #e7ecf3
const DARK = [122, 162, 247, 255] // accent #7aa2f7

// ---- CRC32 ----
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // 10,11,12 = 0 (compression, filter, interlace)
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function put(rgba, size, x, y, color) {
  const i = (y * size + x) * 4
  rgba[i] = color[0]
  rgba[i + 1] = color[1]
  rgba[i + 2] = color[2]
  rgba[i + 3] = color[3]
}

// Draw: dark background, a centered 4x4 checkerboard. `pad` is the fraction of
// the icon kept as background border (smaller for maskable = more bleed).
function drawIcon(size, pad) {
  const rgba = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = BG[0]
    rgba[i * 4 + 1] = BG[1]
    rgba[i * 4 + 2] = BG[2]
    rgba[i * 4 + 3] = BG[3]
  }
  const inset = Math.round(size * pad)
  const boardSize = size - inset * 2
  const cells = 4
  const cell = boardSize / cells
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const cx = Math.floor(x / cell)
      const cy = Math.floor(y / cell)
      const isDark = (cx + cy) % 2 === 0
      put(rgba, size, inset + x, inset + y, isDark ? DARK : LIGHT)
    }
  }
  return encodePng(size, rgba)
}

writeFileSync(join(outDir, '192.png'), drawIcon(192, 0.18))
writeFileSync(join(outDir, '512.png'), drawIcon(512, 0.18))
writeFileSync(join(outDir, 'maskable.png'), drawIcon(512, 0.08))

// SVG favicon — same motif, scalable
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0f1115"/>
  <g>
    ${[0, 1, 2, 3]
      .flatMap((cy) =>
        [0, 1, 2, 3].map((cx) => {
          const dark = (cx + cy) % 2 === 0
          const s = 11
          const o = 10
          return `<rect x="${o + cx * s}" y="${o + cy * s}" width="${s}" height="${s}" fill="${dark ? '#7aa2f7' : '#e7ecf3'}"/>`
        }),
      )
      .join('\n    ')}
  </g>
</svg>`
writeFileSync(join(outDir, 'icon.svg'), svg)

console.log('[gen-icons] wrote 192.png, 512.png, maskable.png, icon.svg')
