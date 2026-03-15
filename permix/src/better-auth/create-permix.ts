import type { BetterAuthClientPlugin } from 'better-auth/client'
import type { BetterAuthPlugin } from 'better-auth'
import type { PermixDefinition, PermixRules } from '../core/create-permix'
import type { MaybePromise } from '../core/utils'
import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api'
import { createPermix as createPermixCore } from '../core/create-permix'
import { createTemplate } from '../core/template'

export interface PermixSession {
  user: Record<string, unknown>
  session: Record<string, unknown>
}

export interface PermixOptions<T extends PermixDefinition> {
  /**
   * A function that returns the permission rules based on the authenticated session.
   *
   * @param session - The Better-Auth session object containing `user` and `session` data.
   * @returns The permission rules for the current user.
   */
  rules: (session: PermixSession) => MaybePromise<PermixRules<T>>
}

/**
 * Create a Permix integration for Better Auth.
 *
 * Returns a Better Auth server `plugin` and a reusable `rules` function.
 *
 * @link https://permix.letstri.dev/docs/integrations/better-auth
 */
export function createPermix<Definition extends PermixDefinition>(
  options: PermixOptions<Definition>,
) {
  const plugin = {
    id: 'permix',
    endpoints: {
      getPermissions: createAuthEndpoint('/permix/permissions', {
        method: 'GET',
        use: [sessionMiddleware],
      }, async (ctx) => {
        const rules = await options.rules(ctx.context.session)
        const permix = createPermixCore<Definition>(rules)

        return ctx.json(permix.dehydrate())
      }),
    },
  } satisfies BetterAuthPlugin

  function template<T = void>(...params: Parameters<typeof createTemplate<T, Definition>>) {
    return createTemplate<T, Definition>(...params)
  }

  return {
    plugin,
    rules: options.rules,
    template,
  }
}

/**
 * Create a Permix client plugin for Better Auth.
 *
 * Infers the server plugin's `/permix/permissions` endpoint.
 *
 * @link https://permix.letstri.dev/docs/integrations/better-auth
 */
export function permixClient<T extends { plugin: BetterAuthPlugin }>() {
  return {
    id: 'permix',
    $InferServerPlugin: {} as T['plugin'],
    pathMethods: {
      '/permix/permissions': 'GET',
    },
  } satisfies BetterAuthClientPlugin
}
