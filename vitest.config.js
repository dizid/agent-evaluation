import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
    coverage: {
      include: ['src/services/**', 'src/components/ui/**']
    }
  },
  resolve: {
    alias: {
      '@': '/home/marc/DEV/claude/agent-evaluation/src'
    }
  }
})
