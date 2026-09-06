import { createServer } from 'node:http'

import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3'
import type { ValidateDefinition } from 'permix'
import { createPermix } from 'permix/nuxt'

type PermissionsDefinition = ValidateDefinition<{
  user: ['read', 'write']
}>

const permix = createPermix<PermissionsDefinition>()

// In Nuxt this is `server/middleware/permix.ts`.
const app = createApp()

app.use(
  defineEventHandler(
    permix.setupMiddleware(() => ({
      user: {
        read: true,
        write: false,
      },
    }))
  )
)

// In Nuxt these are `server/api/*.ts` handlers.
const router = createRouter()

router.get(
  '/',
  defineEventHandler({
    onRequest: [permix.checkMiddleware('user.read')],
    handler: () => 'Hello World',
  })
)

router.get(
  '/write',
  defineEventHandler({
    onRequest: [permix.checkMiddleware('user.write')],
    handler: () => 'Hello World',
  })
)

router.get(
  '/permix',
  defineEventHandler((event) => ({
    canRead: permix.getOrThrow(event).check('user.read'),
  }))
)

app.use(router)

createServer(toNodeListener(app)).listen(3000, () => {
  console.log('Server is running on port 3000')
})
