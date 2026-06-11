---
name: permix-getting-started
description: >-
  Sets up Permix in an application: install, createPermix schema, setup rules,
  templates for roles, createRules. Use when adding Permix, defining permission
  types, role-based access, or permix.setup in a user project.
type: core
library: permix
library_version: '4.1.1'
requires: []
sources:
  - 'letstri/permix:docs/content/docs/quick-start.mdx'
  - 'letstri/permix:docs/content/docs/guide/setup.mdx'
  - 'letstri/permix:docs/content/docs/guide/template.mdx'
  - 'letstri/permix:docs/content/docs/guide/instance.mdx'
  - 'letstri/permix:docs/content/docs/guide/events.mdx'
  - 'letstri/permix:docs/content/docs/migration-v3-to-v4.mdx'
  - 'letstri/permix:permix/src/core/index.ts'
---

# Permix — getting started

Docs: https://permix.letstri.dev/docs/quick-start

Upgrading from v3? Use action tuples, not `{ action, dataType }` — https://permix.letstri.dev/docs/migration-v3-to-v4

## Install

```bash
pnpm add permix
# or npm install permix / yarn add permix
```

## 1. Define the permission schema (once)

Create a shared module (e.g. `lib/permix.ts`). The generic on `createPermix<D>()` is the source of truth for all paths and rules.

**Nested resources** (most common):

```ts
import { createPermix } from 'permix'

export const permix = createPermix<{
  post: ['create', 'read', 'update', 'delete']
  comment: ['create', 'read']
}>()
```

**Flat list** (single resource):

```ts
export const permix = createPermix<['read', 'write']>()
```

**Deep tree** (orgs, workspaces, etc.):

```ts
export const permix = createPermix<{
  workspace: {
    billing: ['view', 'update']
    member: ['invite', 'remove']
  }
}>()
```

Every action you declare in `D` must appear in every `setup()` call (use `false` to deny).

## 2. Assign rules with `setup`

```ts
permix.setup({
  post: {
    create: true,
    read: true,
    update: false,
    delete: false,
  },
  comment: {
    create: true,
    read: true,
  },
})
```

- Static leaf: `boolean`
- Depends on resource at check time: `(data) => boolean` (see **permix-check** skill)
- Call `setup` after login, on route change, or when the active user/tenant changes — it **replaces** previous rules.

## 3. Optional: initial rules at construction

Skip a separate bootstrap step when rules are known upfront:

```ts
export const permix = createPermix<{
  post: ['read']
}>({
  post: { read: true },
})

permix.isReady() // true immediately
```

## 4. Reusable role presets — `template`

```ts
const admin = permix.template({
  post: { create: true, read: true, update: true, delete: true },
})

const member = permix.template({
  post: { create: false, read: true, update: true, delete: false },
})

// After resolving the user's role:
permix.setup(admin())
```

Dynamic template (parameters):

```ts
const forUser = permix.template((user: User) => ({
  post: {
    update: post => post.authorId === user.id,
  },
}))

permix.setup(forUser(currentUser))
```

## 5. Typed rules factory — `createRules`

Use when rules live in another file but must stay type-safe:

```ts
import { createPermix, createRules } from 'permix'

const rules = createRules<{
  post: ['create']
}>({
  post: { create: true },
})

permix.setup(rules)
```

## 6. First check

```ts
permix.check('post.read') // boolean
```

Before `setup`, `check` throws `PermixNotReadyError`. Unknown paths throw `PermixRuleNotDefinedError`.

## 7. React to permission changes (optional)

```ts
permix.hook('setup', () => {
  // re-run when rules change (e.g. refresh UI cache)
})

permix.hookOnce('ready', () => {
  // first successful setup only
})
```

Docs: https://permix.letstri.dev/docs/guide/events

## Checklist for new apps

- [ ] Single exported `permix` instance (same reference everywhere)
- [ ] Schema covers every permission the app uses
- [ ] `setup` runs when auth/session is known
- [ ] UI waits for `isReady` or handles not-ready (React: **permix-frontend** skill)
- [ ] Server routes use middleware (**permix-server** skill) — never rely on client checks alone
