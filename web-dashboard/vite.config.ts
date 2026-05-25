import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    host: true, // bind 0.0.0.0 so tunnels / LAN can reach it
    // Allow any Host header (needed for public tunnels like *.trycloudflare.com).
    allowedHosts: true,
    proxy: {
      // Proxy API calls to the backend so the browser only ever talks to one
      // origin — the public tunnel URL — and cookies/CORS just work.
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
