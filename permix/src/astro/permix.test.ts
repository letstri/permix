import { describe, expect, it, vi } from 'vitest'

import type { ValidateDefinition } from '../core'
import { PermixNotFoundError } from '../core'
import { createPermix } from './permix'
import type { AstroContext } from './permix'

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

function createMockContext(): AstroContext {
  return {
    request: new Request('https://example.com'),
    locals: {},
  }
}

function createMockNext(response = new Response('ok')) {
  return vi.fn(() => response)
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

    await permix.setupMiddleware({
      post: { create: true, read: false, update: false },
      user: { delete: false },
    })(context, next)

    const result = await permix.checkMiddleware('post.create')(context, next)

    expect(result?.status).toBe(200)
    expect(next).toHaveBeenCalledTimes(2)
    expect(next).toHaveBeenLastCalledWith()
  })

  it('should deny access when permission is not granted', async () => {
    const context = createMockContext()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })(context, next)

    const result = await permix.checkMiddleware('post.create')(context, next)

    expect(result?.status).toBe(403)
    await expect(result?.text()).resolves.toBe(
      JSON.stringify({ error: 'Forbidden' })
    )
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

    await permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })(context, next)

    const result = await permix.checkMiddleware('post.create')(context, next)

    expect(result?.status).toBe(403)
    await expect(result?.text()).resolves.toBe(
      JSON.stringify({ error: 'Custom error' })
    )
  })

  it('should work with custom error and params', async () => {
    const permix = createPermix<PermissionsDefinition>({
      onForbidden: ({ path }) =>
        new Response(
          JSON.stringify({ error: `You do not have permission for ${path}` }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
    })

    const context = createMockContext()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })(context, next)

    const result = await permix.checkMiddleware('post.create')(context, next)

    expect(result?.status).toBe(403)
    await expect(result?.text()).resolves.toBe(
      JSON.stringify({ error: 'You do not have permission for post.create' })
    )
  })

  it('should pass data through to a rule callback', async () => {
    const permix = createPermix<PostWithData>()

    const context = createMockContext()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: {
        create: (post) => post?.authorId === '1',
      },
    })(context, next)

    const result = await permix.checkMiddleware('post.create', {
      id: 'a',
      authorId: '1',
    })(context, next)

    expect(result?.status).toBe(200)
  })

  it('should work with checker callback form', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const context = createMockContext()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: true, read: true, update: false },
      user: { delete: true },
    })(context, next)

    const result = await permix.checkMiddleware(
      (c) => c('post.create') && c('user.delete')
    )(context, next)

    expect(result?.status).toBe(200)
  })

  it('should work with template', async () => {
    const template = permix.template({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })

    const context = createMockContext()
    const next = createMockNext()

    await permix.setupMiddleware(() => template())(context, next)

    const result = await permix.checkMiddleware('post.create')(context, next)

    expect(result?.status).toBe(200)
  })

  it('should dehydrate permissions', async () => {
    const template = permix.template({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })

    const context = createMockContext()
    const next = createMockNext()

    await permix.setupMiddleware(() => template())(context, next)

    expect(permix.getOrThrow(context).dehydrate()).toStrictEqual({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })
  })

  it('should read the instance from locals as well as context', async () => {
    const context = createMockContext()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(context, next)

    expect(permix.get(context.locals)?.check('post.create')).toBe(true)
    expect(permix.getOrThrow(context.locals).check('post.create')).toBe(true)
  })

  it('should let two factories with different keys coexist on the same request', async () => {
    const admin = createPermix<PermissionsDefinition>().contextKey('admin')
    const guest = createPermix<PermissionsDefinition>().contextKey('guest')

    const context = createMockContext()
    const next = createMockNext()

    await admin.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(context, next)
    await guest.setupMiddleware({
      post: { create: false, read: true, update: false },
      user: { delete: false },
    })(context, next)

    const adminNext = createMockNext()
    const adminResult = await admin.checkMiddleware('post.create')(
      context,
      adminNext
    )
    expect(adminResult?.status).toBe(200)
    expect(adminNext).toHaveBeenCalledWith()

    const guestNext = createMockNext()
    const guestResult = await guest.checkMiddleware('post.create')(
      context,
      guestNext
    )
    expect(guestResult?.status).toBe(403)
    expect(guestNext).not.toHaveBeenCalled()
  })

  it('should default to a per-instance symbol so two factories without a key do not collide', async () => {
    const first = createPermix<PermissionsDefinition>()
    const second = createPermix<PermissionsDefinition>()

    const context = createMockContext()
    const next = createMockNext()

    await first.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(context, next)
    await second.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })(context, next)

    const firstNext = createMockNext()
    const firstResult = await first.checkMiddleware('post.create')(
      context,
      firstNext
    )
    expect(firstResult?.status).toBe(200)

    const secondNext = createMockNext()
    const secondResult = await second.checkMiddleware('post.create')(
      context,
      secondNext
    )
    expect(secondResult?.status).toBe(403)
  })

  it('should accept an explicit symbol key', async () => {
    const key = Symbol('my-permix')
    const permix = createPermix<PermissionsDefinition>().contextKey(key)

    const context = createMockContext()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(context, next)

    expect(Boolean((context.locals as Record<PropertyKey, unknown>)[key])).toBe(
      true
    )
  })
})

describe('get / getOrThrow', () => {
  const permix = createPermix<PermissionsDefinition>()

  it('should return null when setupMiddleware has not run', () => {
    const context = createMockContext()
    expect(permix.get(context)).toBeNull()
  })

  it('should return the instance when setupMiddleware has run', async () => {
    const context = createMockContext()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(context, next)

    const p = permix.getOrThrow(context)
    expect(p.check).toBeTypeOf('function')
  })

  it('getOrThrow should throw PermixNotFoundError when missing', () => {
    const context = createMockContext()
    expect(() => permix.getOrThrow(context)).toThrow(PermixNotFoundError)
  })
})

describe('checkMiddleware without setupMiddleware', () => {
  it('should throw PermixNotFoundError', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const context = createMockContext()
    const next = createMockNext()

    await expect(
      permix.checkMiddleware('post.create')(context, next)
    ).rejects.toBeInstanceOf(PermixNotFoundError)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('onForbidden receives next', () => {
  it('should allow onForbidden to throw custom errors', async () => {
    const permix = createPermix<PermissionsDefinition>({
      onForbidden: ({ path }) => {
        throw new Error(`Forbidden: ${path}`)
      },
    })

    const context = createMockContext()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })(context, next)

    await expect(
      permix.checkMiddleware('post.create')(context, next)
    ).rejects.toMatchObject({
      message: 'Forbidden: post.create',
    })
  })
})

describe('Astro-style middleware composition', () => {
  it('should compose setup and check middleware like sequence()', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const middleware = [
      permix.setupMiddleware({
        post: { create: true, read: false, update: false },
        user: { delete: false },
      }),
      permix.checkMiddleware('post.create'),
    ]

    const run = async (context: AstroContext) => {
      let index = 0
      const dispatch = async (): Promise<Response> => {
        const handler = middleware[index++]
        if (handler) {
          return await handler(context, dispatch)
        }
        return Response.json({ ok: true })
      }
      return await dispatch()
    }

    const res = await run(createMockContext())
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toStrictEqual({ ok: true })
  })
})

describe('key exposure', () => {
  it('should expose the key on the factory return', () => {
    const permix =
      createPermix<PermissionsDefinition>().contextKey('custom-key')
    expect(permix.key).toBe('custom-key')
  })

  it('should expose a symbol key when using default', () => {
    const permix = createPermix<PermissionsDefinition>()
    expect(permix.key).toBeTypeOf('symbol')
  })
})
