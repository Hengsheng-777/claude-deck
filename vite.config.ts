import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const serverPort = Number(process.env.CLAUDE_DECK_PORT ?? 3457);
const serverOrigin = `http://127.0.0.1:${serverPort}`;

export default defineConfig({
  root: 'web',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'web/src') },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: serverOrigin, changeOrigin: true },
      '/ws': { target: serverOrigin, changeOrigin: true, ws: true },
    },
  },
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
  },
});
