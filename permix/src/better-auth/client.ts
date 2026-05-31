import type { BetterAuthClientPlugin } from 'better-auth'
import type { Statement } from '../core/statements'
import type { PermixPluginInstance } from './plugin'

/**
 * Create a Better Auth client plugin that provides a typed
 * `authClient.permix.getPermissions()` method.
 *
 * Returns the dehydrated permission state from the server's
 * `GET /permix/get-permissions` endpoint. Use `permix.hydrate(state)`
 * on the client to restore the permissions.
 *
 * @link https://permix.letstri.dev/docs/integrations/better-auth
 *
 * @example
 * ```ts
 * import { createAuthClient } from 'better-auth/client'
 * import { permixClient } from 'permix/better-auth/client'
 *
 * const authClient = createAuthClient({
 *   plugins: [permixClient()],
 * })
 *
 * const state = await authClient.permix.getPermissions()
 * permix.hydrate(state)
 * ```
 */
export function permixClient<D extends Statement>(): {
  id: 'permix'
  $InferServerPlugin: PermixPluginInstance<D>
  pathMethods: { '/permix/get-permissions': 'GET' }
} {
  return {
    id: 'permix',
    $InferServerPlugin: {} as PermixPluginInstance<D>,
    pathMethods: {
      '/permix/get-permissions': 'GET',
    },
  } as const satisfies BetterAuthClientPlugin
}
