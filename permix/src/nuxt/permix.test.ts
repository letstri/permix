import { describe, expect, it, vi } from 'vitest'

import { createPermix } from './permix'
import type { NuxtEvent } from './permix'

let currentEvent: NuxtEvent | undefined

vi.mock('h3', () => ({
  getRequestEvent: () => currentEvent,
}))

async function withEvent<T>(
  fn: (event: NuxtEvent) => T | Promise<T>
): Promise<T> {
  currentEvent = { context: {} }
  try {
    return await fn(currentEvent)
  } finally {
    currentEvent = undefined
  }
}

describe('nuxt createPermix', () => {
  it('throws when no request event is available', () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    expect(() => {
      permix.setup({
        post: {
          create: true,
        },
      })
    }).toThrow(/No request event found/)
  })

  it('sets up rules and checks permissions', async () => {
    await withEvent(() => {
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
  })

  it('works with data resolved before setup', async () => {
    await withEvent(async () => {
      const permix = createPermix<{
        post: ['create']
      }>()

      const user = await Promise.resolve({ role: 'admin' as const })

      permix.setup({
        post: {
          create: user.role === 'admin',
        },
      })

      expect(permix.check('post.create')).toBe(true)
    })
  })

  it('exposes the underlying core instance via get()', async () => {
    await withEvent((event) => {
      const permix = createPermix<{
        post: ['create']
      }>()

      permix.setup({ post: { create: true } }, event)

      const core = permix.get(event)

      expect(core.isReady()).toBe(true)
      expect(core.check('post.create')).toBe(true)
    })
  })

  it('reads the current rules with getRules', async () => {
    await withEvent(() => {
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

      expect(permix.getRules()).toStrictEqual({
        post: {
          create: true,
          read: false,
        },
      })
    })
  })

  it('dehydrates the request-scoped state', async () => {
    await withEvent(() => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()

      permix.setup({
        post: {
          create: true,
          read: false,
        },
      })

      expect(permix.dehydrate()).toStrictEqual({
        post: {
          create: true,
          read: false,
        },
      })
    })
  })

  it('reuses the same instance across calls in the same request scope', async () => {
    await withEvent(() => {
      const permix = createPermix<{
        post: ['create']
      }>()

      permix.setup({ post: { create: true } })

      expect(permix.get()).toBe(permix.get())
      expect(permix.check('post.create')).toBe(true)
    })
  })

  it('isolates state between independent factories', async () => {
    await withEvent(() => {
      const permixA = createPermix<{ post: ['create'] }>()
      const permixB = createPermix<{ post: ['create'] }>()

      permixA.setup({ post: { create: true } })
      permixB.setup({ post: { create: false } })

      expect(permixA.check('post.create')).toBe(true)
      expect(permixB.check('post.create')).toBe(false)
      expect(permixA.get()).not.toBe(permixB.get())
    })
  })

  it('isolates state between concurrent events', () => {
    const permix = createPermix<{ post: ['create'] }>()
    const eventA: NuxtEvent = { context: {} }
    const eventB: NuxtEvent = { context: {} }

    permix.setup({ post: { create: true } }, eventA)
    permix.setup({ post: { create: false } }, eventB)

    expect(permix.get(eventA).check('post.create')).toBe(true)
    expect(permix.get(eventB).check('post.create')).toBe(false)
    expect(permix.get(eventA)).not.toBe(permix.get(eventB))
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

    expect(adminTemplate()).toStrictEqual({
      post: {
        create: true,
        read: true,
      },
    })
  })

  it('supports parameterized templates', () => {
    const permix = createPermix<{
      post: [{ name: 'edit'; type: { authorId: string } }]
    }>()

    const template = permix.template((userId: string) => ({
      post: {
        edit: (post: { authorId: string } | undefined) =>
          post?.authorId === userId,
      },
    }))

    const rules = template('user-1')
    const editFn = rules.post.edit as (
      post: { authorId: string } | undefined
    ) => boolean

    expect(editFn({ authorId: 'user-1' })).toBe(true)
    expect(editFn({ authorId: 'user-2' })).toBe(false)
  })
})
