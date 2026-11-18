import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Khi tắt mock (VITE_API_MOCK=false), /api được chuyển sang backend Spring Boot.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
