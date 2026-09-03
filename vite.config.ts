/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  // basicSsl() serves local dev/preview over HTTPS with a self-signed cert
  // (browser warns once — Advanced → Proceed). Production (Vercel) is HTTPS on its own.
  plugins: [react(), tailwindcss(), basicSsl()],
  server: { host: true },
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-value-1234567890',
    },
  },
})
