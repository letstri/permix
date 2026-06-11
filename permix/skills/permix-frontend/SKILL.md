---
name: permix-frontend
description: >-
  Integrates Permix in React, Vue, Solid, or Svelte: Provider, usePermix, createComponents,
  isReady, setup after login. Use when building UI permission gates, hooks, or
  permix/react, permix/vue, permix/solid, permix/svelte in a frontend app.
type: core
library: permix
library_version: '4.1.1'
requires:
  - permix-getting-started
  - permix-check
sources:
  - 'letstri/permix:docs/content/docs/integrations/react.mdx'
  - 'letstri/permix:docs/content/docs/integrations/vue.mdx'
  - 'letstri/permix:docs/content/docs/integrations/solid.mdx'
  - 'letstri/permix:docs/content/docs/integrations/svelte.mdx'
  - 'letstri/permix:permix/src/react/index.ts'
  - 'letstri/permix:permix/src/vue/index.ts'
  - 'letstri/permix:permix/src/solid/index.ts'
  - 'letstri/permix:permix/src/svelte/index.ts'
---

# Permix — frontend (React / Vue / Solid / Svelte)

Pick the package subpath for your framework. Pattern is the same: one shared `permix` instance, call `setup` when the user is known, wrap the tree, check in components.

Docs: https://permix.letstri.dev/docs/integrations/react

## React

### Provider

```tsx
import { PermixProvider } from 'permix/react'
import { permix } from './lib/permix'

export function App() {
  return (
    <PermixProvider permix={permix}>
      <Routes />
    </PermixProvider>
  )
}
```

### Setup after auth

```ts
// e.g. after session loads
await loadUser()
permix.setup(roleRulesFor(user))
```

### Hook (wrap once)

```ts
// hooks/use-permissions.ts
import { usePermix } from 'permix/react'
import { permix } from '../lib/permix'

export function usePermissions() {
  return usePermix(permix)
}
```

```tsx
function EditButton({ post }) {
  const { check, isReady } = usePermissions()

  if (!isReady)
    return null

  if (!check('post.update', post))
    return null

  return <button>Edit</button>
}
```

Pass the **same** `permix` instance to `PermixProvider` and `usePermix`.

### Declarative `Check` component

```ts
import { createComponents } from 'permix/react'

export const { Check } = createComponents(permix)
```

```tsx
<Check path="post.create" otherwise={<span>Denied</span>}>
  <CreateForm />
</Check>
```

```tsx
<Check path="post.update" data={post} reverse>
  Hidden when allowed; shown when denied
</Check>
```

### SSR

Use `PermixHydrate` + call `setup` again on the client for function rules — see **permix-ssr** skill.

## Vue

Docs: https://permix.letstri.dev/docs/integrations/vue

```vue
<script setup lang="ts">
import { PermixProvider } from 'permix/vue'
import { permix } from './lib/permix'
</script>

<template>
  <PermixProvider :permix="permix">
    <YourApp />
  </PermixProvider>
</template>
```

Use `usePermix` from `permix/vue` (same `setup` / `check` / `isReady` flow as React).

## Solid

Docs: https://permix.letstri.dev/docs/integrations/solid

Provider + hooks from `permix/solid`; mirror the React steps above.

## Svelte

Docs: https://permix.letstri.dev/docs/integrations/svelte

Requires Svelte 5. Provider + hooks from `permix/svelte`; mirror the React steps above.

```svelte
<script lang="ts">
  import { PermixProvider } from 'permix/svelte'
  import { permix } from './lib/permix'

  let { children } = $props()
</script>

<PermixProvider {permix}>
  {@render children()}
</PermixProvider>
```

`usePermix(permix)` returns `{ check, isReady }` where `isReady` is a reactive getter — access it as `permissions.isReady` (don't destructure). `createComponents(permix)` returns a typed `Check` component that uses `children` / `otherwise` snippets.

## UX guidelines

- Show loading or skeleton while `!isReady` — `check` returns `false` when rules are not ready in hooks.
- Hide destructive actions when denied; prefer disabling with tooltip only if you explain why.
- Keep permission strings in sync with server middleware paths.

## Examples in the Permix repo

- React: https://github.com/letstri/permix/tree/main/examples/react
- Vue: https://github.com/letstri/permix/tree/main/examples/vue
- Solid: https://github.com/letstri/permix/tree/main/examples/solid
- Svelte: https://github.com/letstri/permix/tree/main/examples/svelte
- Next.js (SSR): https://github.com/letstri/permix/tree/main/examples/next
- Role templates: https://github.com/letstri/permix/tree/main/examples/role-based
- ReBAC: https://github.com/letstri/permix/tree/main/examples/rebac
