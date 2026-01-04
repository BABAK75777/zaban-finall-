import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CERT_DIR = path.resolve(__dirname, 'certs')
const KEY_PATH = path.join(CERT_DIR, 'localhost+2-key.pem')
const CERT_PATH = path.join(CERT_DIR, 'localhost+2.pem')

const hasCerts =
  fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    ...(hasCerts && {
      https: {
        key: fs.readFileSync(KEY_PATH),
        cert: fs.readFileSync(CERT_PATH),
      },
    }),
    proxy: {
      '/api': {
        target: 'http://192.168.86.190:3001',
        changeOrigin: true,
        secure: false,
        rewrite: p => p.replace(/^\/api/, ''),
      },
    },
  },
})
