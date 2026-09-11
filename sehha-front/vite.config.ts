import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Endpoint d'auth des canaux WebSocket privés (hors /api/v1).
      '/broadcasting': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Regroupe les librairies tierces dans un chunk "vendor"
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('class-variance-authority')) {
              return 'vendor-ui'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
            return 'vendor'
          }
        },
      },
    },
  },
})