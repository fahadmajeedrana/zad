import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Served from https://fahadmajeedrana.github.io/zad/ — set BASE_PATH=/ for a root domain.
const base = process.env.BASE_PATH || '/zad/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'NOTICE.md', 'LICENSE'],
      manifest: {
        name: 'زاد الطالب — Zad-ut-Talib',
        short_name: 'زاد الطالب',
        description: 'طالب علم کا زادِ راہ: صفوۃ المصادر، گردانیں، ذخیرہ الفاظ، قواعد، حدیث، فقہ اور اصول',
        lang: 'ur',
        dir: 'rtl',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#fff9e9',
        theme_color: '#075b35',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Precache everything — app shell, fonts and every data file — so all screens work offline
        // after one visit, including screens never opened online. Data files have hashed names.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/\.auth\//],
        // Removes the previous app's 'zad-<hash>' caches once the new worker activates.
        importScripts: ['sw-cleanup-legacy.js'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
