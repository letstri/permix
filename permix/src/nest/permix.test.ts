import 'reflect-metadata'
import type { INestApplication, Type } from '@nestjs/common'
import {
  Controller,
  ForbiddenException,
  Get,
  Module,
  Post,
  Req,
} from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import type { ValidateDefinition } from '../core'
import { createPermix } from './permix'

interface PostEntity {
  id: string
  authorId: string
}

type PermissionsDefinition = ValidateDefinition<{
  post: ['create', 'read', 'update']
  user: ['delete']
}>

type PostWithData = ValidateDefinition<{
  post: [{ name: 'create'; type: PostEntity }]
}>

const denied = {
  post: { create: false, read: false, update: false },
  user: { delete: false },
}

describe('permix/nest', () => {
  let app: INestApplication | undefined

  afterEach(async () => {
    if (app) {
      await app.close()
      app = undefined
    }
  })

  async function createApp(module: Type<unknown>): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [module],
    }).compile()
    app = moduleRef.createNestApplication({ logger: false })
    await app.init()
    return app
  }

  describe(createPermix, () => {
    const permix = createPermix<PermissionsDefinition>()

    it('should throw ts error', () => {
      // @ts-expect-error path does not exist
      permix.Check('post.delete')
    })

    it('should allow access when permission is granted', async () => {
      @Controller()
      class PostsController {
        @Post('posts')
        @permix.Check('post.create')
        create() {
          return { success: true }
        }
      }

      @Module({
        controllers: [PostsController],
        providers: [
          {
            provide: APP_GUARD,
            useValue: permix.guard({
              post: { create: true, read: false, update: false },
              user: { delete: false },
            }),
          },
        ],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer())
        .post('/posts')
        .send({ title: 'Test Post' })

      expect(response.status).toBe(201)
      expect(response.body).toStrictEqual({ success: true })
    })

    it('should deny access when permission is not granted', async () => {
      @Controller()
      class PostsController {
        @Post('posts')
        @permix.Check('post.create')
        create() {
          return { success: true }
        }
      }

      @Module({
        controllers: [PostsController],
        providers: [{ provide: APP_GUARD, useValue: permix.guard(denied) }],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer())
        .post('/posts')
        .send({ title: 'Test Post' })

      expect(response.status).toBe(403)
      expect(response.body).toStrictEqual({ error: 'Forbidden' })
    })

    it('should work with custom error handler', async () => {
      const permix = createPermix<PermissionsDefinition>({
        onForbidden: () => {
          throw new ForbiddenException({ error: 'Custom error' })
        },
      })

      @Controller()
      class PostsController {
        @Post('posts')
        @permix.Check('post.create')
        create() {
          return { success: true }
        }
      }

      @Module({
        controllers: [PostsController],
        providers: [{ provide: APP_GUARD, useValue: permix.guard(denied) }],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer())
        .post('/posts')
        .send({ title: 'Test Post' })

      expect(response.status).toBe(403)
      expect(response.body).toStrictEqual({ error: 'Custom error' })
    })

    it('should work with custom error and params', async () => {
      const permix = createPermix<PermissionsDefinition>({
        onForbidden: ({ path }) => {
          throw new ForbiddenException({
            error: `You do not have permission for ${path}`,
          })
        },
      })

      @Controller()
      class PostsController {
        @Post('posts')
        @permix.Check('post.create')
        create() {
          return { success: true }
        }
      }

      @Module({
        controllers: [PostsController],
        providers: [{ provide: APP_GUARD, useValue: permix.guard(denied) }],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer())
        .post('/posts')
        .send({ title: 'Test Post' })

      expect(response.status).toBe(403)
      expect(response.body).toStrictEqual({
        error: 'You do not have permission for post.create',
      })
    })

    it('should pass data through to a rule callback', async () => {
      const permix = createPermix<PostWithData>()

      @Controller()
      class PostsController {
        @Post('posts')
        @permix.Check('post.create', { id: 'a', authorId: '1' })
        create() {
          return { success: true }
        }
      }

      @Module({
        controllers: [PostsController],
        providers: [
          {
            provide: APP_GUARD,
            useValue: permix.guard({
              post: {
                create: (post) => post?.authorId === '1',
              },
            }),
          },
        ],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer())
        .post('/posts')
        .send({ title: 'Test Post' })

      expect(response.status).toBe(201)
      expect(response.body).toStrictEqual({ success: true })
    })

    it('should work with checker callback form', async () => {
      const permix = createPermix<PermissionsDefinition>()

      @Controller()
      class PostsController {
        @Post('posts')
        @permix.Check((c) => c('post.create') && c('user.delete'))
        create() {
          return { success: true }
        }
      }

      @Module({
        controllers: [PostsController],
        providers: [
          {
            provide: APP_GUARD,
            useValue: permix.guard({
              post: { create: true, read: true, update: false },
              user: { delete: true },
            }),
          },
        ],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer())
        .post('/posts')
        .send({ title: 'Test Post' })

      expect(response.status).toBe(201)
      expect(response.body).toStrictEqual({ success: true })
    })

    it('should work with template', async () => {
      const template = permix.template({
        post: { create: true, read: true, update: true },
        user: { delete: true },
      })

      @Controller()
      class PostsController {
        @Post('posts')
        @permix.Check('post.create')
        create() {
          return { success: true }
        }
      }

      @Module({
        controllers: [PostsController],
        providers: [
          { provide: APP_GUARD, useValue: permix.guard(() => template()) },
        ],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer())
        .post('/posts')
        .send({ title: 'Test Post' })

      expect(response.status).toBe(201)
      expect(response.body).toStrictEqual({ success: true })
    })

    it('should dehydrate permissions', async () => {
      const template = permix.template({
        post: { create: true, read: false, update: true },
        user: { delete: false },
      })

      @Controller()
      class DehydrateController {
        @Get('dehydrate')
        dehydrate(@Req() req: { [key: PropertyKey]: unknown }) {
          return permix.getOrThrow(req).dehydrate()
        }
      }

      @Module({
        controllers: [DehydrateController],
        providers: [
          { provide: APP_GUARD, useValue: permix.guard(() => template()) },
        ],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer()).get('/dehydrate')

      expect(response.status).toBe(200)
      expect(response.body).toStrictEqual({
        post: { create: true, read: false, update: true },
        user: { delete: false },
      })
    })

    it('should allow a handler without Check after setup', async () => {
      @Controller()
      class OpenController {
        @Get('open')
        open() {
          return { ok: true }
        }
      }

      @Module({
        controllers: [OpenController],
        providers: [{ provide: APP_GUARD, useValue: permix.guard(denied) }],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer()).get('/open')
      expect(response.status).toBe(200)
      expect(response.body).toStrictEqual({ ok: true })
    })

    it('should let two factories with different keys coexist on the same request', async () => {
      const admin = createPermix<PermissionsDefinition>().contextKey('admin')
      const guest = createPermix<PermissionsDefinition>().contextKey('guest')

      @Controller()
      class DualController {
        @Post('admin')
        @admin.Check('post.create')
        adminRoute() {
          return { scope: 'admin' }
        }

        @Post('guest')
        @guest.Check('post.create')
        guestRoute() {
          return { scope: 'guest' }
        }
      }

      @Module({
        controllers: [DualController],
        providers: [
          {
            provide: APP_GUARD,
            useValue: admin.guard({
              post: { create: true, read: true, update: true },
              user: { delete: true },
            }),
          },
          {
            provide: APP_GUARD,
            useValue: guest.guard({
              post: { create: false, read: true, update: false },
              user: { delete: false },
            }),
          },
        ],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)

      const adminResponse = await request(nestApp.getHttpServer()).post(
        '/admin'
      )
      expect(adminResponse.status).toBe(201)
      expect(adminResponse.body).toStrictEqual({ scope: 'admin' })

      const guestResponse = await request(nestApp.getHttpServer()).post(
        '/guest'
      )
      expect(guestResponse.status).toBe(403)
      expect(guestResponse.body).toStrictEqual({ error: 'Forbidden' })
    })

    it('should default to a per-instance symbol so two factories without a key do not collide', async () => {
      const first = createPermix<PermissionsDefinition>()
      const second = createPermix<PermissionsDefinition>()

      @Controller()
      class DualController {
        @Post('first')
        @first.Check('post.create')
        firstRoute() {
          return { ok: true }
        }

        @Post('second')
        @second.Check('post.create')
        secondRoute() {
          return { ok: true }
        }
      }

      @Module({
        controllers: [DualController],
        providers: [
          {
            provide: APP_GUARD,
            useValue: first.guard({
              post: { create: true, read: true, update: true },
              user: { delete: true },
            }),
          },
          {
            provide: APP_GUARD,
            useValue: second.guard({
              post: { create: false, read: false, update: false },
              user: { delete: false },
            }),
          },
        ],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)

      const firstResponse = await request(nestApp.getHttpServer()).post(
        '/first'
      )
      expect(firstResponse.status).toBe(201)

      const secondResponse = await request(nestApp.getHttpServer()).post(
        '/second'
      )
      expect(secondResponse.status).toBe(403)
    })

    it('should accept an explicit symbol key', async () => {
      const key = Symbol('my-permix')
      const permix = createPermix<PermissionsDefinition>().contextKey(key)

      @Controller()
      class ProbeController {
        @Get('probe')
        probe(@Req() req: { [key: PropertyKey]: unknown }) {
          return { attached: Boolean(req[key]) }
        }
      }

      @Module({
        controllers: [ProbeController],
        providers: [
          {
            provide: APP_GUARD,
            useValue: permix.guard({
              post: { create: true, read: true, update: true },
              user: { delete: true },
            }),
          },
        ],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer()).get('/probe')
      expect(response.status).toBe(200)
      expect(response.body).toStrictEqual({ attached: true })
    })

    it('should honor a class-level Check decorator', async () => {
      @Controller('posts')
      @permix.Check('post.create')
      class PostsController {
        @Post()
        create() {
          return { success: true }
        }
      }

      @Module({
        controllers: [PostsController],
        providers: [{ provide: APP_GUARD, useValue: permix.guard(denied) }],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer()).post('/posts')
      expect(response.status).toBe(403)
      expect(response.body).toStrictEqual({ error: 'Forbidden' })
    })
  })

  describe('get / getOrThrow', () => {
    const permix = createPermix<PermissionsDefinition>()

    it('should return null when the guard has not run', async () => {
      @Controller()
      class RootController {
        @Get()
        root(@Req() req: { [key: PropertyKey]: unknown }) {
          return { result: permix.get(req) }
        }
      }

      @Module({ controllers: [RootController] })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer()).get('/')
      expect(response.status).toBe(200)
      expect(response.body).toStrictEqual({ result: null })
    })

    it('should return the instance when the guard has run', async () => {
      @Controller()
      class RootController {
        @Get()
        root(@Req() req: { [key: PropertyKey]: unknown }) {
          const p = permix.getOrThrow(req)
          return { hasCheck: typeof p.check === 'function' }
        }
      }

      @Module({
        controllers: [RootController],
        providers: [
          {
            provide: APP_GUARD,
            useValue: permix.guard({
              post: { create: true, read: true, update: true },
              user: { delete: true },
            }),
          },
        ],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer()).get('/')
      expect(response.status).toBe(200)
      expect(response.body).toStrictEqual({ hasCheck: true })
    })

    it('getOrThrow should throw PermixNotFoundError when missing', async () => {
      @Controller()
      class RootController {
        @Get()
        root(@Req() req: { [key: PropertyKey]: unknown }) {
          permix.getOrThrow(req)
          return { ok: true }
        }
      }

      @Module({ controllers: [RootController] })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer()).get('/')
      expect(response.status).toBe(500)
      expect(response.body.statusCode).toBe(500)
    })

    it('getRules should return null when the guard has not run', async () => {
      @Controller()
      class RootController {
        @Get()
        root(@Req() req: { [key: PropertyKey]: unknown }) {
          return { rules: permix.getRules(req) }
        }
      }

      @Module({ controllers: [RootController] })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer()).get('/')
      expect(response.status).toBe(200)
      expect(response.body).toStrictEqual({ rules: null })
    })

    it('getRules should return the current rules when the guard has run', async () => {
      @Controller()
      class RootController {
        @Get()
        root(@Req() req: { [key: PropertyKey]: unknown }) {
          return { rules: permix.getRules(req) }
        }
      }

      @Module({
        controllers: [RootController],
        providers: [
          {
            provide: APP_GUARD,
            useValue: permix.guard({
              post: { create: true, read: false, update: false },
              user: { delete: true },
            }),
          },
        ],
      })
      class AppModule {}

      const nestApp = await createApp(AppModule)
      const response = await request(nestApp.getHttpServer()).get('/')
      expect(response.status).toBe(200)
      expect(response.body).toStrictEqual({
        rules: {
          post: { create: true, read: false, update: false },
          user: { delete: true },
        },
      })
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
})
