import { createServer } from 'node:http'

import type { ValidateDefinition } from 'permix'
import { createPermix } from 'permix/react-router'
import type { ReactRouterContext } from 'permix/react-router'

type PermissionsDefinition = ValidateDefinition<{
  user: ['read', 'write']
}>

const permix = createPermix<PermissionsDefinition>({
  onForbidden: () =>
    Response.json(
      { error: 'You do not have permission to access this resource' },
      { status: 403 }
    ),
})

function createContext(): ReactRouterContext {
  const store = new Map<object, unknown>()
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value)
    },
  }
}

async function handle(request: Request): Promise<Response> {
  const context = createContext()

  return permix.setupMiddleware({
    user: {
      read: true,
      write: false,
    },
  })({ request, context }, async () => {
    const url = new URL(request.url)

    if (url.pathname === '/write') {
      return permix.checkMiddleware('user.write')({ request, context }, () =>
        Response.json({ ok: true })
      )
    }

    return Response.json({
      canRead: permix.getOrThrow(context).check('user.read'),
    })
  })
}

createServer(async (req, res) => {
  const request = new Request(`http://127.0.0.1:3000${req.url ?? '/'}`)
  const response = await handle(request)
  res.writeHead(response.status, Object.fromEntries(response.headers))
  res.end(Buffer.from(await response.arrayBuffer()))
}).listen(3000, () => {
  console.log('Server is running on port 3000')
})
