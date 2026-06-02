import type { ValidateDefinition } from '../core'
import { describe, expect, it, vi } from 'vitest'
import { createPermix as createCorePermix, PermixError, PermixNotFoundError } from '../core'
import { createPermix } from './permix'

type PermissionsDefinition = ValidateDefinition<{
  post: ['create', 'read']
}>

type PostWithData = ValidateDefinition<{
  post: [{ name: 'edit', type: { authorId: string } }]
}>

/**
 * TanStack Start middleware created by `createMiddleware()` stores its handlers
 * on `.options`. Outside the framework runtime there is no server to execute
 * the chain, so we invoke the stored `server` handler directly with a fake
 * `next` to assert the behavior in isolation.
 */
function runServer(
  middleware: { options: { server?: (opts: any) => any } },
  opts: Record<string, unknown> = {},
) {
  let received: { context: Record<string | symbol, unknown> } = { context: {} }
  const next = vi.fn(async (arg?: { context?: Record<string | symbol, unknown> }) => {
    received = { context: { ...(opts.context as object), ...(arg?.context ?? {}) } }
    return received
  })

  const result = middleware.options.server!({ next, ...opts })

  return {
    result,
    next,
    get received() {
      return received
    },
  }
}

describe('tanstack-start createPermix', () => {
  it('sets up rules from an object and exposes the instance on context', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const middleware = permix.setupMiddleware({
      post: {
        create: true,
        read: false,
      },
    })

    const run = runServer(middleware, { request: new Request('http://localhost') })
    await run.result

    const instance = permix.getOrThrow(run.received.context)

    expect(instance.check('post.create')).toBe(true)
    expect(instance.check('post.read')).toBe(false)
  })

  it('supports an async callback that receives the request', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const callback = vi.fn(async ({ request }: { request: Request }) => ({
      post: {
        create: new URL(request.url).searchParams.get('admin') === '1',
        read: true,
      },
    }))

    const middleware = permix.setupMiddleware(callback)

    const run = runServer(middleware, {
      request: new Request('http://localhost/?admin=1'),
    })
    await run.result

    expect(callback).toHaveBeenCalledOnce()
    expect(permix.getOrThrow(run.received.context).check('post.create')).toBe(true)
  })

  it('isolates instances between requests', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const middleware = permix.setupMiddleware(({ request }) => ({
      post: { create: new URL(request.url).pathname === '/admin', read: true },
    }))

    const a = runServer(middleware, { request: new Request('http://localhost/admin') })
    const b = runServer(middleware, { request: new Request('http://localhost/guest') })
    await Promise.all([a.result, b.result])

    const instanceA = permix.getOrThrow(a.received.context)
    const instanceB = permix.getOrThrow(b.received.context)

    expect(instanceA).not.toBe(instanceB)
    expect(instanceA.check('post.create')).toBe(true)
    expect(instanceB.check('post.create')).toBe(false)
  })

  it('uses a fresh Symbol as the default context key', async () => {
    const permix = createPermix<PermissionsDefinition>()

    expect(typeof permix.key).toBe('symbol')

    const middleware = permix.setupMiddleware({ post: { create: true, read: true } })
    const run = runServer(middleware, { request: new Request('http://localhost') })
    await run.result

    expect(run.received.context[permix.key]).toBeDefined()
  })

  it('stores the instance under a custom context key via contextKey()', async () => {
    const permix = createPermix<PermissionsDefinition>().contextKey('permissions')

    expect(permix.key).toBe('permissions')

    const middleware = permix.setupMiddleware({ post: { create: true, read: true } })
    const run = runServer(middleware, { request: new Request('http://localhost') })
    await run.result

    expect(run.received.context.permissions).toBeDefined()
    expect(permix.getOrThrow(run.received.context).check('post.create')).toBe(true)
  })

  describe('get / getOrThrow', () => {
    it('returns the instance from context', () => {
      const permix = createPermix<PermissionsDefinition>()
      const context = { [permix.key]: createInstance() }

      expect(permix.get(context)!.check('post.create')).toBe(true)
      expect(permix.getOrThrow(context).check('post.create')).toBe(true)
    })

    it('get returns null when the instance is missing', () => {
      const permix = createPermix<PermissionsDefinition>()

      expect(permix.get({})).toBeNull()
      expect(permix.get(null)).toBeNull()
    })

    it('getOrThrow throws PermixNotFoundError when the instance is missing', () => {
      const permix = createPermix<PermissionsDefinition>()

      expect(() => permix.getOrThrow({})).toThrow(PermixNotFoundError)
      expect(() => permix.getOrThrow(null)).toThrow(PermixNotFoundError)
    })
  })

  describe('dehydrate', () => {
    it('serializes the request-scoped state', () => {
      const permix = createPermix<PermissionsDefinition>()
      const context = { [permix.key]: createInstance({ create: true, read: false }) }

      expect(permix.dehydrate(context)).toEqual({ post: { create: true, read: false } })
    })

    it('throws when no instance was set up', () => {
      const permix = createPermix<PermissionsDefinition>()

      expect(() => permix.dehydrate({})).toThrow(PermixNotFoundError)
    })
  })

  describe('checkMiddleware', () => {
    it('calls next when the check passes', async () => {
      const permix = createPermix<PermissionsDefinition>()

      const middleware = permix.checkMiddleware('post.create')
      const run = runServer(middleware, { context: { [permix.key]: createInstance({ create: true }) } })
      await run.result

      expect(run.next).toHaveBeenCalledOnce()
    })

    it('throws by default when the check fails', async () => {
      const permix = createPermix<PermissionsDefinition>()

      const middleware = permix.checkMiddleware('post.create')

      await expect(
        runServer(middleware, { context: { [permix.key]: createInstance({ create: false }) } }).result,
      ).rejects.toThrow(PermixError)
    })

    it('calls a custom onForbidden handler', async () => {
      const onForbidden = vi.fn(({ next }: { next: (...args: any[]) => any }) => {
        return next()
      })
      const permix = createPermix<PermissionsDefinition>({ onForbidden })

      const middleware = permix.checkMiddleware('post.create')
      const run = runServer(middleware, { context: { [permix.key]: createInstance({ create: false }) } })
      await run.result

      expect(onForbidden).toHaveBeenCalledWith({ next: run.next, path: 'post.create', data: undefined })
      expect(run.next).toHaveBeenCalledOnce()
    })

    it('throws PermixNotFoundError when setup did not run', async () => {
      const permix = createPermix<PermissionsDefinition>()

      const middleware = permix.checkMiddleware('post.create')

      await expect(
        runServer(middleware, { context: {} }).result,
      ).rejects.toThrow(PermixNotFoundError)
    })
  })

  describe('template', () => {
    it('creates reusable templates', () => {
      const permix = createPermix<PermissionsDefinition>()

      const adminTemplate = permix.template({
        post: { create: true, read: true },
      })

      expect(adminTemplate()).toEqual({ post: { create: true, read: true } })
    })

    it('supports parameterized templates', () => {
      const permix = createPermix<PostWithData>()

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
})

function createInstance(post: { create?: boolean, read?: boolean } = { create: true }) {
  const permix = createCorePermix<PermissionsDefinition>()
  permix.setup({ post: { create: false, read: false, ...post } })
  return permix
}
