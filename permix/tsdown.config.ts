import { readFile, writeFile } from 'node:fs/promises'

import { defineConfig } from 'tsdown'

export default defineConfig({
  name: 'permix',
  entry: [
    './src/core/index.ts',
    './src/react/index.ts',
    './src/vue/index.ts',
    './src/trpc/index.ts',
    './src/orpc/index.ts',
    './src/express/index.ts',
    './src/hono/index.ts',
    './src/node/index.ts',
    './src/server/index.ts',
    './src/elysia/index.ts',
    './src/fastify/index.ts',
    './src/solid/index.ts',
    './src/effect/index.ts',
    './src/drizzle/index.ts',
    './src/drizzle/legacy/index.ts',
    './src/next/index.ts',
    './src/nuxt/index.ts',
    './src/tanstack-start/index.ts',
  ],
  dts: {
    build: true,
  },
  hooks: {
    'build:done': async () => {
      const file = await readFile('./dist/react/index.mjs', 'utf-8')
      await writeFile('./dist/react/index.mjs', `'use client';\n\n${file}`)
    },
  },
})
