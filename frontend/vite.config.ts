import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server: chuyển tiếp /api và /ws sang backend Spring Boot (cổng 8080)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
  build: {
    rollupOptions: {
      output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], map: ['leaflet'], realtime: ['@stomp/stompjs'] } },
    },
  },
});
