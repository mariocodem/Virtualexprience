import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: true,
    // En desarrollo, el proxy de IA corre aparte (`pnpm server`).
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  preview: { port: 4173, strictPort: true },
  build: { target: 'es2022', sourcemap: true },
});
