import type { ValidateStatement } from '../core'
import { Elysia } from 'elysia'
import { describe, expect, it } from 'vitest'
import { PermixNotFoundError } from '../core'
import { createPermix } from './permix'

interface Post {
  id: string
  authorId: string
}

type PermissionsStatement = ValidateStatement<{
  post: ['create', 'read', 'update']
  user: ['delete']
}>

type PostWithData = ValidateStatement<{
  post: [{ name: 'create', type: Post }]
}>

describe('createPermix', () => {
  const permix = createPermix<PermissionsStatement>()

  it('should throw ts error', () => {
    // @ts-expect-error path does not exist
    permix.checkMiddleware('post.delete')
  })

  it('should allow access when permission is granted', async () => {
    const app = new Elysia()
      .onBeforeHandle(permix.setupMiddleware({
        post: { create: true, read: false, update: false },
        user: { delete: false },
      }))
      .post('/posts', () => ({ success: true }), {
        beforeHandle: permix.checkMiddleware('post.create'),
      })

    const res = await app.handle(new Request('http://localhost/posts', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('should deny access when permission is not granted', async () => {
    const app = new Elysia()
      .onBeforeHandle(permix.setupMiddleware(() => ({
        post: { create: false, read: false, update: false },
        user: { delete: false },
      })))
      .post('/posts', () => ({ success: true }), {
        beforeHandle: permix.checkMiddleware('post.create'),
      })

    const res = await app.handle(new Request('http://localhost/posts', { method: 'POST' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden' })
  })

  it('should work with custom error handler', async () => {
    const permix = createPermix<PermissionsStatement>({
      onForbidden: ({ context }) => {
        context.set.status = 403
        return { error: 'Custom error' }
      },
    })

    const app = new Elysia()
      .onBeforeHandle(permix.setupMiddleware(() => ({
        post: { create: false, read: false, update: false },
        user: { delete: false },
      })))
      .post('/posts', () => ({ success: true }), {
        beforeHandle: permix.checkMiddleware('post.create'),
      })

    const res = await app.handle(new Request('http://localhost/posts', { method: 'POST' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Custom error' })
  })

  it('should work with custom error and params', async () => {
    const permix = createPermix<PermissionsStatement>({
      onForbidden: ({ context, path }) => {
        context.set.status = 403
        return { error: `You do not have permission for ${path}` }
      },
    })

    const app = new Elysia()
      .onBeforeHandle(permix.setupMiddleware(() => ({
        post: { create: false, read: false, update: false },
        user: { delete: false },
      })))
      .post('/posts', () => ({ success: true }), {
        beforeHandle: permix.checkMiddleware('post.create'),
      })

    const res = await app.handle(new Request('http://localhost/posts', { method: 'POST' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'You do not have permission for post.create' })
  })

  it('should pass data through to a rule callback', async () => {
    const permix = createPermix<PostWithData>()

    const app = new Elysia()
      .onBeforeHandle(permix.setupMiddleware({
        post: { create: post => post?.authorId === '1' },
      }))
      .post('/posts', () => ({ success: true }), {
        beforeHandle: permix.checkMiddleware('post.create', { id: 'a', authorId: '1' }),
      })

    const res = await app.handle(new Request('http://localhost/posts', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('should work with checker callback form', async () => {
    const app = new Elysia()
      .onBeforeHandle(permix.setupMiddleware({
        post: { create: true, read: true, update: false },
        user: { delete: true },
      }))
      .post('/posts', () => ({ success: true }), {
        beforeHandle: permix.checkMiddleware(c => c('post.create') && c('user.delete')),
      })

    const res = await app.handle(new Request('http://localhost/posts', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('should work with template', async () => {
    const template = permix.template({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })

    const app = new Elysia()
      .onBeforeHandle(permix.setupMiddleware(() => template()))
      .post('/posts', () => ({ success: true }), {
        beforeHandle: permix.checkMiddleware('post.create'),
      })

    const res = await app.handle(new Request('http://localhost/posts', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('should dehydrate permissions', async () => {
    const template = permix.template({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })

    const app = new Elysia()
      .onBeforeHandle(permix.setupMiddleware(() => template()))
      .get('/dehydrate', context => permix.getOrThrow(context).dehydrate())

    const res = await app.handle(new Request('http://localhost/dehydrate'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })
  })

  it('should let two factories with different keys coexist on the same context', async () => {
    const admin = createPermix<PermissionsStatement>().contextKey('admin')
    const guest = createPermix<PermissionsStatement>().contextKey('guest')

    const app = new Elysia()
      .onBeforeHandle(admin.setupMiddleware(() => ({
        post: { create: true, read: true, update: true },
        user: { delete: true },
      })))
      .onBeforeHandle(guest.setupMiddleware(() => ({
        post: { create: false, read: true, update: false },
        user: { delete: false },
      })))
      .post('/admin', () => ({ scope: 'admin' }), {
        beforeHandle: admin.checkMiddleware('post.create'),
      })
      .post('/guest', () => ({ scope: 'guest' }), {
        beforeHandle: guest.checkMiddleware('post.create'),
      })

    const adminResponse = await app.handle(new Request('http://localhost/admin', { method: 'POST' }))
    expect(adminResponse.status).toBe(200)
    expect(await adminResponse.json()).toEqual({ scope: 'admin' })

    const guestResponse = await app.handle(new Request('http://localhost/guest', { method: 'POST' }))
    expect(guestResponse.status).toBe(403)
    expect(await guestResponse.json()).toEqual({ error: 'Forbidden' })
  })
})

describe('get / getOrThrow', () => {
  const permix = createPermix<PermissionsStatement>()

  it('should return null when setupMiddleware has not run', async () => {
    const app = new Elysia()
      .get('/', context => ({ result: permix.get(context) }))

    const res = await app.handle(new Request('http://localhost/'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ result: null })
  })

  it('should return the instance when setupMiddleware has run', async () => {
    const app = new Elysia()
      .onBeforeHandle(permix.setupMiddleware({
        post: { create: true, read: true, update: true },
        user: { delete: true },
      }))
      .get('/', context => ({ hasCheck: typeof permix.getOrThrow(context).check === 'function' }))

    const res = await app.handle(new Request('http://localhost/'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ hasCheck: true })
  })

  it('getOrThrow should throw PermixNotFoundError when missing', async () => {
    const app = new Elysia()
      .onError(({ error, set }) => {
        if (error instanceof PermixNotFoundError) {
          set.status = 500
          return { error: error.message, name: error.name }
        }
        set.status = 500
        return { error: 'unknown' }
      })
      .get('/', context => permix.getOrThrow(context))

    const res = await app.handle(new Request('http://localhost/'))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      error: '[Permix]: Instance not found. Please use the `setupMiddleware` function.',
      name: 'PermixNotFoundError',
    })
  })
})

describe('checkMiddleware without setupMiddleware', () => {
  it('should throw PermixNotFoundError and reach Elysia error handler', async () => {
    const permix = createPermix<PermissionsStatement>()

    const app = new Elysia()
      .onError(({ error, set }) => {
        if (error instanceof PermixNotFoundError) {
          set.status = 500
          return { error: error.message }
        }
        set.status = 500
        return { error: 'unknown' }
      })
      .post('/posts', () => ({ success: true }), {
        beforeHandle: permix.checkMiddleware('post.create'),
      })

    const res = await app.handle(new Request('http://localhost/posts', { method: 'POST' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      error: '[Permix]: Instance not found. Please use the `setupMiddleware` function.',
    })
  })
})

describe('key exposure', () => {
  it('should expose the key on the factory return', () => {
    const permix = createPermix<PermissionsStatement>().contextKey('custom-key')
    expect(permix.key).toBe('custom-key')
  })

  it('should expose a symbol key when using default', () => {
    const permix = createPermix<PermissionsStatement>()
    expect(typeof permix.key).toBe('symbol')
  })
})
