import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: ['es2015', 'safari11'],
    cssTarget: ['safari11'],
    rollupOptions: {
      output: {
        manualChunks: {
          'sql-js': ['sql.js'],
          'vendor': ['react', 'react-dom']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['sql.js']
  }
})
