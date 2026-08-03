import { createMiddleware, createStart } from '@tanstack/react-start'
import { getSessionFromRequest } from '@/lib/auth'
import { adminTemplate, guestTemplate, permix } from '@/lib/permix'

// The `.server()` boundary lives in app code so TanStack Start strips the
// callback — and its server-only imports like `@/lib/auth` — from the client
// bundle. `permix.setupMiddleware(...)` would hide that boundary inside the
// library, leaking the imports to the client.
const permixMiddleware = createMiddleware().server(
  permix.createSetupHandler(async ({ request }) => {
    const session = getSessionFromRequest(request)

    if (!session) {
      return guestTemplate()
    }

    if (session.role === 'admin') {
      return adminTemplate()
    }

    return {
      post: {
        create: true,
        read: true,
        update: post => post?.authorId === session.userId,
        delete: false,
      },
    }
  }),
)

export const startInstance = createStart(() => ({
  requestMiddleware: [permixMiddleware],
}))
