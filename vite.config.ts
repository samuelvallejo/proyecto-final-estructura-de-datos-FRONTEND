import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const allowedHosts = [
  'greasily-supreme-lyrics.ngrok-free.dev',
  '.ngrok-free.app', '.ngrok.app', '.ngrok-free.dev',
]
const proxy = { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true } }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    allowedHosts,
    proxy,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    allowedHosts,
    proxy,
  },
})
