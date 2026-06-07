import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { PermixNotReadyError, PermixRuleNotDefinedError } from './errors'
import { createPermix } from './permix'

describe('createPermix', () => {
  it('should init basic rules', () => {
    const permix = createPermix<['read']>()

    permix.setup({
      read: true,
    })

    expect(permix.check('read')).toBe(true)
  })

  it('should throw if check is called before setup', () => {
    const permix = createPermix<{ post: ['create'] }>()

    expect(() => permix.check('post.create')).toThrow(PermixNotReadyError)
  })

  it('should throw if rule is not defined', () => {
    const permix = createPermix<{ post: ['create', 'read'] }>()

    permix.setup({
      post: {
        create: true,
        read: true,
      },
    })

    expect(permix.check('post.read')).toBe(true)
    // @ts-expect-error rule is not defined
    expect(() => permix.check('post.not-exist')).toThrow(PermixRuleNotDefinedError)
  })

  it('should throw when check path is deeper than a boolean leaf (setup)', () => {
    const permix = createPermix<{ post: ['create', 'read'] }>()

    permix.setup({
      post: true,
    } as never)

    expect(() => permix.check('post.create')).toThrow(
      expect.objectContaining({ path: 'post.create', name: 'PermixRuleNotDefinedError' }),
    )
  })

  it('should throw when check path is deeper than a boolean leaf (hydrate)', () => {
    const permix = createPermix<{ post: ['create', 'read'] }>()

    permix.hydrate({
      // @ts-expect-error true is not a valid rule
      post: true,
    })

    expect(() => permix.check('post.create')).toThrow(
      expect.objectContaining({ path: 'post.create', name: 'PermixRuleNotDefinedError' }),
    )
  })

  it('should allow check on a flat boolean leaf without extra path segments', () => {
    const permix = createPermix<['read']>()

    permix.setup({ read: true })

    expect(permix.check('read')).toBe(true)
  })

  it('should allow check with explicit undefined data after reaching a boolean leaf', () => {
    const permix = createPermix<{ post: ['create'] }>()

    permix.setup({ post: { create: true } })

    // @ts-expect-error undefined is not a valid data argument
    expect(permix.check('post.create', undefined)).toBe(true)
  })

  it('should validate permission for entity with data callback', () => {
    interface Post { authorId: string }

    const permix = createPermix<{
      post: [
        'read',
        { name: 'create', type: Post },
      ]
    }>()

    permix.setup({
      post: {
        read: true,
        create: post => post?.authorId === '1',
      },
    })

    expect(permix.check('post.create', { authorId: '1' })).toBe(true)
    expect(permix.check('post.create', { authorId: '2' })).toBe(false)
    expect(permix.check('post.create')).toBe(false)
  })

  it('should require data argument when action declares required: true', () => {
    interface Post { authorId: string }

    const permix = createPermix<{
      post: [
        { name: 'create', type: Post, required: true },
      ]
    }>()

    permix.setup({
      post: {
        create: post => post.authorId === '1',
      },
    })

    // @ts-expect-error data is required
    expect(() => permix.check('post.create')).toThrow()
    expect(permix.check('post.create', { authorId: '1' })).toBe(true)
    expect(permix.check('post.create', { authorId: '2' })).toBe(false)
  })

  it('should work without a per-action data type', () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({
      post: { create: true },
    })

    expect(permix.check('post.create')).toBe(true)
  })

  it('should work with enum-based permissions', () => {
    enum PostAction {
      Create = 'create',
      Read = 'read',
      Update = 'update',
      Delete = 'delete',
    }

    const permix = createPermix<{
      post: [PostAction]
    }>()

    permix.setup({
      post: {
        [PostAction.Create]: true,
        [PostAction.Read]: true,
        [PostAction.Update]: true,
        [PostAction.Delete]: false,
      },
    })

    expect(permix.check(`post.${PostAction.Create}`)).toBe(true)
    expect(permix.check(`post.${PostAction.Read}`)).toBe(true)
    expect(permix.check(`post.${PostAction.Update}`)).toBe(true)
    expect(permix.check(`post.${PostAction.Delete}`)).toBe(false)
  })

  it('should expose type-only $inferDefinition and $inferPath helpers', () => {
    const permix = createPermix<{
      user: ['create']
      job: ['remove']
    }>()

    expectTypeOf(permix.$inferDefinition).toEqualTypeOf<{
      user: ['create']
      job: ['remove']
    }>()

    const ONE_PATH: typeof permix.$inferPath = 'user.create'
    expect(ONE_PATH).toBe('user.create')

    const AVAILABLE_PERMISSIONS = ['user.create', 'job.remove'] satisfies typeof permix.$inferPath[]
    expect(AVAILABLE_PERMISSIONS).toEqual(['user.create', 'job.remove'])

    // @ts-expect-error 'user.unknown' is not a valid permission path
    const INVALID = ['user.unknown'] satisfies (typeof permix.$inferPath)[]
    expect(INVALID).toEqual(['user.unknown'])
  })

  it('should resolve permissions once setup runs asynchronously', async () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    setTimeout(() => {
      permix.setup({ post: { create: true } })
    }, 10)

    await permix.isReadyAsync()
    expect(permix.check('post.create')).toBe(true)
  })
})

describe('check ~all / ~any', () => {
  it('should return true with ~all when every rule is true', () => {
    const permix = createPermix<{
      post: ['create', 'read']
      comment: ['create', 'read', 'update']
    }>()

    permix.setup({
      post: { create: true, read: true },
      comment: { create: true, read: true, update: true },
    })

    expect(permix.check('~all')).toBe(true)
  })

  it('should return false with ~all when at least one rule is false', () => {
    const permix = createPermix<{
      post: ['create', 'read']
      comment: ['create', 'read', 'update']
    }>()

    permix.setup({
      post: { create: true, read: false },
      comment: { create: true, read: true, update: true },
    })

    expect(permix.check('~all')).toBe(false)
  })

  it('should return true with ~any when at least one rule is true', () => {
    const permix = createPermix<{
      post: ['create', 'read']
      comment: ['create', 'read', 'update']
    }>()

    permix.setup({
      post: { create: false, read: false },
      comment: { create: false, read: true, update: false },
    })

    expect(permix.check('~any')).toBe(true)
  })

  it('should return false with ~any when every rule is false', () => {
    const permix = createPermix<{
      post: ['create', 'read']
      comment: ['create', 'read', 'update']
    }>()

    permix.setup({
      post: { create: false, read: false },
      comment: { create: false, read: false, update: false },
    })

    expect(permix.check('~any')).toBe(false)
  })

  it('should evaluate function rules with no data when aggregating', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>()

    permix.setup({
      post: {
        create: () => true,
        read: () => false,
      },
    })

    expect(permix.check('~any')).toBe(true)
    expect(permix.check('~all')).toBe(false)
  })

  it('should aggregate only the leaf subtree with `<path>.~all` / `<path>.~any`', () => {
    const permix = createPermix<{
      post: ['create', 'read']
      comment: ['create', 'read', 'update']
    }>()

    permix.setup({
      post: { create: true, read: true },
      comment: { create: false, read: true, update: false },
    })

    expect(permix.check('post.~any')).toBe(true)
    expect(permix.check('post.~all')).toBe(true)
    expect(permix.check('comment.~all')).toBe(false)
    expect(permix.check('comment.~any')).toBe(true)
  })

  it('should aggregate a nested non-leaf subtree with `<path>.~all` / `<path>.~any`', () => {
    const permix = createPermix<{
      user: ['write']
      workspace: {
        customer: ['create', 'delete']
        guest: ['read', 'write']
      }
    }>()

    permix.setup({
      user: { write: true },
      workspace: {
        customer: { create: true, delete: true },
        guest: { read: true, write: false },
      },
    })

    expect(permix.check('workspace.~all')).toBe(false)
    expect(permix.check('workspace.~any')).toBe(true)
    expect(permix.check('workspace.customer.~all')).toBe(true)
    expect(permix.check('workspace.guest.~all')).toBe(false)
    expect(permix.check('workspace.guest.~any')).toBe(true)
  })

  it('should resolve function rules when aggregating a nested subtree', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>()

    permix.setup({
      post: {
        create: () => true,
        read: () => false,
      },
    })

    expect(permix.check('post.~any')).toBe(true)
    expect(permix.check('post.~all')).toBe(false)
  })
})

describe('deep rules', () => {
  it('should init deep rules', () => {
    const permix = createPermix<{
      user: ['write']
      workspace: {
        customer: ['write']
        guest: ['write']
      }
    }>()

    permix.setup({
      user: {
        write: true,
      },
      workspace: {
        customer: {
          write: true,
        },
        guest: {
          write: false,
        },
      },
    })

    expect(permix.check('user.write')).toBe(true)
    expect(permix.check('workspace.customer.write')).toBe(true)
  })

  it('should work with callback and per-action data', () => {
    const permix = createPermix<{
      user: [
        'read',
        { name: 'write', type: { authorId: string }, required: true },
      ]
      workspace: {
        customer: ['write']
        guest: ['write']
      }
    }>()

    permix.setup({
      user: {
        read: true,
        write: data => data.authorId === '1',
      },
      workspace: {
        customer: {
          write: true,
        },
        guest: {
          write: false,
        },
      },
    })

    expect(permix.check('user.read')).toBe(true)
    expect(permix.check('user.write', { authorId: '1' })).toBe(true)
    expect(permix.check('user.write', { authorId: '2' })).toBe(false)
    expect(permix.check(c => c('user.read'))).toBe(true)
    expect(permix.check(c => c('user.read') && c('user.write', { authorId: '1' }))).toBe(true)
    expect(permix.check(c => c('user.write', { authorId: '1' }))).toBe(true)
    expect(permix.check(c => c('user.write', { authorId: '2' }))).toBe(false)
    expect(permix.check(c => c('workspace.customer.write'))).toBe(true)
  })

  describe('hydration', () => {
    it('should hydrate permissions from JSON state', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()

      permix.hydrate({
        post: {
          create: true,
          read: false,
        },
      })

      expect(permix.check('post.create')).toBe(true)
      expect(permix.check('post.read')).toBe(false)
    })

    it('should handle nested entities', () => {
      const permix = createPermix<{
        post: ['create', 'read', 'update']
        comment: ['write', 'delete']
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

      expect(permix.check('post.create')).toBe(true)
      expect(permix.check('post.update')).toBe(false)
      expect(permix.check('comment.write')).toBe(true)
      expect(permix.check('comment.delete')).toBe(false)
    })

    it('should dehydrate permissions to JSON state', () => {
      const permix = createPermix<{
        post: ['create', 'read']
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

      expect(permix.check('post.create')).toBe(true)
      expect(permix.check('post.read')).toBe(false)
    })

    it('should evaluate function rules when dehydrating', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()

      permix.setup({
        post: {
          create: () => true,
          read: () => false,
        },
      })

      const dehydrated = permix.dehydrate()
      expect(dehydrated).toEqual({ post: { create: true, read: false } })

      permix.hydrate(dehydrated)
      expect(permix.check('post.create')).toBe(true)
      expect(permix.check('post.read')).toBe(false)
    })

    it('should evaluate data rules without check data when dehydrating', () => {
      const permix = createPermix<{
        user: [
          { name: 'write', type: { authorId: string }, required: true },
        ]
      }>()

      permix.setup({
        user: {
          write: data => data.authorId === '1',
        },
      })

      expect(permix.dehydrate()).toEqual({ user: { write: false } })
    })

    it('should throw when dehydrating without setup', () => {
      const permix = createPermix<{
        post: ['create']
      }>()

      expect(() => permix.dehydrate()).toThrow(PermixNotReadyError)
    })

    it('should transfer state from server to client instance', () => {
      const permixServer = createPermix<{
        post: ['create', 'read']
      }>()

      permixServer.setup({
        post: {
          create: true,
          read: false,
        },
      })

      const dehydrated = permixServer.dehydrate()
      const permixClient = createPermix<{
        post: ['create', 'read']
      }>()

      permixClient.hydrate(dehydrated)

      expect(permixClient.check('post.create')).toBe(true)
      expect(permixClient.check('post.read')).toBe(false)
    })

    it('should dehydrate deep nested rules', () => {
      const permix = createPermix<{
        workspace: {
          guest: ['write']
          user: ['write2']
        }
      }>()

      permix.setup({
        workspace: {
          guest: { write: false },
          user: { write2: true },
        },
      })

      expect(permix.dehydrate()).toEqual({
        workspace: {
          guest: { write: false },
          user: { write2: true },
        },
      })
    })
  })

  describe('template', () => {
    it('should define static permissions with template', () => {
      const permix = createPermix<{
        post: ['create', 'read']
        comment: ['create', 'read', 'update']
      }>()

      const adminPermissions = permix.template({
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

      expect(adminPermissions()).toEqual({
        post: { create: true, read: true },
        comment: { create: true, read: true, update: true },
      })

      permix.setup(adminPermissions())
      expect(permix.check('post.create')).toBe(true)
    })

    it('should work with dynamic template function', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()

      const rolePermissions = permix.template(({ role }: { role: string }) => ({
        post: {
          create: role === 'admin',
          read: true,
        },
      }))

      permix.setup(rolePermissions({ role: 'admin' }))
      expect(permix.check('post.create')).toBe(true)

      permix.setup(rolePermissions({ role: 'viewer' }))
      expect(permix.check('post.create')).toBe(false)
      expect(permix.check('post.read')).toBe(true)
    })
  })

  describe('hooks', () => {
    it('should call setup hook every time setup is called', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()

      const fn = vi.fn()
      permix.hook('setup', fn)

      permix.setup({ post: { create: true, read: true } })
      permix.setup({ post: { create: false, read: true } })

      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should call hookOnce only once', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()

      const fn = vi.fn()
      permix.hookOnce('setup', fn)

      permix.setup({ post: { create: true, read: true } })
      permix.setup({ post: { create: false, read: true } })

      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should fire ready only on the first setup call', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()

      const fn = vi.fn()
      permix.hook('ready', fn)

      permix.setup({ post: { create: true, read: true } })
      permix.setup({ post: { create: false, read: true } })

      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should not become ready on hydrate, only on setup', () => {
      const permix = createPermix<{
        post: ['create', 'read']
      }>()

      const fn = vi.fn()
      permix.hook('ready', fn)

      permix.hydrate({ post: { create: true, read: false } })

      expect(fn).toHaveBeenCalledTimes(0)
      expect(permix.isReady()).toBe(false)
      // check still works with hydrated booleans even though not ready
      expect(permix.check('post.create')).toBe(true)

      permix.setup({ post: { create: true, read: false } })

      expect(fn).toHaveBeenCalledTimes(1)
      expect(permix.isReady()).toBe(true)
    })

    it('should return removal function from hook', () => {
      const permix = createPermix<{
        post: ['create']
      }>()

      const fn = vi.fn()
      const remove = permix.hook('setup', fn)

      permix.setup({ post: { create: true } })
      expect(fn).toHaveBeenCalledTimes(1)

      remove()
      permix.setup({ post: { create: false } })
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should report isReady correctly', () => {
      const permix = createPermix<{
        post: ['create']
      }>()

      expect(permix.isReady()).toBe(false)
      permix.setup({ post: { create: true } })
      expect(permix.isReady()).toBe(true)
    })

    it('should resolve isReadyAsync immediately if already ready', async () => {
      const permix = createPermix<{
        post: ['create']
      }>({ post: { create: true } })

      await expect(permix.isReadyAsync()).resolves.toBeUndefined()
    })

    it('should resolve isReadyAsync once setup is called', async () => {
      const permix = createPermix<{
        post: ['create']
      }>()

      const promise = permix.isReadyAsync()
      permix.setup({ post: { create: true } })

      await expect(promise).resolves.toBeUndefined()
    })
  })
})
