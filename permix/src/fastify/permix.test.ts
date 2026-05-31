import type { ValidateStatement } from '../core'
import Fastify from 'fastify'
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
    const app = Fastify()

    await app.register(permix.setupMiddleware({
      post: { create: true, read: false, update: false },
      user: { delete: false },
    }))

    app.post('/posts', { preHandler: permix.checkMiddleware('post.create') }, (req, reply) => {
      reply.send({ success: true })
    })

    const response = await app.inject({ method: 'POST', url: '/posts' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ success: true })
  })

  it('should deny access when permission is not granted', async () => {
    const app = Fastify()

    await app.register(permix.setupMiddleware(() => ({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })))

    app.post('/posts', { preHandler: permix.checkMiddleware('post.create') }, (req, reply) => {
      reply.send({ success: true })
    })

    const response = await app.inject({ method: 'POST', url: '/posts' })
    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({ error: 'Forbidden' })
  })

  it('should work with custom error handler', async () => {
    const permix = createPermix<PermissionsStatement>({
      onForbidden: ({ reply }) => {
        reply.status(403).send({ error: 'Custom error' })
      },
    })

    const app = Fastify()

    await app.register(permix.setupMiddleware(() => ({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })))

    app.post('/posts', { preHandler: permix.checkMiddleware('post.create') }, (req, reply) => {
      reply.send({ success: true })
    })

    const response = await app.inject({ method: 'POST', url: '/posts' })
    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({ error: 'Custom error' })
  })

  it('should work with custom error and params', async () => {
    const permix = createPermix<PermissionsStatement>({
      onForbidden: ({ reply, path }) => {
        reply.status(403).send({ error: `You do not have permission for ${path}` })
      },
    })

    const app = Fastify()

    await app.register(permix.setupMiddleware(() => ({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })))

    app.post('/posts', { preHandler: permix.checkMiddleware('post.create') }, (req, reply) => {
      reply.send({ success: true })
    })

    const response = await app.inject({ method: 'POST', url: '/posts' })
    expect(response.statusCode).toBe(403)
    expect(response.json()).toEqual({ error: 'You do not have permission for post.create' })
  })

  it('should pass data through to a rule callback', async () => {
    const permix = createPermix<PostWithData>()

    const app = Fastify()

    await app.register(permix.setupMiddleware({
      post: { create: post => post?.authorId === '1' },
    }))

    app.post('/posts', { preHandler: permix.checkMiddleware('post.create', { id: 'a', authorId: '1' }) }, (req, reply) => {
      reply.send({ success: true })
    })

    const response = await app.inject({ method: 'POST', url: '/posts' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ success: true })
  })

  it('should work with checker callback form', async () => {
    const permix = createPermix<PermissionsStatement>()

    const app = Fastify()

    await app.register(permix.setupMiddleware({
      post: { create: true, read: true, update: false },
      user: { delete: true },
    }))

    app.post('/posts', { preHandler: permix.checkMiddleware(c => c('post.create') && c('user.delete')) }, (req, reply) => {
      reply.send({ success: true })
    })

    const response = await app.inject({ method: 'POST', url: '/posts' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ success: true })
  })

  it('should work with template', async () => {
    const template = permix.template({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })

    const app = Fastify()

    await app.register(permix.setupMiddleware(() => template()))

    app.post('/posts', { preHandler: permix.checkMiddleware('post.create') }, (req, reply) => {
      reply.send({ success: true })
    })

    const response = await app.inject({ method: 'POST', url: '/posts' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ success: true })
  })

  it('should dehydrate permissions', async () => {
    const template = permix.template({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })

    const app = Fastify()
    await app.register(permix.setupMiddleware(() => template()))

    app.get('/dehydrate', (req, reply) => {
      reply.send(permix.getOrThrow(req).dehydrate())
    })

    const response = await app.inject({ method: 'GET', url: '/dehydrate' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })
  })

  it('should let two factories with different keys coexist on the same request', async () => {
    const admin = createPermix<PermissionsStatement>().contextKey('admin')
    const guest = createPermix<PermissionsStatement>().contextKey('guest')

    const app = Fastify()

    await app.register(admin.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    }))
    await app.register(guest.setupMiddleware({
      post: { create: false, read: true, update: false },
      user: { delete: false },
    }))

    app.post('/admin', { preHandler: admin.checkMiddleware('post.create') }, (req, reply) => {
      reply.send({ scope: 'admin' })
    })
    app.post('/guest', { preHandler: guest.checkMiddleware('post.create') }, (req, reply) => {
      reply.send({ scope: 'guest' })
    })

    const adminResponse = await app.inject({ method: 'POST', url: '/admin' })
    expect(adminResponse.statusCode).toBe(200)
    expect(adminResponse.json()).toEqual({ scope: 'admin' })

    const guestResponse = await app.inject({ method: 'POST', url: '/guest' })
    expect(guestResponse.statusCode).toBe(403)
    expect(guestResponse.json()).toEqual({ error: 'Forbidden' })
  })
})

describe('get / getOrThrow', () => {
  const permix = createPermix<PermissionsStatement>()

  it('should return null when setupMiddleware has not run', async () => {
    const app = Fastify()

    app.get('/', (req, reply) => {
      reply.send({ result: permix.get(req) })
    })

    const response = await app.inject({ method: 'GET', url: '/' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ result: null })
  })

  it('should return the instance when setupMiddleware has run', async () => {
    const app = Fastify()

    await app.register(permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    }))

    app.get('/', (req, reply) => {
      reply.send({ hasCheck: typeof permix.getOrThrow(req).check === 'function' })
    })

    const response = await app.inject({ method: 'GET', url: '/' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ hasCheck: true })
  })

  it('getOrThrow should throw PermixNotFoundError when missing', async () => {
    const app = Fastify()

    app.setErrorHandler((error, req, reply) => {
      if (error instanceof PermixNotFoundError) {
        reply.status(500).send({ error: error.message, name: error.name })
        return
      }
      reply.status(500).send({ error: 'unknown' })
    })

    app.get('/', (req) => {
      permix.getOrThrow(req)
    })

    const response = await app.inject({ method: 'GET', url: '/' })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
      error: '[Permix]: Instance not found. Please use the `setupMiddleware` function.',
      name: 'PermixNotFoundError',
    })
  })
})

describe('checkMiddleware without setupMiddleware', () => {
  it('should throw PermixNotFoundError and reach Fastify error handler', async () => {
    const permix = createPermix<PermissionsStatement>()

    const app = Fastify()

    app.setErrorHandler((error, req, reply) => {
      if (error instanceof PermixNotFoundError) {
        reply.status(500).send({ error: error.message })
        return
      }
      reply.status(500).send({ error: 'unknown' })
    })

    app.post('/posts', { preHandler: permix.checkMiddleware('post.create') }, (req, reply) => {
      reply.send({ success: true })
    })

    const response = await app.inject({ method: 'POST', url: '/posts' })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
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
