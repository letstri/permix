import type { ErrorRequestHandler } from 'express'
import type { ValidateStatement } from '../core'
import express from 'express'
import request from 'supertest'
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
    const app = express()

    app.use(permix.setupMiddleware({
      post: { create: true, read: false, update: false },
      user: { delete: false },
    }))

    app.post('/posts', permix.checkMiddleware('post.create'), (req, res) => {
      res.json({ success: true })
    })

    const response = await request(app)
      .post('/posts')
      .send({ title: 'Test Post' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true })
  })

  it('should deny access when permission is not granted', async () => {
    const app = express()

    app.use(permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    }))

    app.post('/posts', permix.checkMiddleware('post.create'), (req, res) => {
      res.json({ success: true })
    })

    const response = await request(app)
      .post('/posts')
      .send({ title: 'Test Post' })

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'Forbidden' })
  })

  it('should work with custom error handler', async () => {
    const permix = createPermix<PermissionsStatement>({
      onForbidden: ({ res }) => {
        res.status(403).json({ error: 'Custom error' })
      },
    })

    const app = express()

    app.use(permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    }))

    app.post('/posts', permix.checkMiddleware('post.create'), (req, res) => {
      res.json({ success: true })
    })

    const response = await request(app)
      .post('/posts')
      .send({ title: 'Test Post' })

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'Custom error' })
  })

  it('should work with custom error and params', async () => {
    const permix = createPermix<PermissionsStatement>({
      onForbidden: ({ res, path }) => {
        res.status(403).json({ error: `You do not have permission for ${path}` })
      },
    })

    const app = express()

    app.use(permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    }))

    app.post('/posts', permix.checkMiddleware('post.create'), (req, res) => {
      res.json({ success: true })
    })

    const response = await request(app)
      .post('/posts')
      .send({ title: 'Test Post' })

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'You do not have permission for post.create' })
  })

  it('should pass data through to a rule callback', async () => {
    const permix = createPermix<PostWithData>()

    const app = express()

    app.use(permix.setupMiddleware({
      post: {
        create: post => post?.authorId === '1',
      },
    }))

    app.post('/posts', permix.checkMiddleware('post.create', { id: 'a', authorId: '1' }), (req, res) => {
      res.json({ success: true })
    })

    const response = await request(app)
      .post('/posts')
      .send({ title: 'Test Post' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true })
  })

  it('should work with checker callback form', async () => {
    const permix = createPermix<PermissionsStatement>()

    const app = express()

    app.use(permix.setupMiddleware({
      post: { create: true, read: true, update: false },
      user: { delete: true },
    }))

    app.post('/posts', permix.checkMiddleware(c => c('post.create') && c('user.delete')), (req, res) => {
      res.json({ success: true })
    })

    const response = await request(app)
      .post('/posts')
      .send({ title: 'Test Post' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true })
  })

  it('should work with template', async () => {
    const template = permix.template({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })

    const app = express()

    app.use(permix.setupMiddleware(() => template()))

    app.post('/posts', permix.checkMiddleware('post.create'), (req, res) => {
      res.json({ success: true })
    })

    const response = await request(app)
      .post('/posts')
      .send({ title: 'Test Post' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true })
  })

  it('should dehydrate permissions', async () => {
    const template = permix.template({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })

    const app = express()
    app.use(permix.setupMiddleware(() => template()))

    app.get('/dehydrate', (req, res) => {
      res.json(permix.getOrThrow(req).dehydrate())
    })

    const response = await request(app).get('/dehydrate')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })
  })

  it('should let two factories with different keys coexist on the same request', async () => {
    const admin = createPermix<PermissionsStatement>().contextKey('admin')
    const guest = createPermix<PermissionsStatement>().contextKey('guest')

    const app = express()

    app.use(admin.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    }))
    app.use(guest.setupMiddleware({
      post: { create: false, read: true, update: false },
      user: { delete: false },
    }))

    app.post('/admin', admin.checkMiddleware('post.create'), (req, res) => {
      res.json({ scope: 'admin' })
    })
    app.post('/guest', guest.checkMiddleware('post.create'), (req, res) => {
      res.json({ scope: 'guest' })
    })

    const adminResponse = await request(app).post('/admin')
    expect(adminResponse.status).toBe(200)
    expect(adminResponse.body).toEqual({ scope: 'admin' })

    const guestResponse = await request(app).post('/guest')
    expect(guestResponse.status).toBe(403)
    expect(guestResponse.body).toEqual({ error: 'Forbidden' })
  })

  it('should default to a per-instance symbol so two factories without a key do not collide', async () => {
    const first = createPermix<PermissionsStatement>()
    const second = createPermix<PermissionsStatement>()

    const app = express()

    app.use(first.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    }))
    app.use(second.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    }))

    app.post('/first', first.checkMiddleware('post.create'), (req, res) => {
      res.json({ ok: true })
    })
    app.post('/second', second.checkMiddleware('post.create'), (req, res) => {
      res.json({ ok: true })
    })

    const firstResponse = await request(app).post('/first')
    expect(firstResponse.status).toBe(200)

    const secondResponse = await request(app).post('/second')
    expect(secondResponse.status).toBe(403)
  })

  it('should accept an explicit symbol key', async () => {
    const key = Symbol('my-permix')
    const permix = createPermix<PermissionsStatement>().contextKey(key)

    const app = express()

    app.use(permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    }))

    app.get('/probe', (req, res) => {
      res.json({ attached: Boolean((req as any)[key]) })
    })

    const response = await request(app).get('/probe')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ attached: true })
  })
})

describe('get / getOrThrow', () => {
  const permix = createPermix<PermissionsStatement>()

  it('should return null when setupMiddleware has not run', async () => {
    const app = express()

    app.get('/', (req, res) => {
      const p = permix.get(req)
      res.json({ result: p })
    })

    const response = await request(app).get('/')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ result: null })
  })

  it('should return the instance when setupMiddleware has run', async () => {
    const app = express()

    app.use(permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    }))

    app.get('/', (req, res) => {
      const p = permix.getOrThrow(req)
      res.json({ hasCheck: typeof p.check === 'function' })
    })

    const response = await request(app).get('/')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ hasCheck: true })
  })

  it('getOrThrow should throw PermixNotFoundError when missing', async () => {
    const app = express()

    app.get('/', (req, _res) => {
      permix.getOrThrow(req)
    })

    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
      if (err instanceof PermixNotFoundError) {
        res.status(500).json({ error: err.message, name: err.name })
        return
      }
      res.status(500).json({ error: 'unknown' })
    }
    app.use(errorHandler)

    const response = await request(app).get('/')
    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: '[Permix]: Instance not found. Please use the `setupMiddleware` function.',
      name: 'PermixNotFoundError',
    })
  })
})

describe('checkMiddleware without setupMiddleware', () => {
  it('should call next(PermixNotFoundError) and reach Express error middleware', async () => {
    const permix = createPermix<PermissionsStatement>()

    const app = express()

    app.post('/posts', permix.checkMiddleware('post.create'), (req, res) => {
      res.json({ success: true })
    })

    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
      if (err instanceof PermixNotFoundError) {
        res.status(500).json({ error: err.message })
        return
      }
      res.status(500).json({ error: 'unknown' })
    }
    app.use(errorHandler)

    const response = await request(app).post('/posts')
    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: '[Permix]: Instance not found. Please use the `setupMiddleware` function.',
    })
  })
})

describe('onForbidden receives next', () => {
  it('should allow onForbidden to forward to Express error middleware via next(err)', async () => {
    const permix = createPermix<PermissionsStatement>({
      onForbidden: ({ next, path }) => {
        next(new Error(`Forbidden: ${path}`))
      },
    })

    const app = express()

    app.use(permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    }))

    app.post('/posts', permix.checkMiddleware('post.create'), (req, res) => {
      res.json({ success: true })
    })

    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
      res.status(403).json({ customError: err.message })
    }
    app.use(errorHandler)

    const response = await request(app).post('/posts')
    expect(response.status).toBe(403)
    expect(response.body).toEqual({ customError: 'Forbidden: post.create' })
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
