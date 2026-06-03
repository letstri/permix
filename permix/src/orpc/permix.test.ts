import type { ValidateDefinition } from '../core'
import { ORPCError, os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createPermix } from './permix'

interface Context {
  user: {
    id: string
  }
}

type Def = ValidateDefinition<{
  post: ['create', 'read', 'update']
  user: ['delete']
}>

function createRequest(path: string, body: any = {}) {
  return new Request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('createPermix', () => {
  const orpcPermix = os.$context<Context>()

  const permix = createPermix<Def>().contextKey('someCustomName')

  it('should throw ts error for invalid path', () => {
    // @ts-expect-error invalid permission path
    permix.checkMiddleware('post.delete')
  })

  it('should check with ctx', async () => {
    const router = orpcPermix.router({
      createPost: orpcPermix
        .use(({ next }) => {
          return next({
            context: permix.setupContext({
              post: { create: true, read: true, update: true },
              user: { delete: true },
            }),
          })
        })
        .use(permix.checkMiddleware('post.create'))
        .handler(({ context }) => {
          return { success: context.someCustomName.check('post.create') }
        }),
    })

    const result = await new RPCHandler(router).handle(createRequest('/createPost'), {
      context: { user: { id: '1' } },
    })
    expect(result.response?.status).toEqual(200)
    expect(await result.response?.json()).toEqual({ json: { success: true } })
  })

  it('should throw if called without setup', async () => {
    const router = orpcPermix.router({
      // @ts-expect-error ctx.someCustomName does not exist
      createPost: orpcPermix
        // @ts-expect-error ctx.someCustomName does not exist
        .use(permix.checkMiddleware('post.create'))
        .handler(() => {
          return { success: true }
        }),
    })

    const handler = new RPCHandler(router)
    const result = await handler.handle(createRequest('/createPost'), {
      context: { user: { id: '1' } },
    })

    expect(result.response?.status).toEqual(500)
  })

  it('should allow access when permission is defined', async () => {
    const protectedMiddleware = orpcPermix
      .use(({ next }) => {
        return next({
          context: permix.setupContext({
            post: { create: true, read: true, update: true },
            user: { delete: true },
          }),
        })
      })

    const router = orpcPermix.router({
      createPost: protectedMiddleware
        .use(permix.checkMiddleware('post.create'))
        .handler(({ context }) => {
          context.someCustomName.check('post.update')
          return { success: true }
        }),
    })

    const handler = new RPCHandler(router)
    const result = await handler.handle(createRequest('/createPost'), {
      context: { user: { id: '1' } },
    })

    expect(result.response?.status).toEqual(200)
    expect(await result.response?.json()).toEqual({ json: { success: true } })
  })

  it('should allow access by context', async () => {
    const protectedMiddleware = orpcPermix
      .use(({ context, next }) => {
        return next({
          context: permix.setupContext({
            post: {
              create: context.user.id === '1',
              read: context.user.id === '1',
              update: context.user.id === '1',
            },
            user: {
              delete: context.user.id === '1',
            },
          }),
        })
      })

    const router = orpcPermix.router({
      createPost: protectedMiddleware
        .use(permix.checkMiddleware('post.create'))
        .handler(() => {
          return { success: true }
        }),
    })

    const handler = new RPCHandler(router)
    const result = await handler.handle(createRequest('/createPost'), {
      context: { user: { id: '1' } },
    })

    expect(result.response?.status).toEqual(200)
    expect(await result.response?.json()).toEqual({ json: { success: true } })

    const result2 = await handler.handle(createRequest('/createPost'), {
      context: { user: { id: '2' } },
    })

    expect(result2.response?.status).toEqual(403)
  })

  it('should deny access when permission is not granted', async () => {
    const protectedMiddleware = orpcPermix
      .use(({ next }) => {
        return next({
          context: permix.setupContext({
            post: { create: false, read: false, update: false },
            user: { delete: false },
          }),
        })
      })

    const router = orpcPermix.router({
      createPost: protectedMiddleware
        .use(permix.checkMiddleware('post.create'))
        .handler(() => {
          return { success: true }
        }),
    })

    const handler = new RPCHandler(router)
    const result = await handler.handle(createRequest('/createPost'), {
      context: { user: { id: '1' } },
    })

    expect(result.response?.status).toEqual(403)
  })

  it('should work with custom onForbidden that throws', async () => {
    const permix = createPermix<Def>({
      onForbidden: ({ path }) => {
        throw new ORPCError('FORBIDDEN', {
          message: `No access to ${path}`,
        })
      },
    })

    const protectedMiddleware = orpcPermix
      .use(({ next }) => {
        return next({
          context: permix.setupContext({
            post: { create: false, read: false, update: false },
            user: { delete: false },
          }),
        })
      })

    const router = orpcPermix.router({
      createPost: protectedMiddleware
        .use(permix.checkMiddleware('post.create'))
        .handler(() => {
          return { success: true }
        }),
    })

    const handler = new RPCHandler(router)
    const result = await handler.handle(createRequest('/createPost'), {
      context: { user: { id: '1' } },
    })

    expect(result.response?.status).toEqual(403)
    expect(await result.response?.json()).toEqual({
      json: {
        code: 'FORBIDDEN',
        defined: false,
        message: 'No access to post.create',
        status: 403,
      },
    })
  })

  it('should work with onForbidden that allows through via next()', async () => {
    const permix = createPermix<Def>({
      onForbidden: ({ next }) => next(),
    }).contextKey('someCustomName')

    const protectedMiddleware = orpcPermix
      .use(({ next }) => {
        return next({
          context: permix.setupContext({
            post: { create: false, read: false, update: false },
            user: { delete: false },
          }),
        })
      })

    const router = orpcPermix.router({
      createPost: protectedMiddleware
        .use(permix.checkMiddleware('post.create'))
        .handler(() => {
          return { success: true }
        }),
    })

    const handler = new RPCHandler(router)
    const result = await handler.handle(createRequest('/createPost'), {
      context: { user: { id: '1' } },
    })

    expect(result.response?.status).toEqual(200)
    expect(await result.response?.json()).toEqual({ json: { success: true } })
  })

  it('should chain multiple permissions', async () => {
    const protectedMiddleware = orpcPermix
      .use(({ next }) => {
        return next({
          context: permix.setupContext({
            post: { create: true, read: true, update: true },
            user: { delete: true },
          }),
        })
      })

    const router = orpcPermix.router({
      createAndReadPost: protectedMiddleware
        .use(permix.checkMiddleware(c => c('post.create') && c('post.read')))
        .handler(() => {
          return { success: true }
        }),
    })

    const handler = new RPCHandler(router)
    const result = await handler.handle(createRequest('/createAndReadPost'), {
      context: { user: { id: '1' } },
    })

    expect(result.response?.status).toEqual(200)
    expect(await result.response?.json()).toEqual({ json: { success: true } })
  })

  it('should save types for context and input', async () => {
    const protectedMiddleware = orpcPermix
      .use(({ next }) => {
        return next({
          context: permix.setupContext({
            post: { create: true, read: true, update: true },
            user: { delete: true },
          }),
        })
      })

    const router = orpcPermix.router({
      createAndReadPost: protectedMiddleware
        .use(permix.checkMiddleware('post.read'))
        .input(z.object({
          userId: z.string(),
        }))
        .handler(({ context, input }) => {
          return {
            // @ts-expect-error user.id is string
            userId: context.user.id * 1,
            // @ts-expect-error userId is string
            inputUserId: input.userId * 1,
          }
        }),
    })

    const handler = new RPCHandler(router)
    const result = await handler.handle(createRequest('/createAndReadPost', {
      json: { userId: '1' },
    }), {
      context: { user: { id: '1' } },
    })

    expect(await result.response?.json()).toEqual({
      json: {
        userId: 1,
        inputUserId: 1,
      },
    })
  })

  it('should work with template', async () => {
    const template = permix.template({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })

    const router = orpcPermix.router({
      createPost: orpcPermix
        .use(({ next }) => {
          return next({ context: permix.setupContext(template()) })
        })
        .use(permix.checkMiddleware('post.create'))
        .handler(({ context }) => {
          return { success: context.someCustomName.check('post.create') }
        }),
    })

    const result = await new RPCHandler(router).handle(createRequest('/createPost'), {
      context: { user: { id: '1' } },
    })
    expect(result.response?.status).toEqual(200)
    expect(await result.response?.json()).toEqual({ json: { success: true } })
  })

  it('should dehydrate permissions', async () => {
    const template = permix.template({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })

    const p = permix.setupContext(template())
    const dehydrated = p.someCustomName.dehydrate()

    expect(dehydrated).toEqual({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })
  })

  it('should work with default key', async () => {
    const permix = createPermix<Def>()

    const protectedMiddleware = orpcPermix
      .use(({ next }) => {
        return next({ context: permix.setupContext({
          post: { create: true, read: true, update: true },
          user: { delete: true },
        }) })
      })

    const router = orpcPermix.router({
      createPost: protectedMiddleware
        .use(permix.checkMiddleware('post.create'))
        .handler(({ context }) => {
          return { success: context.permix.check('post.create') }
        }),
    })

    const result = await new RPCHandler(router).handle(createRequest('/createPost'), {
      context: { user: { id: '1' } },
    })
    expect(result.response?.status).toEqual(200)
    expect(await result.response?.json()).toEqual({ json: { success: true } })
  })
})
