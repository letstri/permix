import { describe, expect, it, vi } from 'vitest'

import type { ValidateDefinition } from '../core'
import { PermixNotFoundError } from '../core'
import { createPermix } from './permix'
import type { ReactRouterContext } from './permix'

interface Post {
  id: string
  authorId: string
}

type PermissionsDefinition = ValidateDefinition<{
  post: ['create', 'read', 'update']
  user: ['delete']
}>

type PostWithData = ValidateDefinition<{
  post: [{ name: 'create'; type: Post }]
}>

function createMockContext(): ReactRouterContext {
  const store = new Map<object, unknown>()
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value)
    },
  }
}

function createMockNext(response = new Response('ok')) {
  return vi.fn(async () => response)
}

describe(createPermix, () => {
  const permix = createPermix<PermissionsDefinition>()

  it('should throw ts error', () => {
    // @ts-expect-error path does not exist
    permix.checkMiddleware('post.delete')
  })

  it('should allow access when permission is granted', async () => {
    const context = createMockContext()
    const next = createMockNext()
    const request = new Request('https://example.com')

    await permix.setupMiddleware({
      post: { create: true, read: false, update: false },
      user: { delete: false },
    })({ request, context }, next)

    const result = await permix.checkMiddleware('post.create')(
      { request, context },
      next
    )

    expect(result?.status).toBe(200)
    expect(next).toHaveBeenCalledTimes(2)
  })

  it('should deny access when permission is not granted', async () => {
    const context = createMockContext()
    const next = createMockNext()
    const request = new Request('https://example.com')

    await permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })({ request, context }, next)

    const result = await permix.checkMiddleware('post.create')(
      { request, context },
      next
    )

    expect(result?.status).toBe(403)
    await expect(result?.text()).resolves.toBe(
      JSON.stringify({ error: 'Forbidden' })
    )
    expect(next).toHaveBeenCalledOnce()
  })

  it('should work with custom error handler', async () => {
    const permix = createPermix<PermissionsDefinition>({
      onForbidden: () =>
        new Response(JSON.stringify({ error: 'Custom error' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
    })

    const context = createMockContext()
    const next = createMockNext()
    const request = new Request('https://example.com')

    await permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })({ request, context }, next)

    const result = await permix.checkMiddleware('post.create')(
      { request, context },
      next
    )

    expect(result?.status).toBe(403)
    await expect(result?.text()).resolves.toBe(
      JSON.stringify({ error: 'Custom error' })
    )
  })

  it('should pass data through to a rule callback', async () => {
    const permix = createPermix<PostWithData>()
    const context = createMockContext()
    const next = createMockNext()
    const request = new Request('https://example.com')

    await permix.setupMiddleware({
      post: {
        create: (post) => post?.authorId === '1',
      },
    })({ request, context }, next)

    const result = await permix.checkMiddleware('post.create', {
      id: 'a',
      authorId: '1',
    })({ request, context }, next)

    expect(result?.status).toBe(200)
  })

  it('should work with checker callback form', async () => {
    const permix = createPermix<PermissionsDefinition>()
    const context = createMockContext()
    const next = createMockNext()
    const request = new Request('https://example.com')

    await permix.setupMiddleware({
      post: { create: true, read: true, update: false },
      user: { delete: true },
    })({ request, context }, next)

    const result = await permix.checkMiddleware(
      (c) => c('post.create') && c('user.delete')
    )({ request, context }, next)

    expect(result?.status).toBe(200)
  })

  it('should work with an async setup callback that receives the request and context', async () => {
    const permix = createPermix<PermissionsDefinition>()
    const context = createMockContext()
    const next = createMockNext()
    const request = new Request('https://example.com/?admin=1')
    const userContext = {}
    context.set(userContext, { role: 'admin' })

    await permix.setupMiddleware(async ({ request: req, context: ctx }) => ({
      post: {
        create: new URL(req.url).searchParams.get('admin') === '1',
        read: true,
        update: (ctx.get(userContext) as { role: string }).role === 'admin',
      },
      user: { delete: false },
    }))({ request, context }, next)

    expect(permix.getOrThrow(context).check('post.create')).toBe(true)
    expect(permix.getOrThrow(context).check('post.update')).toBe(true)
  })

  it('should dehydrate permissions', async () => {
    const permix = createPermix<PermissionsDefinition>()
    const context = createMockContext()
    const next = createMockNext()
    const request = new Request('https://example.com')

    await permix.setupMiddleware({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })({ request, context }, next)

    expect(permix.dehydrate(context)).toStrictEqual({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })
  })

  it('should isolate instances between requests', async () => {
    const permix = createPermix<PermissionsDefinition>()
    const next = createMockNext()

    const admin = createMockContext()
    await permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(
      { request: new Request('https://example.com/admin'), context: admin },
      next
    )

    const guest = createMockContext()
    await permix.setupMiddleware({
      post: { create: false, read: true, update: false },
      user: { delete: false },
    })({ request: new Request('https://example.com'), context: guest }, next)

    expect(permix.getOrThrow(admin).check('post.create')).toBe(true)
    expect(permix.getOrThrow(guest).check('post.create')).toBe(false)
  })

  it('should isolate independent factories on the same request context', async () => {
    const first = createPermix<PermissionsDefinition>()
    const second = createPermix<PermissionsDefinition>()
    const context = createMockContext()
    const next = createMockNext()
    const request = new Request('https://example.com')

    await first.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })({ request, context }, next)
    await second.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })({ request, context }, next)

    expect(first.getOrThrow(context).check('post.create')).toBe(true)
    expect(second.getOrThrow(context).check('post.create')).toBe(false)
  })

  it('should work with template', async () => {
    const permix = createPermix<PermissionsDefinition>()
    const template = permix.template({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })

    const context = createMockContext()
    const next = createMockNext()
    const request = new Request('https://example.com')

    await permix.setupMiddleware(() => template())({ request, context }, next)

    const result = await permix.checkMiddleware('post.create')(
      { request, context },
      next
    )

    expect(result?.status).toBe(200)
  })
})

describe('get / getOrThrow', () => {
  const permix = createPermix<PermissionsDefinition>()

  it('should return null when setupMiddleware has not run', () => {
    expect(permix.get(createMockContext())).toBeNull()
  })

  it('should return the instance when setupMiddleware has run', async () => {
    const context = createMockContext()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })({ request: new Request('https://example.com'), context }, next)

    expect(permix.getOrThrow(context).check).toBeTypeOf('function')
  })

  it('getOrThrow should throw PermixNotFoundError when missing', () => {
    expect(() => permix.getOrThrow(createMockContext())).toThrow(
      PermixNotFoundError
    )
  })
})

describe('checkMiddleware without setupMiddleware', () => {
  it('should throw PermixNotFoundError', async () => {
    const permix = createPermix<PermissionsDefinition>()
    const next = createMockNext()

    await expect(
      permix.checkMiddleware('post.create')(
        {
          request: new Request('https://example.com'),
          context: createMockContext(),
        },
        next
      )
    ).rejects.toBeInstanceOf(PermixNotFoundError)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('React Router-style middleware composition', () => {
  it('should compose setup and check middleware', async () => {
    const permix = createPermix<PermissionsDefinition>()
    const context = createMockContext()
    const request = new Request('https://example.com')

    const middleware = [
      permix.setupMiddleware({
        post: { create: true, read: false, update: false },
        user: { delete: false },
      }),
      permix.checkMiddleware('post.create'),
    ]

    let index = 0
    const dispatch = async (): Promise<Response> => {
      const handler = middleware[index++]
      if (handler) {
        return await handler({ request, context }, dispatch)
      }
      return Response.json({ ok: true })
    }

    const res = await dispatch()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toStrictEqual({ ok: true })
  })
})

describe('context key', () => {
  it('should expose a unique context key per factory', () => {
    const first = createPermix<PermissionsDefinition>()
    const second = createPermix<PermissionsDefinition>()
    expect(first.context).not.toBe(second.context)
  })
})
