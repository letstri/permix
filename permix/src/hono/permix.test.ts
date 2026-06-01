import type { ValidateDefinition } from '../core'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
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
  post: [{ name: 'create', type: Post }]
}>

describe('createPermix', () => {
  const permix = createPermix<PermissionsDefinition>()

  it('should throw ts error', () => {
    // @ts-expect-error path does not exist
    permix.checkMiddleware('post.delete')
  })

  it('should allow access when permission is granted', async () => {
    const app = new Hono()

    app.use(permix.setupMiddleware({
      post: { create: true, read: false, update: false },
      user: { delete: false },
    }))

    app.post('/posts', permix.checkMiddleware('post.create'), c => c.json({ success: true }))

    const res = await app.request('/posts', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('should deny access when permission is not granted', async () => {
    const app = new Hono()

    app.use('*', permix.setupMiddleware(() => ({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })))

    app.post('/posts', permix.checkMiddleware('post.create'), c => c.json({ success: true }))

    const res = await app.request('/posts', { method: 'POST' })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden' })
  })

  it('should work with custom error handler', async () => {
    const permix = createPermix<PermissionsDefinition>({
      onForbidden: ({ c }) => c.json({ error: 'Custom error' }, 403),
    })

    const app = new Hono()

    app.use('*', permix.setupMiddleware(() => ({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })))

    app.post('/posts', permix.checkMiddleware('post.create'), c => c.json({ success: true }))

    const res = await app.request('/posts', { method: 'POST' })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Custom error' })
  })

  it('should work with custom error and params', async () => {
    const permix = createPermix<PermissionsDefinition>({
      onForbidden: ({ c, path }) => c.json({ error: `You do not have permission for ${path}` }, 403),
    })

    const app = new Hono()

    app.use('*', permix.setupMiddleware(() => ({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })))

    app.post('/posts', permix.checkMiddleware('post.create'), c => c.json({ success: true }))

    const res = await app.request('/posts', { method: 'POST' })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'You do not have permission for post.create' })
  })

  it('should pass data through to a rule callback', async () => {
    const permix = createPermix<PostWithData>()

    const app = new Hono()

    app.use(permix.setupMiddleware({
      post: { create: post => post?.authorId === '1' },
    }))

    app.post(
      '/posts',
      permix.checkMiddleware('post.create', { id: 'a', authorId: '1' }),
      c => c.json({ success: true }),
    )

    const res = await app.request('/posts', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('should work with checker callback form', async () => {
    const app = new Hono()

    app.use(permix.setupMiddleware({
      post: { create: true, read: true, update: false },
      user: { delete: true },
    }))

    app.post(
      '/posts',
      permix.checkMiddleware(c => c('post.create') && c('user.delete')),
      c => c.json({ success: true }),
    )

    const res = await app.request('/posts', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('should work with template', async () => {
    const template = permix.template({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })

    const app = new Hono()

    app.use(permix.setupMiddleware(() => template()))

    app.post('/posts', permix.checkMiddleware('post.create'), c => c.json({ success: true }))

    const res = await app.request('/posts', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('should dehydrate permissions', async () => {
    const template = permix.template({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })

    const app = new Hono()
    app.use(permix.setupMiddleware(() => template()))

    app.get('/dehydrate', c => c.json(permix.getOrThrow(c).dehydrate()))

    const res = await app.request('/dehydrate')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })
  })

  it('should let two factories with different keys coexist on the same context', async () => {
    const admin = createPermix<PermissionsDefinition>().contextKey('admin')
    const guest = createPermix<PermissionsDefinition>().contextKey('guest')

    const app = new Hono()

    app.use(admin.setupMiddleware(() => ({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })))
    app.use(guest.setupMiddleware(() => ({
      post: { create: false, read: true, update: false },
      user: { delete: false },
    })))

    app.post('/admin', admin.checkMiddleware('post.create'), c => c.json({ scope: 'admin' }))
    app.post('/guest', guest.checkMiddleware('post.create'), c => c.json({ scope: 'guest' }))

    const adminResponse = await app.request('/admin', { method: 'POST' })
    expect(adminResponse.status).toBe(200)
    expect(await adminResponse.json()).toEqual({ scope: 'admin' })

    const guestResponse = await app.request('/guest', { method: 'POST' })
    expect(guestResponse.status).toBe(403)
    expect(await guestResponse.json()).toEqual({ error: 'Forbidden' })
  })
})

describe('get / getOrThrow', () => {
  const permix = createPermix<PermissionsDefinition>()

  it('should return null when setupMiddleware has not run', async () => {
    const app = new Hono()

    app.get('/', c => c.json({ result: permix.get(c) }))

    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ result: null })
  })

  it('should return the instance when setupMiddleware has run', async () => {
    const app = new Hono()

    app.use(permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    }))

    app.get('/', (c) => {
      const p = permix.getOrThrow(c)
      return c.json({ hasCheck: typeof p.check === 'function' })
    })

    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ hasCheck: true })
  })

  it('getOrThrow should throw PermixNotFoundError when missing', async () => {
    const app = new Hono()

    app.get('/', (c) => {
      permix.getOrThrow(c)
      return c.json({ ok: true })
    })

    app.onError((err, c) => {
      if (err instanceof PermixNotFoundError) {
        return c.json({ error: err.message, name: err.name }, 500)
      }
      return c.json({ error: 'unknown' }, 500)
    })

    const res = await app.request('/')
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      error: '[Permix]: Instance not found. Please use the `setupMiddleware` function.',
      name: 'PermixNotFoundError',
    })
  })
})

describe('checkMiddleware without setupMiddleware', () => {
  it('should throw PermixNotFoundError and reach Hono error middleware', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const app = new Hono()

    app.post('/posts', permix.checkMiddleware('post.create'), c => c.json({ success: true }))

    app.onError((err, c) => {
      if (err instanceof PermixNotFoundError) {
        return c.json({ error: err.message }, 500)
      }
      return c.json({ error: 'unknown' }, 500)
    })

    const res = await app.request('/posts', { method: 'POST' })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      error: '[Permix]: Instance not found. Please use the `setupMiddleware` function.',
    })
  })
})
