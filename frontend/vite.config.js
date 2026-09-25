import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/students': 'http://localhost:8000',
      '/grades': 'http://localhost:8000',
      '/attendance': 'http://localhost:8000',
      '/prediction': 'http://localhost:8000',
      '/notifications': 'http://localhost:8000',
    }
  }
})
