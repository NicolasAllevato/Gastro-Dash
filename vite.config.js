import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const N8N_HOST = 'https://n9n-n8n.n7v9de.easypanel.host';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    // Proxy: el browser llama a /webhook/* en localhost,
    // Vite lo reenvía a n8n server-to-server → sin CORS en dev.
    proxy: {
      '/webhook': {
        target: N8N_HOST,
        changeOrigin: true,
        secure: true,
      },
      '/webhook-test': {
        target: N8N_HOST,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
