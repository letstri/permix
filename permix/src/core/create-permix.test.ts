import type { Permix, PermixDefinition } from '.'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPermix } from '.'
import { validatePermix } from './create-permix'

interface Post {
  id: string
  title: string
  authorId: string
}

interface Comment {
  id: string
  content: string
  postId: string
}

type Definition = PermixDefinition<{
  post: {
    dataType: Post
    action: 'create' | 'read'
  }
  comment: {
    dataType: Comment
    action: 'create' | 'read' | 'update'
  }
}>

let permix: Permix<Definition>

describe('createPermix', () => {
  beforeEach(() => {
    permix = createPermix<{
      post: {
        dataType: Post
        action: 'create' | 'read'
      }
      comment: {
        dataType: Comment
        action: 'create' | 'read' | 'update'
      }
    }>()
  })

  it('should be defined', () => {
    expect(createPermix).toBeDefined()
  })

  it('should throw a TS error if permissions are not defined', () => {
    createPermix()
  })

  it('should setup rules', () => {
    permix.setup({
      post: {
        create: true,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(permix.check('post', 'read')).toBe(true)
  })

  it('should return true if permission is defined', () => {
    permix.setup({
      post: {
        create: true,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(permix.check('post', 'create')).toBe(true)
  })

  it('should return false if permission is not defined', () => {
    permix.setup({
      post: {
        create: true,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(permix.check('post', 'read')).toBe(true)
    // @ts-expect-error action is not defined
    expect(permix.check('post', 'not-exist')).toBe(false)
  })

  it('should return false if entity is not defined', () => {
    permix.setup({
      post: {
        create: true,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    // @ts-expect-error entity is not defined
    expect(permix.check('user', 'create')).toBe(false)
  })

  it('should validate permission for entity', () => {
    permix.setup({
      post: {
        create: post => post?.authorId === '1',
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    const postWhereAuthorIdIs1 = { authorId: '1' } as Post
    const postWhereAuthorIdIs2 = { authorId: '2' } as Post

    expect(permix.check('post', 'create', postWhereAuthorIdIs1)).toBe(true)
    expect(permix.check('post', 'create', postWhereAuthorIdIs2)).toBe(false)
    expect(permix.check('post', 'create')).toBe(false)
  })

  it('should validate permission for required entity', () => {
    const permix = createPermix<{
      post: {
        dataType: Post
        dataRequired: true
        action: 'create' | 'read'
      }
    }>()

    permix.setup({
      post: {
        create: post => post?.authorId === '1',
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    const postWhereAuthorIdIs = { authorId: '1' } as Post

    // @ts-expect-error data is required
    expect(permix.check('post', 'create')).toBe(false)
    expect(permix.check('post', 'create', postWhereAuthorIdIs)).toBe(true)
  })

  it('should validate permission for entity as required', () => {
    permix.setup({
      post: {
        create: post => post?.authorId === '1',
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    const postWhereAuthorIdIs1 = { authorId: '1' } as Post
    const postWhereAuthorIdIs2 = { authorId: '2' } as Post

    expect(permix.check('post', 'create', postWhereAuthorIdIs1)).toBe(true)
    expect(permix.check('post', 'create', postWhereAuthorIdIs2)).toBe(false)
  })

  it('should work with async check', async () => {
    setTimeout(() => {
      permix.setup({
        post: {
          create: true,
          read: true,
        },
        comment: {
          create: true,
          read: true,
          update: true,
        },
      })
    }, 100)

    expect(permix.check('post', 'create')).toBe(false)
    expect(await permix.checkAsync('post', 'create')).toBe(true)

    permix.setup({
      post: {
        create: false,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(permix.check('post', 'create')).toBe(false)
  })

  it('should call hook setup', () => {
    const callback = vi.fn()

    permix.hook('setup', callback)

    permix.setup({
      post: {
        create: true,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(callback).toHaveBeenCalled()
  })

  it('should call hook ready', () => {
    const callback = vi.fn()

    permix.hook('ready', callback)

    permix.setup({
      post: {
        create: true,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(callback).toHaveBeenCalled()
  })

  it('should work without dataType', () => {
    const permix = createPermix<{
      post: {
        action: 'create'
      }
    }>()

    permix.setup({
      post: { create: true },
    })

    expect(permix.check('post', 'create')).toBe(true)
  })

  it('should check all permissions', () => {
    permix.setup({
      post: {
        create: true,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(permix.check('post', 'all')).toBe(true)

    permix.setup({
      post: {
        create: true,
        read: false,
      },
      comment: {
        create: true,
        read: false,
        update: false,
      },
    })

    expect(permix.check('post', 'all')).toBe(false)
  })

  it('should check any permissions', () => {
    permix.setup({
      post: {
        create: false,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(permix.check('post', 'any')).toBe(true)

    permix.setup({
      post: {
        create: false,
        read: false,
      },
      comment: {
        create: false,
        read: false,
        update: false,
      },
    })

    expect(permix.check('post', 'any')).toBe(false)
  })

  it('should call setup hook', () => {
    const callback = vi.fn()

    permix.hook('setup', callback)

    permix.setup({
      post: {
        create: true,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(callback).toHaveBeenCalled()
  })

  it('should call ready hook', () => {
    const callback = vi.fn()

    permix.hook('ready', callback)

    permix.setup({
      post: {
        create: true,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(callback).toHaveBeenCalled()
  })

  it('should check ready state', () => {
    expect(permix.isReady()).toBe(false)

    permix.setup({
      post: {
        create: true,
        read: true,
      },
      comment: {
        create: true,
        read: true,
        update: true,
      },
    })

    expect(permix.isReady()).toBe(true)
  })

  it('should check ready state async', async () => {
    setTimeout(() => {
      permix.setup({
        post: {
          create: true,
          read: true,
        },
        comment: {
          create: true,
          read: true,
          update: true,
        },
      })
    }, 100)

    expect(await permix.isReadyAsync()).toBe(true)
  })

  it('should throw an error if permissions in setup are not valid', () => {
    const permix = createPermix()

    const invalidPermissions = {
      post: {
        create: 'not a boolean or function',
      },
    }

    expect(() => {
      permix.setup(invalidPermissions as any)
    }).toThrow('[Permix]: Permissions in setup are not valid.')
  })
})

describe('validatePermix', () => {
  it('should throw error if permix instance is not valid', () => {
    const invalidPermix = { _: {} } as any

    expect(() => {
      validatePermix(invalidPermix)
    }).toThrow('[Permix]: Permix instance is not valid')
  })

  it('should not throw error if permix instance is valid', () => {
    const validPermix = createPermix()

    expect(() => {
      validatePermix(validPermix)
    }).not.toThrow()
  })

  it('should work with enum based permissions', () => {
    enum PostPermission {
      Create = 'create',
      Read = 'read',
      Update = 'update',
      Delete = 'delete',
    }

    const permix = createPermix<{
      post: {
        action: PostPermission
      }
    }>()

    permix.setup({
      post: {
        [PostPermission.Create]: true,
        [PostPermission.Read]: true,
        [PostPermission.Update]: true,
        delete: true,
      },
    })

    expect(permix.check('post', PostPermission.Create)).toBe(true)
  })

  it('should work with initial rules', () => {
    const permix = createPermix<Definition>({
      post: {
        create: true,
        read: true,
      },
      comment: {
        create: false,
        read: true,
        update: true,
      },
    })

    expect(permix.check('post', 'create')).toBe(true)
    expect(permix.check('post', 'read')).toBe(true)
    expect(permix.check('comment', 'create')).toBe(false)
    expect(permix.check('comment', 'read')).toBe(true)
    expect(permix.check('comment', 'update')).toBe(true)
    // @ts-expect-error not valid
    expect(permix.check('comment', '1update')).toBe(false)
    // @ts-expect-error not valid
    expect(permix.check('comment1', 'update')).toBe(false)

    expect(permix.isReady()).toBe(true)
  })

  it('should dehydrate and hydrate state correctly', () => {
    permix.setup({
      post: {
        create: true,
        read: false,
      },
      comment: {
        create: false,
        read: true,
        update: false,
      },
    })

    // Dehydrate the state
    const state = permix.dehydrate()

    // Create a new instance and hydrate with the state
    const newPermix = createPermix<Definition>()
    // Before hydration, all checks should be false
    expect(newPermix.check('post', 'create')).toBe(false)
    expect(newPermix.check('post', 'read')).toBe(false)
    expect(newPermix.check('comment', 'read')).toBe(false)

    newPermix.hydrate(state)

    // After hydration, checks should reflect the hydrated state
    expect(newPermix.check('post', 'create')).toBe(true)
    expect(newPermix.check('post', 'read')).toBe(false)
    expect(newPermix.check('comment', 'create')).toBe(false)
    expect(newPermix.check('comment', 'read')).toBe(true)
    expect(newPermix.check('comment', 'update')).toBe(false)

    // After hydration, isReady should still be false until setup is called
    expect(newPermix.isReady()).toBe(false)

    // Now call setup to fully restore state
    newPermix.setup(state)

    expect(newPermix.isReady()).toBe(true)
    expect(newPermix.check('post', 'create')).toBe(true)
    expect(newPermix.check('post', 'read')).toBe(false)
    expect(newPermix.check('comment', 'read')).toBe(true)
  })
})
