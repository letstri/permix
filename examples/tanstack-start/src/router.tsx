import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { createRouterPermix } from '@/lib/permix'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  // One instance per request on the server, one per tab in the browser.
  const permix = createRouterPermix()

  const router = createTanStackRouter({
    routeTree,
    context: { permix },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
