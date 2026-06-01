import react from '@vitejs/plugin-react'
import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react({
      include: ['**/src/react/*.ts?(x)', '**/src/next/*.ts?(x)', '**/src/tanstack-start/*.ts?(x)'],
    }),
    solid({
      include: ['**/src/solid/*.ts?(x)'],
    }),
  ],
  test: {
    environment: 'happy-dom',
  },
})
