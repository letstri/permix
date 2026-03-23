import type { Definition } from './permix'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createTemplate } from 'permix'
import { createPermix, permixPlugin } from 'permix/better-auth'
import { db } from '@/db'

export const auth = betterAuth({
  baseURL: 'http://localhost:3000',
  database: drizzleAdapter(db, {
    provider: 'sqlite',
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: ['user', 'admin'],
        defaultValue: 'user',
        input: false,
      },
    },
  },
  plugins: [permixPlugin<Definition>()],
})

export type Session = typeof auth.$Infer.Session

const adminTemplate = createTemplate<Definition>({
  post: {
    create: true,
    read: true,
    update: true,
    delete: true,
  },
})

const userTemplate = createTemplate<Definition>({
  post: {
    create: false,
    read: true,
    update: false,
    delete: false,
  },
})

export const permix = createPermix<Definition, Session>({
  rules: ({ user }) => {
    if (user.role === 'admin') {
      return adminTemplate()
    }

    return userTemplate()
  },
})
