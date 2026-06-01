import { describe, expect, it, vi } from 'vitest'
import { createPermix } from './permix'

// React's `cache()` only memoizes within a Next.js request scope (backed by
// AsyncLocalStorage). Outside of one — including in vitest — it returns a
// fresh value on every call, which would defeat the per-request instance
// pattern. We replace it here with a simple module-level memoizer so that a
// single `createPermix()` call behaves as if it were running inside one
// Next.js request for the duration of the test.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    cache: <T extends (...args: any[]) => any>(fn: T): T => {
      const store = new Map<string, ReturnType<T>>()
      return ((...args: Parameters<T>) => {
        const key = JSON.stringify(args)
        if (!store.has(key))
          store.set(key, fn(...args))
        return store.get(key)!
      }) as T
    },
  }
})

describe('next createPermix', () => {
  it('sets up rules and checks permissions', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>()

    permix.setup({
      post: {
        create: true,
        read: false,
      },
    })

    expect(permix.check('post.create')).toBe(true)
    expect(permix.check('post.read')).toBe(false)
  })

  it('works with data resolved before setup', async () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    // Mimic the documented pattern: await your own data, then call setup
    // with plain rules. No async wrapper around setup needed.
    const user = await Promise.resolve({ role: 'admin' as const })

    permix.setup({
      post: {
        create: user.role === 'admin',
      },
    })

    expect(permix.check('post.create')).toBe(true)
  })

  it('exposes the underlying core instance via get()', () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({ post: { create: true } })

    const core = permix.get()

    expect(core.isReady()).toBe(true)
    expect(core.check('post.create')).toBe(true)
  })

  it('reads the current rules with getRules', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>()

    expect(permix.getRules()).toBeNull()

    permix.setup({
      post: {
        create: true,
        read: false,
      },
    })

    expect(permix.getRules()).toEqual({
      post: {
        create: true,
        read: false,
      },
    })
  })

  it('dehydrates the request-scoped state', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>()

    permix.setup({
      post: {
        create: true,
        read: false,
      },
    })

    expect(permix.dehydrate()).toEqual({
      post: {
        create: true,
        read: false,
      },
    })
  })

  it('reuses the same instance across calls in the same request scope', () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({ post: { create: true } })

    // Two get() calls in the same "request" must return the same instance,
    // proving that setup() persists across subsequent calls.
    expect(permix.get()).toBe(permix.get())
    expect(permix.check('post.create')).toBe(true)
  })

  it('isolates state between independent factories', () => {
    const permixA = createPermix<{ post: ['create'] }>()
    const permixB = createPermix<{ post: ['create'] }>()

    permixA.setup({ post: { create: true } })
    permixB.setup({ post: { create: false } })

    expect(permixA.check('post.create')).toBe(true)
    expect(permixB.check('post.create')).toBe(false)
    expect(permixA.get()).not.toBe(permixB.get())
  })

  it('creates reusable templates', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>()

    const adminTemplate = permix.template({
      post: {
        create: true,
        read: true,
      },
    })

    expect(adminTemplate()).toEqual({
      post: {
        create: true,
        read: true,
      },
    })
  })

  it('supports parameterized templates', () => {
    const permix = createPermix<{
      post: [{ name: 'edit', type: { authorId: string } }]
    }>()

    const template = permix.template((userId: string) => ({
      post: {
        edit: (post: { authorId: string } | undefined) => post?.authorId === userId,
      },
    }))

    const rules = template('user-1')
    const editFn = rules.post.edit as (post: { authorId: string } | undefined) => boolean

    expect(editFn({ authorId: 'user-1' })).toBe(true)
    expect(editFn({ authorId: 'user-2' })).toBe(false)
  })
})
