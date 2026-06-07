import { createStart } from '@tanstack/react-start'
import { getSessionFromRequest } from '@/lib/auth'
import { adminTemplate, guestTemplate, permix } from '@/lib/permix'

export const startInstance = createStart(() => ({
  requestMiddleware: [
    permix.setupMiddleware(async ({ request }: { request: Request }) => {
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
  ],
}))
