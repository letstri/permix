// @vitest-environment node
import type { PermixDefinition } from '../core/create-permix'
import { getTestInstance } from 'better-auth/test'
import { describe, expect, it } from 'vitest'
import { createPermix } from './create-permix'

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
    new Request('http://localhost:3000/api/auth/permix/permissions', {
      method: 'GET',
      headers: headers || new Headers(),
    }),
  )
}

describe('createPermix', () => {
  it('should return permissions for authenticated user', async () => {
    const permix = createPermix<Definition>({
      rules: () => ({
        post: { create: true, read: true, update: false },
        user: { delete: false },
      }),
    })

    const { auth, signInWithTestUser } = await getTestInstance({
      plugins: [permix.plugin],
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
    const permix = createPermix<Definition>({
      rules: () => ({
        post: { create: true, read: true, update: false },
        user: { delete: false },
      }),
    })

    const { auth } = await getTestInstance({
      plugins: [permix.plugin],
    })

    const res = await requestPermissions(auth)

    expect(res.status).toBe(401)
  })

  it('should work with session-based rules', async () => {
    const permix = createPermix<Definition>({
      rules: ({ user }) => ({
        post: {
          create: user.name === 'test user',
          read: true,
          update: false,
        },
        user: { delete: false },
      }),
    })

    const { auth, signInWithTestUser } = await getTestInstance({
      plugins: [permix.plugin],
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
    const permix = createPermix<Definition>({
      rules: async () => {
        await new Promise(resolve => setTimeout(resolve, 10))

        return {
          post: { create: false, read: true, update: false },
          user: { delete: false },
        }
      },
    })

    const { auth, signInWithTestUser } = await getTestInstance({
      plugins: [permix.plugin],
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
    const permix = createPermix<Definition>({
      rules: () => ({
        post: {
          create: () => true,
          read: true,
          update: false,
        },
        user: { delete: false },
      }),
    })

    const { auth, signInWithTestUser } = await getTestInstance({
      plugins: [permix.plugin],
    })

    const { headers } = await signInWithTestUser()
    const res = await requestPermissions(auth, headers)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      post: { create: false, read: true, update: false },
      user: { delete: false },
    })
  })

  it('should expose reusable rules function', () => {
    const rules = ({ user }: { user: Record<string, unknown> }) => ({
      post: {
        create: user.role === 'admin',
        read: true,
        update: user.role === 'admin',
      },
      user: {
        delete: user.role === 'admin',
      },
    })

    const permix = createPermix<Definition>({ rules })

    expect(permix.rules).toBe(rules)
  })

  it('should work with template', () => {
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
})
