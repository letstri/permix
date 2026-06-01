import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ValidateDefinition } from '../core'
import { describe, expect, it, vi } from 'vitest'
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

function createMockRequest(): IncomingMessage {
  return {} as IncomingMessage
}

function createMockResponse(): ServerResponse<IncomingMessage> {
  return {
    statusCode: 200,
    setHeader: vi.fn(),
    end: vi.fn(),
    getHeader: vi.fn(),
    writeHead: vi.fn(),
  } as unknown as ServerResponse<IncomingMessage>
}

function createMockNext() {
  return vi.fn()
}

describe('createPermix', () => {
  const permix = createPermix<PermissionsDefinition>()

  it('should throw ts error', () => {
    // @ts-expect-error path does not exist
    permix.checkMiddleware('post.delete')
  })

  it('should allow access when permission is granted', async () => {
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: true, read: false, update: false },
      user: { delete: false },
    })(req, res, next)

    await permix.checkMiddleware('post.create')(req, res, next)

    expect(res.statusCode).toBe(200)
    expect(next).toHaveBeenCalledTimes(2)
    expect(next).toHaveBeenLastCalledWith()
  })

  it('should deny access when permission is not granted', async () => {
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })(req, res, next)

    await permix.checkMiddleware('post.create')(req, res, next)

    expect(res.statusCode).toBe(403)
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Forbidden' }))
  })

  it('should work with custom error handler', async () => {
    const permix = createPermix<PermissionsDefinition>({
      onForbidden: ({ res }) => {
        res.statusCode = 403
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Custom error' }))
      },
    })

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })(req, res, next)

    await permix.checkMiddleware('post.create')(req, res, next)

    expect(res.statusCode).toBe(403)
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Custom error' }))
  })

  it('should work with custom error and params', async () => {
    const permix = createPermix<PermissionsDefinition>({
      onForbidden: ({ res, path }) => {
        res.statusCode = 403
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: `You do not have permission for ${path}` }))
      },
    })

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })(req, res, next)

    await permix.checkMiddleware('post.create')(req, res, next)

    expect(res.statusCode).toBe(403)
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'You do not have permission for post.create' }))
  })

  it('should pass data through to a rule callback', async () => {
    const permix = createPermix<PostWithData>()

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: {
        create: post => post?.authorId === '1',
      },
    })(req, res, next)

    await permix.checkMiddleware('post.create', { id: 'a', authorId: '1' })(req, res, next)

    expect(res.statusCode).toBe(200)
  })

  it('should work with checker callback form', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: true, read: true, update: false },
      user: { delete: true },
    })(req, res, next)

    await permix.checkMiddleware(c => c('post.create') && c('user.delete'))(req, res, next)

    expect(res.statusCode).toBe(200)
  })

  it('should work with template', async () => {
    const template = permix.template({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.setupMiddleware(() => template())(req, res, next)

    await permix.checkMiddleware('post.create')(req, res, next)

    expect(res.statusCode).toBe(200)
  })

  it('should dehydrate permissions', async () => {
    const template = permix.template({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.setupMiddleware(() => template())(req, res, next)

    expect(permix.getOrThrow(req).dehydrate()).toEqual({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })
  })

  it('should let two factories with different keys coexist on the same request', async () => {
    const admin = createPermix<PermissionsDefinition>().contextKey('admin')
    const guest = createPermix<PermissionsDefinition>().contextKey('guest')

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await admin.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(req, res, next)
    await guest.setupMiddleware({
      post: { create: false, read: true, update: false },
      user: { delete: false },
    })(req, res, next)

    const adminRes = createMockResponse()
    const adminNext = createMockNext()
    await admin.checkMiddleware('post.create')(req, adminRes, adminNext)
    expect(adminRes.statusCode).toBe(200)
    expect(adminNext).toHaveBeenCalledWith()

    const guestRes = createMockResponse()
    const guestNext = createMockNext()
    await guest.checkMiddleware('post.create')(req, guestRes, guestNext)
    expect(guestRes.statusCode).toBe(403)
    expect(guestNext).not.toHaveBeenCalled()
  })

  it('should default to a per-instance symbol so two factories without a key do not collide', async () => {
    const first = createPermix<PermissionsDefinition>()
    const second = createPermix<PermissionsDefinition>()

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await first.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(req, res, next)
    await second.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })(req, res, next)

    const firstRes = createMockResponse()
    const firstNext = createMockNext()
    await first.checkMiddleware('post.create')(req, firstRes, firstNext)
    expect(firstRes.statusCode).toBe(200)

    const secondRes = createMockResponse()
    const secondNext = createMockNext()
    await second.checkMiddleware('post.create')(req, secondRes, secondNext)
    expect(secondRes.statusCode).toBe(403)
  })

  it('should accept an explicit symbol key', async () => {
    const key = Symbol('my-permix')
    const permix = createPermix<PermissionsDefinition>().contextKey(key)

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(req, res, next)

    expect(Boolean((req as any)[key])).toBe(true)
  })
})

describe('get / getOrThrow', () => {
  const permix = createPermix<PermissionsDefinition>()

  it('should return null when setupMiddleware has not run', () => {
    const req = createMockRequest()
    expect(permix.get(req)).toBeNull()
  })

  it('should return the instance when setupMiddleware has run', async () => {
    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })(req, res, next)

    const p = permix.getOrThrow(req)
    expect(typeof p.check).toBe('function')
  })

  it('getOrThrow should throw PermixNotFoundError when missing', () => {
    const req = createMockRequest()
    expect(() => permix.getOrThrow(req)).toThrow(PermixNotFoundError)
  })
})

describe('checkMiddleware without setupMiddleware', () => {
  it('should call next(PermixNotFoundError)', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.checkMiddleware('post.create')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(next.mock.calls[0][0]).toBeInstanceOf(PermixNotFoundError)
  })
})

describe('onForbidden receives next', () => {
  it('should allow onForbidden to forward errors via next(err)', async () => {
    const permix = createPermix<PermissionsDefinition>({
      onForbidden: ({ next, path }) => {
        next(new Error(`Forbidden: ${path}`))
      },
    })

    const req = createMockRequest()
    const res = createMockResponse()
    const next = createMockNext()

    await permix.setupMiddleware({
      post: { create: false, read: false, update: false },
      user: { delete: false },
    })(req, res, next)

    await permix.checkMiddleware('post.create')(req, res, next)

    expect(next).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Forbidden: post.create' }))
  })
})

describe('key exposure', () => {
  it('should expose the key on the factory return', () => {
    const permix = createPermix<PermissionsDefinition>().contextKey('custom-key')
    expect(permix.key).toBe('custom-key')
  })

  it('should expose a symbol key when using default', () => {
    const permix = createPermix<PermissionsDefinition>()
    expect(typeof permix.key).toBe('symbol')
  })
})
