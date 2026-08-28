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

  if (!isReady) return null

  if (!check('post.update', post)) return null

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

Use `PermixHydrate` + call `setup` again on the client for function rules — see **SSR and hydration** below.

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

## SSR and hydration

Docs: https://permix.letstri.dev/docs/guide/hydration

Send a JSON snapshot of booleans to the browser so the first paint can respect permissions without re-fetching policy on the client.

### Server

```ts
permix.setup(serverRules)

const state = permix.dehydrate()
// { post: { create: true, read: false } } — functions evaluated once without data
```

Pass `state` to the client (embed in HTML, RSC payload, loader data, etc.).

### Client

```ts
permix.hydrate(state)
// isReady() is still FALSE — hydrate only restores booleans
```

Function-based rules are **lost** in JSON (dehydration calls functions with no data; missing required data → `false`).

**Always call `setup` again on the client** with full rules (including closures):

```ts
permix.hydrate(serverState)
permix.setup(clientRulesForUser) // restores functions + sets ready
```

Skipping client `setup` after hydrate leaves dynamic/ReBAC checks wrong.

### React

```tsx
import { DehydratedState, PermixHydrate, PermixProvider } from 'permix/react'

function App({
  dehydratedState,
}: {
  dehydratedState: DehydratedState<typeof schema>
}) {
  return (
    <PermixProvider permix={permix}>
      <PermixHydrate state={dehydratedState}>
        <YourApp />
      </PermixHydrate>
    </PermixProvider>
  )
}
```

Run client `permix.setup(...)` where you restore the session (e.g. after `PermixHydrate` mounts or in the same auth effect).

### Next.js / TanStack Start / Nuxt

Use framework helpers from `permix/next`, `permix/tanstack-start`, or `permix/nuxt` when available — they wire dehydrate/hydrate into the framework data flow. Nuxt hydrates the client with `PermixProvider` / `PermixHydrate` from `permix/vue`.

In TanStack Start, `permix.get(context)` only works in server functions and server routes. To check inside `beforeLoad`/`loader`, put a core instance on the **router context** in `getRouter()` (`context: { permix }`), type it with `createRootRouteWithContext`, hydrate it in the root route's `beforeLoad`, then call `context.permix.check(...)` in any child route. Passing only the context type without the runtime value leaves `context.permix` undefined.

TanStack Start bundle caveat: if the `setupMiddleware()` callback imports server-only code (auth library, DB client, `node:` builtins), those imports leak into the client bundle — Start only strips `.server()` bodies it sees in app source, not the one hidden inside the library. Use `createMiddleware().server(permix.createSetupHandler(callback))` in `src/start.ts` instead; same behavior, but the boundary is visible to the compiler and the callback gets pruned.

Docs:

- https://permix.letstri.dev/docs/integrations/next
- https://permix.letstri.dev/docs/integrations/tanstack-start
- https://permix.letstri.dev/docs/integrations/nuxt

### Flow diagram

```text
Server: setup(rules) → dehydrate() → send state
Client: hydrate(state) → setup(fullRules) → isReady() → check() / usePermix
```

### Pitfalls

| Issue | Cause |
| --- | --- |
| UI stuck not ready | `hydrate` without follow-up `setup` |
| Wrong dynamic checks | Relying on dehydrated booleans only |
| Mismatch server/client | Different schemas or missing actions in client `setup` |

For static-only permissions (all booleans), dehydrate + hydrate + `setup` with the same booleans is enough; still call `setup` to mark ready.

## Examples in the Permix repo

- React: https://github.com/letstri/permix/tree/main/examples/react
- Vue: https://github.com/letstri/permix/tree/main/examples/vue
- Solid: https://github.com/letstri/permix/tree/main/examples/solid
- Svelte: https://github.com/letstri/permix/tree/main/examples/svelte
- Next.js (SSR): https://github.com/letstri/permix/tree/main/examples/next
- Nuxt (SSR): https://github.com/letstri/permix/tree/main/examples/nuxt
- Role templates: https://github.com/letstri/permix/tree/main/examples/role-based
- ReBAC: https://github.com/letstri/permix/tree/main/examples/rebac
