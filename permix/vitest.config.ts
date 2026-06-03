import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
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
    svelte(),
    svelteTesting(),
  ],
  test: {
    environment: 'happy-dom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/.svelte-kit/**'],
  },
})
