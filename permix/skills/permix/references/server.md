# Permix — server middleware

Authorization must run on the server. Client checks are UX only.

Docs: https://permix.letstri.dev/docs/integrations/express

## Pattern (Express-style; similar for Hono, Fastify, Node, Nest)

Import from the framework subpath, not bare `permix`:

```ts
import { createPermix } from 'permix/express'

const permix = createPermix<{
  post: [
    { name: 'create'; type: Post },
    { name: 'read'; type: Post },
    { name: 'update'; type: Post },
  ]
}>()
```

### Attach rules per request

```ts
app.use(
  permix.setupMiddleware(async ({ req }) => {
    const user = req.user
    return {
      post: {
        create: true,
        read: true,
        update: (post) => post.authorId === user.id,
      },
    }
  })
)
```

`setupMiddleware` accepts either a `Rules<D>` object or `({ req, res, next }) => Rules<D>` (sync or async).

### Guard routes

```ts
app.post('/posts', permix.checkMiddleware('post.create'), createPostHandler)

app.put(
  '/posts/:id',
  permix.checkMiddleware((c) => c('post.read') && c('post.update')),
  updatePostHandler
)

app.delete(
  '/posts/:id',
  permix.checkMiddleware('post.~all'), // example: require all post rules
  adminHandler
)
```

Denied requests default to `403` with `{ error: 'Forbidden' }`. Customize with `onForbidden` in `createPermix` options.

### NestJS (`permix/nest`)

Use a global `APP_GUARD` plus `@Check`. The guard always sets up the per-request instance and only enforces a path when the decorator is present:

```ts
import { APP_GUARD } from '@nestjs/core'
import { createPermix } from 'permix/nest'

const permix = createPermix<{
  post: ['create', 'read']
}>()

{
  provide: APP_GUARD,
  useValue: permix.guard(({ req }) => ({
    post: { create: !!req.user, read: true },
  })),
}

@Get()
@permix.Check('post.read')
findAll() {}
```

Entity checks run in the handler after the resource is loaded: `permix.getOrThrow(req).check('post.update', post)`.

### Access instance in handlers

```ts
app.get('/posts/:id', (req, res) => {
  const p = permix.getOrThrow(req)
  if (p.check('post.read', post)) {
    /* ... */
  }
})
```

## Package subpaths

| Framework | Import |
| --- | --- |
| Express | `permix/express` |
| Hono | `permix/hono` |
| Fastify | `permix/fastify` |
| NestJS | `permix/nest` |
| tRPC | `permix/trpc` |
| oRPC | `permix/orpc` |
| Generic HTTP | `permix/node` or `permix/server` |
| Elysia | `permix/elysia` |
| Effect | `permix/effect` — see integration docs |
| Drizzle ORM | `permix/drizzle` (and `permix/drizzle/legacy`) — see integration docs |

Use the same `D` schema shape as the client instance.

Effect and Drizzle are optional peer dependencies; follow https://permix.letstri.dev/docs/integrations/effect and https://permix.letstri.dev/docs/integrations/drizzle rather than inventing middleware patterns.

## tRPC / oRPC

Use the adapter’s procedure/middleware helpers so checks run before the handler body. See integration docs for middleware names.

## Templates on the server

```ts
const rules = permix.template(adminRules)()
app.use(permix.setupMiddleware(rules))
```

## Checklist

- [ ] `setupMiddleware` runs **before** `checkMiddleware` on protected routes (Nest: register `permix.guard(...)` as `APP_GUARD` before `@Check`)
- [ ] Rules derived from authenticated `req.user` (or RPC context), not client headers alone
- [ ] Entity checks pass resource data when the action has `type` / `required: true`
- [ ] Same paths as frontend (`post.update`, not ad-hoc strings)
