import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// The dev server proxies /api to the Express backend so the frontend can call
// the API with same-origin relative URLs and no CORS friction in development.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // PORT lets tooling ask for another port (e.g. a second dev instance);
    // day-to-day it stays the default 5173.
    port: Number(process.env.PORT) || 5173,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
})
