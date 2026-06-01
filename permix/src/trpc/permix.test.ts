import type { ValidateDefinition } from '../core'
import { initTRPC, TRPCError } from '@trpc/server'
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

describe('createPermix', () => {
  const t = initTRPC.context<Context>().create()

  const permix = createPermix<Def>().contextKey('someCustomName')

  it('should throw ts error for invalid path', () => {
    // @ts-expect-error invalid permission path
    permix.checkMiddleware('post.delete')
  })

  it('should check with ctx', async () => {
    const router = t.router({
      createPost: t.procedure
        .use(({ next }) => {
          return next({
            ctx: permix.setupContext({
              post: { create: true, read: true, update: true },
              user: { delete: true },
            }),
          })
        })
        .use(permix.checkMiddleware('post.create'))
        .query(({ ctx }) => {
          return { success: ctx.someCustomName.check('post.create') }
        }),
    })

    const result = await t.createCallerFactory(router)({ user: { id: '1' } }).createPost()
    expect(result).toEqual({ success: true })
  })

  it('should throw if called without setup', async () => {
    const router = t.router({
      createPost: t.procedure
        .use(permix.checkMiddleware('post.create'))
        .query(() => {
          return { success: true }
        }),
    })

    await expect(t.createCallerFactory(router)({ user: { id: '1' } }).createPost()).rejects.toThrow()
  })

  it('should allow access when permission is defined', async () => {
    const protectedProcedure = t.procedure
      .use(({ next }) => {
        return next({
          ctx: permix.setupContext({
            post: { create: true, read: true, update: true },
            user: { delete: true },
          }),
        })
      })

    const router = t.router({
      createPost: protectedProcedure
        .use(permix.checkMiddleware('post.create'))
        .query(({ ctx }) => {
          ctx.someCustomName.check('post.update')
          return { success: true }
        }),
    })

    const result = await t.createCallerFactory(router)({ user: { id: '1' } }).createPost()
    expect(result).toEqual({ success: true })
  })

  it('should allow access by context', async () => {
    const protectedProcedure = t.procedure
      .use(({ ctx, next }) => {
        return next({
          ctx: permix.setupContext({
            post: {
              create: ctx.user.id === '1',
              read: ctx.user.id === '1',
              update: ctx.user.id === '1',
            },
            user: {
              delete: ctx.user.id === '1',
            },
          }),
        })
      })

    const router = t.router({
      createPost: protectedProcedure
        .use(permix.checkMiddleware('post.create'))
        .query(() => {
          return { success: true }
        }),
    })

    const result = await t.createCallerFactory(router)({ user: { id: '1' } }).createPost()
    expect(result).toEqual({ success: true })

    await expect(t.createCallerFactory(router)({ user: { id: '2' } }).createPost()).rejects.toThrow()
  })

  it('should deny access when permission is not granted', async () => {
    const protectedProcedure = t.procedure
      .use(({ next }) => {
        return next({
          ctx: permix.setupContext({
            post: { create: false, read: false, update: false },
            user: { delete: false },
          }),
        })
      })

    const router = t.router({
      createPost: protectedProcedure
        .use(permix.checkMiddleware('post.create'))
        .query(() => {
          return { success: true }
        }),
    })

    await expect(t.createCallerFactory(router)({ user: { id: '1' } }).createPost()).rejects.toThrow()
  })

  it('should work with custom onForbidden that throws', async () => {
    const permix = createPermix<Def>({
      onForbidden: ({ path }) => {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `No access to ${path}`,
        })
      },
    }).contextKey('someCustomName')

    const protectedProcedure = t.procedure
      .use(({ next }) => {
        return next({
          ctx: permix.setupContext({
            post: { create: false, read: false, update: false },
            user: { delete: false },
          }),
        })
      })

    const router = t.router({
      createPost: protectedProcedure
        .use(permix.checkMiddleware('post.create'))
        .query(() => {
          return { success: true }
        }),
    })

    await expect(t.createCallerFactory(router)({ user: { id: '1' } }).createPost())
      .rejects
      .toThrow('No access to post.create')
  })

  it('should work with onForbidden that allows through via next()', async () => {
    const permix = createPermix<Def>({
      onForbidden: ({ next }) => next(),
    }).contextKey('someCustomName')

    const protectedProcedure = t.procedure
      .use(({ next }) => {
        return next({
          ctx: permix.setupContext({
            post: { create: false, read: false, update: false },
            user: { delete: false },
          }),
        })
      })

    const router = t.router({
      createPost: protectedProcedure
        .use(permix.checkMiddleware('post.create'))
        .query(() => {
          return { success: true }
        }),
    })

    const result = await t.createCallerFactory(router)({ user: { id: '1' } }).createPost()
    expect(result).toEqual({ success: true })
  })

  it('should chain multiple permissions', async () => {
    const protectedProcedure = t.procedure
      .use(({ next }) => {
        return next({
          ctx: permix.setupContext({
            post: { create: true, read: true, update: true },
            user: { delete: true },
          }),
        })
      })

    const router = t.router({
      createAndReadPost: protectedProcedure
        .use(permix.checkMiddleware(c => c('post.create') && c('post.read')))
        .query(() => {
          return { success: true }
        }),
    })

    const result = await t.createCallerFactory(router)({ user: { id: '1' } }).createAndReadPost()
    expect(result).toEqual({ success: true })
  })

  it('should save types for context and input', async () => {
    const protectedProcedure = t.procedure
      .use(({ next }) => {
        return next({
          ctx: permix.setupContext({
            post: { create: true, read: true, update: true },
            user: { delete: true },
          }),
        })
      })

    const router = t.router({
      createAndReadPost: protectedProcedure
        .use(permix.checkMiddleware('post.read'))
        .input(z.object({
          userId: z.string(),
        }))
        .query(({ ctx, input }) => {
          return {
            userId: ctx.user.id * 1,
            // @ts-expect-error userId is string
            inputUserId: input.userId * 1,
          }
        }),
    })

    const result = await t.createCallerFactory(router)({ user: { id: '1' } }).createAndReadPost({ userId: '1' })

    expect(result).toEqual({
      userId: 1,
      inputUserId: 1,
    })
  })

  it('should work with template', async () => {
    const template = permix.template({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })

    const protectedProcedure = t.procedure
      .use(({ next }) => {
        return next({ ctx: permix.setupContext(template()) })
      })

    const router = t.router({
      createPost: protectedProcedure
        .use(permix.checkMiddleware('post.create'))
        .query(({ ctx }) => {
          return { success: ctx.someCustomName.check('post.create') }
        }),
    })

    const result = await t.createCallerFactory(router)({ user: { id: '1' } }).createPost()
    expect(result).toEqual({ success: true })
  })

  it('should dehydrate permissions', async () => {
    const template = permix.template({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })

    const router = t.router({
      dehydrate: t.procedure
        .use(({ next }) => {
          return next({ ctx: permix.setupContext(template()) })
        })
        .query(({ ctx }) => {
          return ctx.someCustomName.dehydrate()
        }),
    })

    const result = await t.createCallerFactory(router)({ user: { id: '1' } }).dehydrate()

    expect(result).toEqual({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })
  })

  it('should work with default key', async () => {
    const permix = createPermix<Def>()

    const protectedProcedure = t.procedure
      .use(({ next }) => {
        return next({ ctx: permix.setupContext({
          post: { create: true, read: true, update: true },
          user: { delete: true },
        }) })
      })

    const router = t.router({
      createPost: protectedProcedure
        .use(permix.checkMiddleware('post.create'))
        .query(({ ctx }) => {
          return { success: ctx.permix.check('post.create') }
        }),
    })

    const result = await t.createCallerFactory(router)({ user: { id: '1' } }).createPost()
    expect(result).toEqual({ success: true })
  })
})
