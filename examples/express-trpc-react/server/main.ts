import type { PermissionsDefinition } from '@/shared/permix'
import { getRules } from '@/shared/permix'
import { initTRPC, TRPCError } from '@trpc/server'
import * as trpcExpress from '@trpc/server/adapters/express'
import cors from 'cors'
import express from 'express'
import { createPermixTrpc } from 'permix/trpc'
import { z } from 'zod'

const app = express()

app.use(cors())

const t = initTRPC.context<{ extraInfo: string }>().create()

export const permixTrpc = createPermixTrpc<PermissionsDefinition>({
  unauthorizedError: new TRPCError({
    code: 'FORBIDDEN',
    message: 'You are not authorized to access this resource',
  }),
})

export const router = t.router
export const publicProcedure = t.procedure.use(permixTrpc.setupMiddleware(() => {
  // Imagine this is a middleware that gets the user from the request
  const user = {
    role: 'admin' as const,
  }

  return getRules(user.role)
}))

export const appRouter = router({
  userList: publicProcedure
    .use(permixTrpc.checkMiddleware('user', 'read'))
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
    .use(permixTrpc.checkMiddleware('user', 'create'))
    .input(z.object({
      name: z.string(),
      email: z.string().email(),
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
