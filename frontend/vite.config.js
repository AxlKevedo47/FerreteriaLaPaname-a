import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BITÁCORA (Etapa 4): en desarrollo Vite atiende React en 5173 y reenvía /api
// al backend en 4000. En producción Express sirve frontend/dist.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
