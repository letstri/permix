import type { PermixDefinition } from '../core/create-permix'
import { Elysia, t } from 'elysia'
import { describe, expect, it } from 'vitest'
import { createPermix } from './create-permix'

interface Post {
  id: string
  authorId: string
}

type Definition = PermixDefinition<{
  post: {
    dataType: Post
    action: 'create' | 'read' | 'update'
  }
  user: {
    action: 'delete'
  }
}>

describe('createPermix', () => {
  const permix = createPermix<Definition>()

  it('should throw ts error', () => {
    // @ts-expect-error should throw
    permix.checkHandler('post', 'delete')
  })

  it('should allow access when permission is granted', async () => {
    const app = new Elysia()
      .derive(() => permix.derive({
        post: {
          create: true,
          read: false,
          update: false,
        },
        user: {
          delete: false,
        },
      }))
      .post('/posts', () => ({
        success: true,
      }), {
        beforeHandle: permix.checkHandler('post', 'create'),
      })

    const response = await app.handle(new Request('http://localhost/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Post' }),
    }))

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body).toEqual({ success: true })
  })

  it('should deny access when permission is not granted', async () => {
    const app = new Elysia()
      .derive(() => permix.derive({
        post: {
          create: false,
          read: false,
          update: false,
        },
        user: {
          delete: false,
        },
      }))
      .post('/posts', () => ({
        success: true,
      }), {
        beforeHandle: permix.checkHandler('post', 'create'),
      })

    const response = await app.handle(new Request('http://localhost/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Post' }),
    }))

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body).toEqual({ error: 'Forbidden' })
  })

  it('should work with custom error handler', async () => {
    const permix = createPermix<Definition>({
      onForbidden: ({ context }) => {
        context.set.status = 403
        return { error: 'Custom error' }
      },
    })

    const app = new Elysia()
      .derive(() => permix.derive({
        post: {
          create: false,
          read: false,
          update: false,
        },
        user: {
          delete: false,
        },
      }))
      .post('/posts', () => ({
        success: true,
      }), {
        beforeHandle: permix.checkHandler('post', 'create'),
      })

    const response = await app.handle(new Request('http://localhost/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Post' }),
    }))

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body).toEqual({ error: 'Custom error' })
  })

  it('should work with custom error and params', async () => {
    const permix = createPermix<Definition>({
      onForbidden: ({ context, entity, actions }) => {
        context.set.status = 403
        return { error: `You do not have permission to ${actions.join('/')} a ${entity}` }
      },
    })

    const app = new Elysia()
      .derive(() => permix.derive({
        post: {
          create: false,
          read: false,
          update: false,
        },
        user: {
          delete: false,
        },
      }))
      .post('/posts', () => ({
        success: true,
      }), {
        beforeHandle: permix.checkHandler('post', 'create'),
      })

    const response = await app.handle(new Request('http://localhost/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Post' }),
    }))

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body).toEqual({ error: 'You do not have permission to create a post' })
  })

  it('should save permix instance in context', async () => {
    const app = new Elysia()
      .derive(() => permix.derive({
        post: {
          create: true,
          read: false,
          update: false,
        },
        user: {
          delete: false,
        },
      }))
      .get('/', ({ permix }) => ({
        success: permix.check('post', 'create'),
      }))

    const response = await app.handle(new Request('http://localhost/'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ success: true })
  })

  it('should work with template', async () => {
    const template = permix.template({
      post: {
        create: true,
        read: true,
        update: true,
      },
      user: {
        delete: true,
      },
    })

    const app = new Elysia()
      .derive(() => permix.derive(template()))
      .post('/posts', () => ({
        success: true,
      }), {
        beforeHandle: permix.checkHandler('post', 'create'),
      })

    const response = await app.handle(new Request('http://localhost/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Post' }),
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ success: true })
  })

  it('should typecheck with schema-validated query (regression #33)', async () => {
    const app = new Elysia()
      .derive(() => permix.derive({
        post: {
          create: true,
          read: false,
          update: false,
        },
        user: {
          delete: false,
        },
      }))
      .get('/posts', ({ query }) => ({ page: query.page }), {
        query: t.Object({
          page: t.Numeric({ default: 1 }),
        }),
        beforeHandle: permix.checkHandler('post', 'create'),
      })

    const response = await app.handle(new Request('http://localhost/posts?page=2'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ page: 2 })
  })

  it('should dehydrate permissions', async () => {
    const template = permix.template({
      post: {
        create: true,
        read: false,
        update: true,
      },
      user: {
        delete: false,
      },
    })

    const app = new Elysia()
      .derive(() => permix.derive(template()))
      .get('/dehydrate', ({ permix }) => permix.dehydrate())

    const response = await app.handle(new Request('http://localhost/dehydrate'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      post: {
        create: true,
        read: false,
        update: true,
      },
      user: {
        delete: false,
      },
    })
  })
})
