import { readFile, writeFile } from 'node:fs/promises'
import babel from '@rollup/plugin-babel'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  name: 'permix',
  entries: [
    './src/core/index.ts',
    './src/react/index.ts',
    './src/vue/index.ts',
    './src/trpc/index.ts',
    './src/orpc/index.ts',
    './src/express/index.ts',
    './src/hono/index.ts',
    './src/node/index.ts',
    './src/elysia/index.ts',
    './src/fastify/index.ts',
    './src/solid/index.ts',
    './src/better-auth/index.ts',
  ],
  declaration: true,
  clean: true,
  rollup: {
    // Disable esbuild in favor of Babel for SolidJS support
    esbuild: false,
  },
  hooks: {
    'rollup:options': async (config, options) => {
      options.plugins.unshift(
        babel({
          babelHelpers: 'bundled',
          include: ['src/**'],
          exclude: ['src/solid/**', 'src/react/**'],
          presets: ['@babel/preset-typescript'],
          extensions: ['.ts', '.js'],
        }),
      )
      options.plugins.unshift(
        babel({
          babelHelpers: 'bundled',
          include: ['src/solid/**'],
          presets: ['@babel/preset-typescript', 'solid'],
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        }),
      )
      options.plugins.unshift(
        babel({
          babelHelpers: 'bundled',
          include: ['src/react/**'],
          presets: ['@babel/preset-typescript', '@babel/preset-react'],
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        }),
      )
    },
    'build:done': async () => {
      const file = await readFile('./dist/react/index.mjs', 'utf-8')
      await writeFile('./dist/react/index.mjs', `'use client';\n\n${file}`)
    },
  },
})
