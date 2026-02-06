import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import netlify from '@netlify/vite-plugin'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue(), netlify()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src')
    }
  },
  server: {
    port: 3000
  }
})
