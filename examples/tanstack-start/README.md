# Permix + TanStack Start

Runnable demo of the [`permix/tanstack-start`](https://permix.letstri.dev/docs/integrations/tanstack-start) integration.

## What it shows

- **Per-request setup** — `src/start.ts` registers a global request middleware built with `createMiddleware().server(permix.createSetupHandler(...))`, so every request gets an isolated instance and the setup callback (with its server-only imports) is stripped from the client bundle.
- **Server checks** — server functions call `permix.getOrThrow(context)` / `checkMiddleware()`, invoked from route loaders.
- **Router context** — `src/router.tsx` puts a Permix instance on the router context; the root `beforeLoad` hydrates it with the server state.
- **Route guards** — `/admin` calls `context.permix.check('post.delete')` in `beforeLoad`, no server function needed.
- **Client hydration** — the same router-context instance backs `PermixProvider` + `PermixHydrate`.
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
| `src/lib/permix.ts` | Permission definition, TanStack Start helper, router-context instance |
| `src/start.ts` | Per-request setup via `createSetupHandler()` in an app-owned `.server()` boundary |
| `src/router.tsx` | Puts the Permix instance on the router context |
| `src/server/permix.ts` | `getRootLoaderData()` — dehydrate for the client |
| `src/server/posts.ts` | Server functions with `getOrThrow(context)` checks and `checkMiddleware` |
| `src/lib/use-permix.ts` | `usePermix()` reading the instance from the router context |
| `src/providers.tsx` | React provider + client rule setup for function-based checks |
| `src/routes/__root.tsx` | Root `beforeLoad` — hydrates the router-context instance |
| `src/routes/index.tsx` | Home page with server-side permission badges |
| `src/routes/admin.tsx` | Route guarded by `context.permix.check()` in `beforeLoad` |
| `src/routes/posts.$id.tsx` | Route guarded by `post.read` on the server |

## Docs

- [TanStack Start integration](https://permix.letstri.dev/docs/integrations/tanstack-start)
- [Hydration guide](https://permix.letstri.dev/docs/guide/hydration)
