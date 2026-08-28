import { createServer } from 'node:http'

import {
  createApp,
  createRouter,
  eventHandler,
  setResponseStatus,
  toNodeListener,
} from 'h3'
import type { ValidateDefinition } from 'permix'
import { createPermix } from 'permix/nuxt'

type PermissionsDefinition = ValidateDefinition<{
  user: ['read', 'write']
}>

const permix = createPermix<PermissionsDefinition>()

const app = createApp()
const router = createRouter()

function setup(event: Parameters<typeof permix.setup>[1]) {
  permix.setup(
    {
      user: {
        read: true,
        write: false,
      },
    },
    event
  )
}

router.get(
  '/',
  eventHandler((event) => {
    setup(event)
    return { canRead: permix.get(event).check('user.read') }
  })
)

router.get(
  '/write',
  eventHandler((event) => {
    setup(event)
    if (!permix.get(event).check('user.write')) {
      setResponseStatus(event, 403)
      return { error: 'Forbidden' }
    }
    return { ok: true }
  })
)

router.get(
  '/state',
  eventHandler((event) => {
    setup(event)
    return permix.dehydrate(event)
  })
)

app.use(router)

createServer(toNodeListener(app)).listen(3000, () => {
  console.log('Server is running on port 3000')
})
