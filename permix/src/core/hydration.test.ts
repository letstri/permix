import { describe, expect, it } from 'vitest'
import { createPermix } from './createPermix'
import { dehydrate, hydrate } from './hydration'

describe('hydration', () => {
  it('should hydrate permissions from JSON state', () => {
    const permix = createPermix<{
      post: {
        dataType: { id: string }
        action: 'create' | 'read'
      }
    }>()

    hydrate(permix, {
      post: {
        create: true,
        read: false,
      },
    })

    expect(permix.check('post', 'create')).toBe(true)
    expect(permix.check('post', 'read')).toBe(false)
  })

  it('should throw ts error if permissions are not compatible with type', () => {
    const permix = createPermix<{
      post: {
        action: 'create'
      }
    }>()

    hydrate(permix, {
      post: {
        // @ts-expect-error - invalid action
        invalid: true,
      },
    })
  })

  it('should handle multiple entities and actions', () => {
    const permix = createPermix<{
      post: {
        action: 'create' | 'read' | 'update'
      }
      comment: {
        action: 'write' | 'delete'
      }
    }>()

    hydrate(permix, {
      post: {
        create: true,
        read: true,
        update: false,
      },
      comment: {
        write: true,
        delete: false,
      },
    })

    expect(permix.check('post', 'create')).toBe(true)
    expect(permix.check('post', 'read')).toBe(true)
    expect(permix.check('post', 'update')).toBe(false)
    expect(permix.check('comment', 'write')).toBe(true)
    expect(permix.check('comment', 'delete')).toBe(false)
  })

  it('should handle "all" action check after hydration', () => {
    const permix = createPermix<{
      post: {
        action: 'create' | 'read' | 'update'
      }
    }>()

    hydrate(permix, {
      post: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(permix.check('post', 'all')).toBe(true)

    hydrate(permix, {
      post: {
        create: true,
        read: false,
        update: true,
      },
    })

    expect(permix.check('post', 'all')).toBe(false)
  })

  it('should dehydrate permissions to JSON state', async () => {
    const permix = createPermix<{
      post: {
        action: 'create' | 'read'
      }
    }>()

    await permix.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const dehydratedState = dehydrate(permix)

    expect(dehydratedState).toEqual({
      post: {
        create: true,
        read: false,
      },
    })

    hydrate(permix, dehydratedState)

    expect(permix.check('post', 'create')).toBe(true)
    expect(permix.check('post', 'read')).toBe(false)
  })
})
