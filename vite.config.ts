/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE permet de publier dans un sous-dossier (GitHub Pages : /nom-du-depot/).
const base = process.env.BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg', 'engine/*'],
      manifest: {
        name: 'Échecs en 7 minutes',
        short_name: 'Échecs 7 min',
        description: 'Votre séance d’échecs quotidienne : ouvertures, problèmes, stratégie, finales et partie commentée.',
        lang: 'fr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f3f4f1',
        theme_color: '#7f9471',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm,json,txt}'],
        // Les tranches de puzzles sont mises en cache à la demande
        globIgnores: ['**/data/puzzles/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/data/puzzles/'),
            handler: 'CacheFirst',
            options: { cacheName: 'puzzles', expiration: { maxEntries: 40 } }
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20 } }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
