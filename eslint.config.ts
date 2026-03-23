import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: true,
    react: true,
    rules: {
      'node/prefer-global/process': 'off',
      'react/no-use-context': 'off',
      'pnpm/yaml-no-duplicate-catalog-item': 'off',
    },
    ignores: ['**/.source/**', '**/next-env.d.ts'],
  },
  {
    files: ['docs/**/*.ts?(x)'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['examples/**/*.ts?(x)'],
    rules: {
      'react-hooks-extra/no-unnecessary-use-prefix': 'off',
      'react-web-api/no-leaked-timeout': 'off',
    },
  },
  {
    files: ['examples/nextjs-better-auth/src/app/**/*.ts?(x)'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['permix/src/vue/*.ts?(x)'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks-extra/no-unnecessary-use-prefix': 'off',
    },
  },
  {
    files: ['permix/src/solid/*.ts?(x)', 'examples/solid/**/*.ts?(x)'],
    rules: {
      'react/no-context-provider': 'off',
      'react-refresh/only-export-components': 'off',
      'react/no-missing-key': 'off',
    },
  },
)
