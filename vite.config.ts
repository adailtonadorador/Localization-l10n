import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
