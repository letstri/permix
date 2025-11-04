import type { PermissionsDefinition } from '@/shared/permix'
import { initTRPC, TRPCError } from '@trpc/server'
import * as trpcExpress from '@trpc/server/adapters/express'
import cors from 'cors'
import express from 'express'
import { createPermix } from 'permix/trpc'
import { z } from 'zod'
import { getRules } from '@/shared/permix'

const app = express()

app.use(cors())

const t = initTRPC.context<{ extraInfo: string }>().create()

export const permix = createPermix<PermissionsDefinition>({
  forbiddenError: () => new TRPCError({
    code: 'FORBIDDEN',
    message: 'You do not have permission to access this resource',
  }),
})

export const router = t.router
export const publicProcedure = t.procedure.use(({ next }) => {
  // Imagine this is a middleware that gets the user from the request
  const user = {
    role: 'admin' as const,
  }

  return next({
    ctx: {
      permix: permix.setup(getRules(user.role)),
    },
  })
})

export const appRouter = router({
  userList: publicProcedure
    .use(permix.checkMiddleware('user', 'read'))
    // Imagine this is a database query
    .query(() => [
      {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
      },
      {
        id: '2',
        name: 'Jane Doe 2',
        email: 'jane.doe2@example.com',
      },
    ]),
  userWrite: publicProcedure
    .use(permix.checkMiddleware('user', 'create'))
    .input(z.object({
      name: z.string(),
      email: z.email(),
    }))
    .mutation(() => {
      // Imagine this is a database mutation
      return { id: '1', name: 'John Doe', email: 'john.doe@example.com' }
    }),
})

export type AppRouter = typeof appRouter

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => ({
      extraInfo: 'some extra info',
    }),
  }),
)
app.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('Server is running on port 3000')
})
