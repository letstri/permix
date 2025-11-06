import type { PermixDefinition } from '.'
import { describe, expect, it, vi } from 'vitest'
import { createPermix } from '.'

describe('hydration', () => {
  it('should hydrate permissions from JSON state', () => {
    const permix = createPermix<{
      post: {
        dataType: { id: string }
        action: 'create' | 'read'
      }
    }>()

    permix.hydrate({
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

    permix.hydrate({
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

    permix.hydrate({
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

    permix.hydrate({
      post: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(permix.check('post', 'all')).toBe(true)

    permix.hydrate({
      post: {
        create: true,
        read: false,
        update: true,
      },
    })

    expect(permix.check('post', 'all')).toBe(false)
  })

  it('should handle "any" action check after hydration', () => {
    const permix = createPermix<{
      post: {
        action: 'create' | 'read' | 'update'
      }
    }>()

    permix.hydrate({
      post: {
        create: false,
        read: false,
        update: false,
      },
    })

    expect(permix.check('post', 'any')).toBe(false)

    permix.hydrate({
      post: {
        create: true,
        read: false,
        update: true,
      },
    })

    expect(permix.check('post', 'any')).toBe(true)
  })

  it('should dehydrate permissions to JSON state', () => {
    const permix = createPermix<{
      post: {
        action: 'create' | 'read'
      }
    }>()

    permix.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const dehydratedState = permix.dehydrate()

    expect(dehydratedState).toEqual({
      post: {
        create: true,
        read: false,
      },
    })

    permix.hydrate(dehydratedState)

    expect(permix.check('post', 'create')).toBe(true)
    expect(permix.check('post', 'read')).toBe(false)
  })

  it('shouldn\'t hydrate functions', () => {
    const permix = createPermix<{
      post: {
        action: 'create'
      }
    }>()

    function setup() {
      permix.setup({
        post: {
          create: () => true,
        },
      })
    }

    setup()

    const dehydratedState = permix.dehydrate()

    expect(dehydratedState).toEqual({ post: { create: false } })

    permix.hydrate(dehydratedState)

    expect(permix.check('post', 'create')).toBe(false)

    setup()

    expect(permix.check('post', 'create')).toBe(true)
  })

  it('should throw error when trying to dehydrate without setup', () => {
    const permix = createPermix<{
      post: {
        action: 'create'
      }
    }>()

    expect(() => {
      permix.dehydrate()
    }).toThrow('[Permix]: To dehydrate Permix, `setup` must be called first.')
  })

  it('should dehydrate and hydrate permissions state correctly', () => {
    type Definition = PermixDefinition<{
      post: {
        action: 'create' | 'read'
      }
    }>

    const permixServer = createPermix<Definition>()

    permixServer.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const dehydrated = permixServer.dehydrate()

    const permixClient = createPermix<Definition>()

    permixClient.hydrate(dehydrated)

    expect(permixClient.check('post', 'create')).toBe(true)
    expect(permixClient.check('post', 'read')).toBe(false)
  })

  it('should throw if dehydrate is called before setup', () => {
    type Definition = PermixDefinition<{
      post: {
        action: 'create' | 'read'
      }
    }>

    const permix = createPermix<Definition>()
    expect(() => permix.dehydrate()).toThrow()
  })

  it('should call hydrate hook on hydration', () => {
    type Definition = PermixDefinition<{
      post: {
        action: 'create' | 'read'
      }
    }>

    const permixServer = createPermix<Definition>()

    permixServer.setup({
      post: { create: true, read: false },
    })

    const dehydrated = permixServer.dehydrate()

    const permixClient = createPermix<Definition>()

    const hookFn = vi.fn()
    permixClient.hook('hydrate', hookFn)
    permixClient.hydrate(dehydrated)

    expect(hookFn).toHaveBeenCalled()
  })
})
