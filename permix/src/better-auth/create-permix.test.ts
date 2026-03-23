// @vitest-environment node
import type { PermixDefinition } from '../core/create-permix'
import { getTestInstance } from 'better-auth/test'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createPermix, permixPlugin } from './create-permix'

type Definition = PermixDefinition<{
  post: {
    action: 'create' | 'read' | 'update'
  }
  user: {
    action: 'delete'
  }
}>

async function requestPermissions(
  auth: { handler: (req: Request) => Promise<Response> },
  headers?: Headers,
) {
  return auth.handler(
    new Request('http://localhost:3000/api/auth/permix/get-permissions', {
      method: 'GET',
      headers: headers || new Headers(),
    }),
  )
}

describe('createPermix', () => {
  it('should return permissions for authenticated user', async () => {
    const { auth, signInWithTestUser } = await getTestInstance({
      plugins: [permixPlugin()],
    })

    createPermix<Definition>({
      rules: () => ({
        post: { create: true, read: true, update: false },
        user: { delete: false },
      }),
    })

    const { headers } = await signInWithTestUser()
    const res = await requestPermissions(auth, headers)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      post: { create: true, read: true, update: false },
      user: { delete: false },
    })
  })

  it('should return 401 for unauthenticated request', async () => {
    const { auth } = await getTestInstance({
      plugins: [permixPlugin()],
    })

    createPermix<Definition>({
      rules: () => ({
        post: { create: true, read: true, update: false },
        user: { delete: false },
      }),
    })

    const res = await requestPermissions(auth)

    expect(res.status).toBe(401)
  })

  it('should work with session-based rules', async () => {
    const { auth, signInWithTestUser } = await getTestInstance({
      plugins: [permixPlugin()],
    })

    createPermix<Definition>({
      rules: ({ user }) => ({
        post: {
          create: user.name === 'test user',
          read: true,
          update: false,
        },
        user: { delete: false },
      }),
    })

    const { headers } = await signInWithTestUser()
    const res = await requestPermissions(auth, headers)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      post: { create: true, read: true, update: false },
      user: { delete: false },
    })
  })

  it('should support async rules', async () => {
    const { auth, signInWithTestUser } = await getTestInstance({
      plugins: [permixPlugin()],
    })

    createPermix<Definition>({
      rules: async () => {
        await new Promise(resolve => setTimeout(resolve, 10))

        return {
          post: { create: false, read: true, update: false },
          user: { delete: false },
        }
      },
    })

    const { headers } = await signInWithTestUser()
    const res = await requestPermissions(auth, headers)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      post: { create: false, read: true, update: false },
      user: { delete: false },
    })
  })

  it('should dehydrate function-based rules to false', async () => {
    const { auth, signInWithTestUser } = await getTestInstance({
      plugins: [permixPlugin()],
    })

    createPermix<Definition>({
      rules: () => ({
        post: {
          create: () => true,
          read: true,
          update: false,
        },
        user: { delete: false },
      }),
    })

    const { headers } = await signInWithTestUser()
    const res = await requestPermissions(auth, headers)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      post: { create: false, read: true, update: false },
      user: { delete: false },
    })
  })

  it('should expose reusable rules function', async () => {
    await getTestInstance({
      plugins: [permixPlugin()],
    })

    const rules = ({ user }: { user: { name: string } }) => ({
      post: {
        create: user.name === 'admin',
        read: true,
        update: user.name === 'admin',
      },
      user: {
        delete: user.name === 'admin',
      },
    })

    const permix = createPermix<Definition>({ rules })

    expect(permix.rules).toBe(rules)
  })

  it('should work with template', async () => {
    await getTestInstance({
      plugins: [permixPlugin()],
    })

    const permix = createPermix<Definition>({
      rules: () => ({
        post: { create: true, read: true, update: true },
        user: { delete: true },
      }),
    })

    const template = permix.template({
      post: { create: true, read: true, update: false },
      user: { delete: false },
    })

    expect(template()).toEqual({
      post: { create: true, read: true, update: false },
      user: { delete: false },
    })
  })

  it('should work via auth.api.getPermissions()', async () => {
    const { auth, signInWithTestUser } = await getTestInstance({
      plugins: [permixPlugin<Definition>()],
    })

    createPermix<Definition>({
      rules: () => ({
        post: { create: true, read: true, update: false },
        user: { delete: false },
      }),
    })

    const { headers } = await signInWithTestUser()
    const data = await auth.api.getPermissions({ headers })

    expect(data).toEqual({
      post: { create: true, read: true, update: false },
      user: { delete: false },
    })
  })

  it('should accept session type via generic for additionalFields', async () => {
    const { auth: _auth } = await getTestInstance({
      plugins: [permixPlugin()],
      user: {
        additionalFields: {
          role: {
            type: ['user', 'admin'],
            defaultValue: 'user',
          },
        },
      },
    })

    type Session = typeof _auth.$Infer.Session

    const permix = createPermix<Definition, Session>({
      rules: ({ user }) => {
        expectTypeOf(user.role).toEqualTypeOf<'user' | 'admin'>()

        return {
          post: {
            create: user.role === 'admin',
            read: true,
            update: false,
          },
          user: { delete: false },
        }
      },
    })

    expectTypeOf(permix.rules).toBeFunction()
  })
})
