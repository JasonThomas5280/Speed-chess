import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
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
      },
      manifest: {
        name: 'Speed Chess',
        short_name: 'Chess',
        description: 'Bullet & blitz chess vs a Stockfish bot. Offline, installable, no backend.',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
