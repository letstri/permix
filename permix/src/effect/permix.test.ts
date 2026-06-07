import type { ValidateDefinition } from '../core'
import { Context, Effect } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { PermixNotReadyError, PermixRuleNotDefinedError } from '../core'
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
  it('should allow access when permission is granted', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const program = Effect.gen(function* () {
      return yield* permix.check('post.create')
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(permix.layer({
        post: { create: true, read: false, update: false },
        user: { delete: false },
      }))),
    )

    expect(result).toBe(true)
  })

  it('should deny access when permission is not granted', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const program = Effect.gen(function* () {
      return yield* permix.check('post.create')
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(permix.layer({
        post: { create: false, read: false, update: false },
        user: { delete: false },
      }))),
    )

    expect(result).toBe(false)
  })

  it('should work with layerSetup and dynamic rules from another service', async () => {
    const permix = createPermix<PermissionsDefinition>()

    interface User { id: string, role: 'admin' | 'member' }
    class CurrentUser extends Context.Tag('CurrentUser')<CurrentUser, User>() {}

    const PermixLive = permix.layerSetup(Effect.gen(function* () {
      const user = yield* CurrentUser
      return {
        post: {
          create: user.role === 'admin',
          read: true,
          update: user.role === 'admin',
        },
        user: { delete: user.role === 'admin' },
      }
    }))

    const program = Effect.gen(function* () {
      return {
        create: yield* permix.check('post.create'),
        read: yield* permix.check('post.read'),
        delete: yield* permix.check('user.delete'),
      }
    })

    const adminResult = await Effect.runPromise(
      program.pipe(
        Effect.provide(PermixLive),
        Effect.provideService(CurrentUser, { id: '1', role: 'admin' }),
      ),
    )

    expect(adminResult).toEqual({ create: true, read: true, delete: true })

    const memberResult = await Effect.runPromise(
      program.pipe(
        Effect.provide(PermixLive),
        Effect.provideService(CurrentUser, { id: '2', role: 'member' }),
      ),
    )

    expect(memberResult).toEqual({ create: false, read: true, delete: false })
  })

  it('should pass data through to a rule callback', async () => {
    const permix = createPermix<PostWithData>()

    const program = Effect.gen(function* () {
      return yield* permix.check('post.create', { id: 'a', authorId: '1' })
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(permix.layer({
        post: { create: (post?: Post) => post?.authorId === '1' },
      }))),
    )

    expect(result).toBe(true)

    const denied = await Effect.runPromise(
      program.pipe(Effect.provide(permix.layer({
        post: { create: (post?: Post) => post?.authorId === '999' },
      }))),
    )

    expect(denied).toBe(false)
  })

  it('should work with checker callback form', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const program = Effect.gen(function* () {
      return yield* permix.check(c => c('post.create') && c('post.read'))
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(permix.layer({
        post: { create: true, read: true, update: false },
        user: { delete: false },
      }))),
    )

    expect(result).toBe(true)

    const denied = await Effect.runPromise(
      program.pipe(Effect.provide(permix.layer({
        post: { create: true, read: false, update: false },
        user: { delete: false },
      }))),
    )

    expect(denied).toBe(false)
  })

  it('should dehydrate permissions', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const program = Effect.gen(function* () {
      return yield* permix.dehydrate()
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(permix.layer({
        post: { create: true, read: false, update: true },
        user: { delete: false },
      }))),
    )

    expect(result).toEqual({
      post: { create: true, read: false, update: true },
      user: { delete: false },
    })
  })

  it('should work with template', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const adminTemplate = permix.template({
      post: { create: true, read: true, update: true },
      user: { delete: true },
    })

    const program = Effect.gen(function* () {
      return yield* permix.check('post.create')
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(permix.layer(adminTemplate()))),
    )

    expect(result).toBe(true)
  })

  it('should let two instances with different ids coexist', async () => {
    const admin = createPermix<PermissionsDefinition>({ id: 'admin' })
    const guest = createPermix<PermissionsDefinition>({ id: 'guest' })

    const program = Effect.gen(function* () {
      return {
        adminCreate: yield* admin.check('post.create'),
        guestCreate: yield* guest.check('post.create'),
      }
    })

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(admin.layer({
          post: { create: true, read: true, update: true },
          user: { delete: true },
        })),
        Effect.provide(guest.layer({
          post: { create: false, read: true, update: false },
          user: { delete: false },
        })),
      ),
    )

    expect(result).toEqual({ adminCreate: true, guestCreate: false })
  })

  it('should assign unique ids by default', () => {
    const a = createPermix<PermissionsDefinition>()
    const b = createPermix<PermissionsDefinition>()

    expect(a.id).not.toBe(b.id)
  })

  it('should setup rules at runtime starting from an empty layer', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const program = Effect.gen(function* () {
      const before = yield* permix.isReady()

      yield* permix.setup({
        post: { create: true, read: true, update: false },
        user: { delete: false },
      })

      const after = yield* permix.isReady()
      const canCreate = yield* permix.check('post.create')

      return { before, after, canCreate }
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(permix.layer())))

    expect(result).toEqual({ before: false, after: true, canCreate: true })
  })

  it('should hydrate from a dehydrated state', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const program = Effect.gen(function* () {
      yield* permix.hydrate({
        post: { create: true, read: false, update: true },
        user: { delete: false },
      })

      return {
        canCreate: yield* permix.check('post.create'),
        canRead: yield* permix.check('post.read'),
      }
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(permix.layer())))

    expect(result).toEqual({ canCreate: true, canRead: false })
  })

  it('should read the current rules with getRules', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const rules = {
      post: { create: true, read: true, update: false },
      user: { delete: false },
    }

    const program = Effect.gen(function* () {
      const empty = yield* permix.getRules()
      yield* permix.setup(rules)
      const current = yield* permix.getRules()
      return { empty, current }
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(permix.layer())))

    expect(result.empty).toBeNull()
    expect(result.current).toEqual(rules)
  })

  it('should resolve isReadyAsync once setup runs', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const program = Effect.gen(function* () {
      yield* permix.setup({
        post: { create: true, read: true, update: true },
        user: { delete: true },
      })
      yield* permix.isReadyAsync()
      return yield* permix.check('post.create')
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(permix.layer())))

    expect(result).toBe(true)
  })

  it('should type the error channel of hydrate as PermixNotReadyError', () => {
    const permix = createPermix<PermissionsDefinition>()

    const flipped = Effect.flip(
      permix.hydrate({
        post: { create: true, read: false, update: false },
        user: { delete: false },
      }).pipe(Effect.provide(permix.layer())),
    )

    expectTypeOf(flipped).toMatchTypeOf<Effect.Effect<PermixNotReadyError, void, never>>()
  })

  it('should surface PermixNotReadyError when dehydrate is called before setup', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const error = await Effect.runPromise(
      Effect.flip(
        permix.dehydrate().pipe(Effect.provide(permix.layer())),
      ),
    )

    expect(error).toBeInstanceOf(PermixNotReadyError)
  })

  it('should surface PermixNotReadyError when check is called before setup', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const error = await Effect.runPromise(
      Effect.flip(
        permix.check('post.create').pipe(Effect.provide(permix.layer())),
      ),
    )

    expect(error).toBeInstanceOf(PermixNotReadyError)
  })

  it('should surface PermixRuleNotDefinedError when rule path is not in rules', async () => {
    const permix = createPermix<PermissionsDefinition>()

    const error = await Effect.runPromise(
      Effect.flip(

        (permix.check as any)('nonexistent.create').pipe(
          Effect.provide(
            permix.layer({
              post: { create: true, read: false, update: false },
              user: { delete: false },
            }),
          ),
        ),
      ),
    )

    expect(error).toBeInstanceOf(PermixRuleNotDefinedError)
  })

  it('should fire a hook when setup runs', async () => {
    const permix = createPermix<PermissionsDefinition>()

    let called = 0

    const program = Effect.gen(function* () {
      yield* permix.hook('setup', () => {
        called++
      })

      yield* permix.setup({
        post: { create: true, read: true, update: true },
        user: { delete: true },
      })
    })

    await Effect.runPromise(program.pipe(Effect.provide(permix.layer())))

    expect(called).toBe(1)
  })
})
