import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',          // custom domain — no subfolder prefix needed
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dist',
  },
})
