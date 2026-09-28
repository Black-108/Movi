import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

function moviJsonPlugin() {
  return {
    name: 'serve-root-movi-json',
    configureServer(server) {
      server.middlewares.use('/Movi.json', (req, res, next) => {
        const file = path.resolve(process.cwd(), 'Movi.json')
        if (!fs.existsSync(file)) return next()
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(fs.readFileSync(file, 'utf8'))
      })
    },
    closeBundle() {
      const source = path.resolve(process.cwd(), 'Movi.json')
      const targetDir = path.resolve(process.cwd(), 'dist')
      if (fs.existsSync(source) && fs.existsSync(targetDir)) {
        fs.copyFileSync(source, path.join(targetDir, 'Movi.json'))
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), moviJsonPlugin()],
})
