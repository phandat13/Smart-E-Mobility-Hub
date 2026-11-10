import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: các request /api được proxy sang Spring Boot (mặc định localhost:8080) => không cần lo CORS khi dev.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8080' } },
});
