import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Habit & Workout',
        short_name: 'Habit',
        description: 'Catat kebiasaan, latihan, ukuran tubuh, dan berat badan.',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#2563EB',
        background_color: '#F5F7FC',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Jalur /__/ dipakai Firebase untuk proses login Google; jangan dicegat service worker.
        navigateFallbackDenylist: [/^\/__\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // push-sw.js dikelola terpisah (service worker khusus notifikasi), jangan ikut di-cache oleh sw.js.
        globIgnores: ['push-sw.js'],
      },
    }),
  ],
});
