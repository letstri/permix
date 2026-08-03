# Permix + TanStack Start

Runnable demo of the [`permix/tanstack-start`](https://permix.letstri.dev/docs/integrations/tanstack-start) integration.

## What it shows

- **Per-request setup** — `src/start.ts` registers a global request middleware built with `createMiddleware().server(permix.createSetupHandler(...))`, so every request gets an isolated instance and the setup callback (with its server-only imports) is stripped from the client bundle.
- **Server checks** — server functions call `permix.getOrThrow(context)` / `checkMiddleware()`, invoked from route loaders.
- **Client hydration** — the root loader dehydrates state via `getRootLoaderData()` and wraps the app in `PermixProvider` + `PermixHydrate`.
- **Role switching** — switch between guest, Alice, Bob, and admin to see permissions change.

## Run locally

From the repo root:

```bash
pnpm install
cd examples/tanstack-start
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key files

| File | Purpose |
|------|---------|
| `src/lib/permix.ts` | Permission definition and TanStack Start helper |
| `src/start.ts` | Per-request setup via `createSetupHandler()` in an app-owned `.server()` boundary |
| `src/server/permix.ts` | `getRootLoaderData()` — dehydrate for the client |
| `src/server/posts.ts` | Server functions with `getOrThrow(context)` checks and `checkMiddleware` |
| `src/providers.tsx` | React provider + client rule setup for function-based checks |
| `src/routes/__root.tsx` | Root loader and hydration boundary |
| `src/routes/index.tsx` | Home page with server-side permission badges |
| `src/routes/posts.$id.tsx` | Route guarded by `post.read` on the server |

## Docs

- [TanStack Start integration](https://permix.letstri.dev/docs/integrations/tanstack-start)
- [Hydration guide](https://permix.letstri.dev/docs/guide/hydration)
