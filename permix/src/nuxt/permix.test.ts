import type { App } from 'h3'
import {
  createApp,
  createError,
  createRouter,
  defineEventHandler,
  toWebHandler,
} from 'h3'
import { describe, expect, it } from 'vitest'

import type { ValidateDefinition } from '../core'
import { PermixNotFoundError } from '../core'
import { createPermix } from './permix'

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

function request(app: App, path: string, init?: RequestInit) {
  return toWebHandler(app)(new Request(`http://localhost${path}`, init))
}

describe(createPermix, () => {
  const permix = createPermix<PermissionsDefinition>()

  it('should throw ts error', () => {
    // @ts-expect-error path does not exist
    permix.checkMiddleware('post.delete')
  })

  it('should allow access when permission is granted', async () => {
    const app = createApp()

    app.use(
      defineEventHandler(
        permix.setupMiddleware({
          post: { create: true, read: false, update: false },
          user: { delete: false },
        })
      )
    )

    const router = createRouter()
    router.post(
      '/posts',
      defineEventHandler({
        onRequest: [permix.checkMiddleware('post.create')],
        handler: () => ({ success: true }),
      })
    )
    app.use(router)

    const res = await request(app, '/posts', { method: 'POST' })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toStrictEqual({ success: true })
  })

  it('should deny access when permission is not granted', async () => {
    const app = createApp()

    app.use(
      defineEventHandler(
        permix.setupMiddleware(() => ({
          post: { create: false, read: false, update: false },
          user: { delete: false },
        }))
      )
    )

    const router = createRouter()
    router.post(
      '/posts',
      defineEventHandler({
        onRequest: [permix.checkMiddleware('post.create')],
        handler: () => ({ success: true }),
      })
    )
    app.use(router)

    const res = await request(app, '/posts', { method: 'POST' })
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      statusCode: 403,
      data: { error: 'Forbidden' },
    })
  })

  it('should work with custom error handler', async () => {
    const permix = createPermix<PermissionsDefinition>({
      onForbidden: ({ path }) => {
        throw createError({
          statusCode: 403,
          data: { error: `Custom error: ${path}` },
        })
      },
    })

    const app = createApp()

    app.use(
      defineEventHandler(
        permix.setupMiddleware(() => ({
          post: { create: false, read: false, update: false },
          user: { delete: false },
        }))
      )
    )
    app.use(
      '/posts',
      defineEventHandler({
        onRequest: [permix.checkMiddleware('post.create')],
        handler: () => ({ success: true }),
      })
    )

    const res = await request(app, '/posts', { method: 'POST' })
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      data: { error: 'Custom error: post.create' },
    })
  })

  it('should pass data through to a rule callback', async () => {
    const permix = createPermix<PostWithData>()
    const app = createApp()

    app.use(
      defineEventHandler(
        permix.setupMiddleware({
          post: { create: (post) => post?.authorId === '1' },
        })
      )
    )
    app.use(
      '/allowed',
      defineEventHandler({
        onRequest: [
          permix.checkMiddleware('post.create', { id: '1', authorId: '1' }),
        ],
        handler: () => ({ success: true }),
      })
    )
    app.use(
      '/denied',
      defineEventHandler({
        onRequest: [
          permix.checkMiddleware('post.create', { id: '1', authorId: '2' }),
        ],
        handler: () => ({ success: true }),
      })
    )

    const allowed = await request(app, '/allowed')
    const denied = await request(app, '/denied')
    expect(allowed.status).toBe(200)
    expect(denied.status).toBe(403)
  })

  it('should work with checker callback form', async () => {
    const app = createApp()

    app.use(
      defineEventHandler(
        permix.setupMiddleware({
          post: { create: true, read: true, update: false },
          user: { delete: false },
        })
      )
    )
    app.use(
      '/posts',
      defineEventHandler({
        onRequest: [
          permix.checkMiddleware((c) => c('post.create') && c('post.read')),
        ],
        handler: () => ({ success: true }),
      })
    )

    const res = await request(app, '/posts')
    expect(res.status).toBe(200)
  })

  it('should work with template', async () => {
    const app = createApp()
    const admin = permix.template({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })

    app.use(defineEventHandler(permix.setupMiddleware(admin())))
    app.use(
      '/posts',
      defineEventHandler({
        onRequest: [permix.checkMiddleware('post.~all')],
        handler: () => ({ success: true }),
      })
    )

    const res = await request(app, '/posts')
    expect(res.status).toBe(200)
  })

  it('should isolate instances between concurrent requests', async () => {
    const app = createApp()

    app.use(
      defineEventHandler(
        permix.setupMiddleware(({ event }) => ({
          post: {
            create: (event.context as any).admin === true,
            read: true,
            update: false,
          },
          user: { delete: false },
        }))
      )
    )
    app.use(
      '/posts',
      defineEventHandler((event) => ({
        canCreate: permix.getOrThrow(event).check('post.create'),
      }))
    )

    const admin = createApp()
    admin.use(
      defineEventHandler((event) => {
        ;(event.context as any).admin = true
      })
    )
    admin.use(app)

    const [adminRes, guestRes] = await Promise.all([
      request(admin, '/posts'),
      request(app, '/posts'),
    ])
    await expect(adminRes.json()).resolves.toStrictEqual({ canCreate: true })
    await expect(guestRes.json()).resolves.toStrictEqual({ canCreate: false })
  })

  it('should throw PermixNotFoundError when setupMiddleware has not run', async () => {
    const event = { context: {} }

    expect(permix.get(event)).toBeNull()
    expect(permix.getRules(event)).toBeNull()
    expect(() => permix.getOrThrow(event)).toThrow(PermixNotFoundError)
    await expect(permix.checkMiddleware('post.read')(event)).rejects.toThrow(
      PermixNotFoundError
    )
  })

  it('should let two factories coexist on the same event', async () => {
    const a = createPermix<PermissionsDefinition>()
    const b = createPermix<PermissionsDefinition>().contextKey('permix-b')
    const event = { context: {} as Record<string, unknown> }

    await a.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(event)
    await b.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })(event)

    expect(a.getOrThrow(event).check('post.create')).toBe(true)
    expect(b.getOrThrow(event).check('post.create')).toBe(false)
    expect(event.context['permix-b']).toBe(b.get(event))
    expect(a.key).toBeTypeOf('symbol')
    expect(b.key).toBe('permix-b')
  })

  it('should fire factory-level check hooks', async () => {
    const permix = createPermix<PermissionsDefinition>()
    const event = { context: {} }
    const paths: unknown[] = []
    permix.hook('check', ({ path }) => {
      paths.push(path)
    })

    await permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(event)
    await permix.checkMiddleware('post.read')(event)

    expect(paths).toStrictEqual(['post.read'])
  })
})
