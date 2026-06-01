---
name: permix-ssr
description: >-
  Serializes Permix permissions for SSR: dehydrate, hydrate, client setup,
  PermixHydrate, Next.js and TanStack Start. Use when passing permissions from
  server to client or permix.dehydrate in SSR apps.
---

# Permix — SSR and hydration

Docs: https://permix.letstri.dev/docs/guide/hydration

## Why dehydrate?

Send a JSON snapshot of booleans to the browser so the first paint can respect permissions without re-fetching policy on the client.

## Server

```ts
permix.setup(serverRules)

const state = permix.dehydrate()
// { post: { create: true, read: false } } — functions evaluated once without data
```

Pass `state` to the client (embed in HTML, RSC payload, loader data, etc.).

## Client

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

## React

```tsx
import { PermixHydrate, PermixProvider } from 'permix/react'

function App({ dehydratedState }: { dehydratedState: DehydratedState<typeof schema> }) {
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

## Next.js / TanStack Start

Use framework helpers from `permix/next` or `permix/tanstack-start` when available — they wire dehydrate/hydrate into the framework data flow.

Docs:

- https://permix.letstri.dev/docs/integrations/next
- https://permix.letstri.dev/docs/integrations/tanstack-start

## Flow diagram

```text
Server: setup(rules) → dehydrate() → send state
Client: hydrate(state) → setup(fullRules) → isReady() → check() / usePermix
```

## Pitfalls

| Issue | Cause |
|-------|--------|
| UI stuck not ready | `hydrate` without follow-up `setup` |
| Wrong dynamic checks | Relying on dehydrated booleans only |
| Mismatch server/client | Different schemas or missing actions in client `setup` |

For static-only permissions (all booleans), dehydrate + hydrate + `setup` with the same booleans is enough; still call `setup` to mark ready.
