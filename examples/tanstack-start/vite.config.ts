import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const permixRoot = path.join(root, '../../permix/src')

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'permix/react': path.join(permixRoot, 'react/index.ts'),
      'permix/tanstack-start': path.join(permixRoot, 'tanstack-start/index.ts'),
      'permix': path.join(permixRoot, 'core/index.ts'),
    },
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})
