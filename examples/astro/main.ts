import { createServer } from 'node:http'

import type { ValidateDefinition } from 'permix'
import { createPermix } from 'permix/astro'

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

async function handle(request: Request): Promise<Response> {
  const context = { request, locals: {} }

  return permix.setupMiddleware({
    user: {
      read: true,
      write: false,
    },
  })(context, async () => {
    const url = new URL(request.url)

    if (url.pathname === '/write') {
      return permix.checkMiddleware('user.write')(context, () =>
        Response.json({ ok: true })
      )
    }

    if (url.pathname === '/permix') {
      return Response.json({
        canRead: permix.getOrThrow(context).check('user.read'),
      })
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
