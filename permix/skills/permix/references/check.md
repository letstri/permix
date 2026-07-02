# Permix — checking permissions

Docs: https://permix.letstri.dev/docs/guide/check

## Dot-path (single action)

```ts
permix.check('post.create')
permix.check('workspace.billing.view')
```

## Callback (multiple conditions)

The callback receives `c`. Each `c('path')` is evaluated immediately to a boolean:

```ts
permix.check(c => c('post.read') && c('post.update'))
permix.check(c => c('post.delete') || c('admin.override'))
permix.check(c => !c('post.read'))
```

## Aggregate tokens

| Token | Meaning |
|-------|---------|
| `'~any'` | At least one rule in scope is truthy |
| `'~all'` | Every rule in scope is truthy |

```ts
permix.check('~any') // any permission in the tree
permix.check('post.~all') // all post.* rules
permix.check('workspace.~any') // any rule under workspace
```

Dynamic function rules are invoked without data when aggregating; entity-only rules may count as `false`.

## Entity-aware actions (ReBAC / ABAC)

Attach a `type` to actions that need the resource at check time:

```ts
interface Post {
  id: string
  authorId: string
}

const permix = createPermix<{
  post: [
    'read',
    { name: 'update', type: Post },
    { name: 'delete', type: Post, required: true },
  ]
}>()

const currentUser = { id: userId }

permix.setup({
  post: {
    read: true,
    update: post => post?.authorId === currentUser.id,
    delete: post => post.authorId === currentUser.id,
  },
})

permix.check('post.update', post) // optional data if not required: true
permix.check('post.delete', post) // required: true — data required
```

**ReBAC pattern**: capture the **actor** in closures at `setup` time; pass the **resource** at `check` time. No separate ReBAC API.

## Readiness

```ts
permix.isReady() // sync
await permix.isReadyAsync() // wait until setup (or initial rules) completed
```

Gate UI or early checks when permissions load asynchronously (fetch user, then `setup`).

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Checking before `setup` | Call `setup` after auth; use `isReady` in UI |
| Path not in schema | Add action to `createPermix<D>()` generic |
| Missing check data | Add `type` / `required: true` on action; pass entity to `check` |
| Trusting client-only checks | Enforce same paths on server (see `references/server.md`) |
| Expecting lazy `c()` | Combine with `&&` / `\|\|`; each `c()` runs immediately |

## Server vs client

Use the same schema and path strings on server middleware and client hooks so types and behavior stay aligned.
