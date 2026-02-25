import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // TEMPORÁRIO: Desabilitar PWA para testar OneSignal isoladamente
      selfDestroying: true,
      devOptions: {
        enabled: false
      },
      includeAssets: ['favicon.ico', 'logo.png', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Sama Conecta',
        short_name: 'Sama Conecta',
        description: 'Conectando trabalhadores e empresas',
        theme_color: '#0A2A5A',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/geocode': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => {
          // /api/geocode?q=xxx -> /search?q=xxx&format=json&countrycodes=br
          const newPath = path.replace(/^\/api\/geocode/, '/search');
          return newPath + (newPath.includes('?') ? '&' : '?') + 'format=json&countrycodes=br';
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'PlataformaSama/1.0');
          });
        },
      },
    },
  },
})
