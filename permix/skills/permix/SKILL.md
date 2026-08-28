---
name: permix
description: >-
  Applies Permix authorization once a schema exists: permix.check() paths and ReBAC callbacks, frontend bindings (permix/react, permix/vue, permix/solid, permix/svelte) with SSR dehydrate/hydrate for Next.js, TanStack Start, and Nuxt, and server middleware (permix/express, hono, fastify, trpc, orpc, node, elysia). Use for anything past initial setup — checking permissions, gating UI, or protecting routes. For creating the schema and first `permix.setup()`, use permix-getting-started first.
metadata:
  type: core
  library: permix
  library_version: '4.1.2'
requires:
  - permix-getting-started
sources:
  - 'letstri/permix:docs/content/docs/guide/check.mdx'
  - 'letstri/permix:docs/content/docs/guide/rebac.mdx'
  - 'letstri/permix:docs/content/docs/guide/ready.mdx'
  - 'letstri/permix:docs/content/docs/guide/hydration.mdx'
  - 'letstri/permix:docs/content/docs/integrations/react.mdx'
  - 'letstri/permix:docs/content/docs/integrations/vue.mdx'
  - 'letstri/permix:docs/content/docs/integrations/solid.mdx'
  - 'letstri/permix:docs/content/docs/integrations/svelte.mdx'
  - 'letstri/permix:docs/content/docs/integrations/next.mdx'
  - 'letstri/permix:docs/content/docs/integrations/tanstack-start.mdx'
  - 'letstri/permix:docs/content/docs/integrations/nuxt.mdx'
  - 'letstri/permix:docs/content/docs/integrations/express.mdx'
  - 'letstri/permix:docs/content/docs/integrations/hono.mdx'
  - 'letstri/permix:docs/content/docs/integrations/fastify.mdx'
  - 'letstri/permix:docs/content/docs/integrations/trpc.mdx'
  - 'letstri/permix:docs/content/docs/integrations/orpc.mdx'
  - 'letstri/permix:docs/content/docs/integrations/node.mdx'
  - 'letstri/permix:docs/content/docs/integrations/server.mdx'
  - 'letstri/permix:docs/content/docs/integrations/elysia.mdx'
  - 'letstri/permix:permix/src/core/check.ts'
---

# Permix — check, frontend, server

Assumes a `permix` instance already exists (see **permix-getting-started**). Load the reference file that matches the task instead of reading everything:

| Task | Reference |
| --- | --- |
| `permix.check()` paths, callbacks, `~all`/`~any`, ReBAC/ABAC with entity data, `isReady` | [references/check.md](references/check.md) |
| React, Vue, Solid, or Svelte UI — `PermixProvider`, `usePermix`, `createComponents`, SSR `dehydrate`/`hydrate` for Next.js / TanStack Start / Nuxt | [references/frontend.md](references/frontend.md) |
| Protecting Express, Hono, Fastify, tRPC, oRPC, Node, or Elysia routes — `setupMiddleware`, `checkMiddleware` | [references/server.md](references/server.md) |

## Rules that apply everywhere

- **Authorization must run on the server.** Client-side `check` (React/Vue/Solid/Svelte) is UX only — mirror every path with `checkMiddleware` in [references/server.md](references/server.md).
- **Use the same schema and path strings** (`post.update`, not ad-hoc strings) across client hooks and server middleware, or types and behavior drift apart.
- **`check` before `isReady`** throws `PermixNotReadyError` — gate UI with `isReady`/`isReadyAsync`, and call `setupMiddleware` before `checkMiddleware` on the server.
- **SSR `hydrate` alone is not enough.** It only restores booleans; call `setup` again on the client for function-based/ReBAC rules — see the SSR section of [references/frontend.md](references/frontend.md).
