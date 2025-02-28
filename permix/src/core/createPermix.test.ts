import type { Permix } from '.'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPermix } from '.'
import { validatePermix } from './createPermix'

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

let permix: Permix<{
  post: {
    dataType: Post
    action: 'create' | 'read'
  }
  comment: {
    dataType: Comment
    action: 'create' | 'read' | 'update'
  }
}>

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

  it('should validate permission as function', () => {
    permix.setup({
      post: {
        create: post => post.authorId === '1',
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
})
