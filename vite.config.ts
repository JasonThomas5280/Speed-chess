import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// On GitHub Pages a project site lives under /<repo>/, so the build must be
// base-path-aware. The deploy workflow sets BASE_PATH=/Speed-chess/; local
// dev/preview default to '/'. Manifest start_url/scope/icons are written as
// paths relative to the manifest URL so they resolve correctly under any base.
const base = process.env.BASE_PATH ?? '/'

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      workbox: {
        // wasm MUST be precached for offline engine play
        globPatterns: ['**/*.{js,css,html,wasm,png,svg,woff,woff2}'],
        // stockfish.wasm is ~600KB; keep headroom for it
        maximumFileSizeToCacheInBytes: 6_000_000,
        // SPA fallback must point at the base-prefixed index
        navigateFallback: `${base}index.html`,
      },
      manifest: {
        name: 'Speed Chess',
        short_name: 'Chess',
        description: 'Bullet & blitz chess vs a Stockfish bot. Offline, installable, no backend.',
        display: 'standalone',
        orientation: 'portrait',
        // relative to the manifest location → works under '/' or '/Speed-chess/'
        start_url: '.',
        scope: '.',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        icons: [
          { src: 'icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
