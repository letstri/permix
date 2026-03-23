import type { BetterAuthClientPlugin, BetterAuthPlugin, Session, User } from 'better-auth'
import type { PermixDefinition, PermixRules, PermixStateJSON } from '../core/create-permix'
import type { MaybePromise } from '../core/utils'
import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api'
import { createPermix as createPermixCore } from '../core/create-permix'
import { createTemplate } from '../core/template'

interface PermixSession {
  user: User & Record<string, any>
  session: Session & Record<string, any>
}

let _rules: ((session: any) => MaybePromise<any>) | null = null

export interface PermixPluginInstance<D extends PermixDefinition = PermixDefinition> {
  id: 'permix'
  endpoints: {
    getPermissions: {
      path: '/permix/get-permissions'
      options: { method: 'GET' }
      (ctx: { headers: Headers }): Promise<PermixStateJSON<D>>
    }
  }
}

/**
 * Create a Permix plugin for Better Auth.
 *
 * Registers a `GET /permix/get-permissions` endpoint.
 * Pass your `Definition` type parameter to get typed permissions
 * from `auth.api.getPermissions()`.
 *
 * @link https://permix.letstri.dev/docs/integrations/better-auth
 */
export function permixPlugin<D extends PermixDefinition = PermixDefinition>(): PermixPluginInstance<D> {
  const plugin = {
    id: 'permix',
    endpoints: {
      getPermissions: createAuthEndpoint('/permix/get-permissions', {
        method: 'GET',
        use: [sessionMiddleware],
      }, async (ctx) => {
        if (!_rules) {
          throw new Error('[Permix]: Rules not configured. Make sure to call createPermix().')
        }
        const rules = await _rules(ctx.context.session)
        const permix = createPermixCore(rules)
        return ctx.json(permix.dehydrate())
      }),
    },
  } satisfies BetterAuthPlugin

  return plugin as PermixPluginInstance<D>
}

export interface PermixOptions<T extends PermixDefinition, Session> {
  /**
   * A function that returns the permission rules based on the authenticated session.
   *
   * @param session - The Better Auth session, typed from your auth instance.
   * @returns The permission rules for the current user.
   */
  rules: (session: Session) => MaybePromise<PermixRules<T>>
}

/**
 * Create a Permix integration for Better Auth.
 *
 * Pass your `Definition` and session type to get typed rules.
 * Use `typeof auth.$Infer.Session` for the session type.
 *
 * @example
 * ```ts
 * type Session = typeof auth.$Infer.Session
 * const permix = createPermix<Definition, Session>({
 *   rules: ({ user }) => ({ ... }),
 * })
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/better-auth
 */
export function createPermix<Definition extends PermixDefinition, S extends PermixSession = PermixSession>(options: PermixOptions<Definition, S>) {
  _rules = options.rules

  function template<T = void>(...params: Parameters<typeof createTemplate<Definition, T>>) {
    return createTemplate<Definition, T>(...params)
  }

  return {
    rules: options.rules,
    template,
  }
}

/**
 * Create a Permix client plugin for Better Auth.
 *
 * Pass your `Definition` type parameter to get typed permission data
 * from `authClient.permix.getPermissions()`.
 *
 * @link https://permix.letstri.dev/docs/integrations/better-auth
 */
export function permixClient<D extends PermixDefinition = PermixDefinition>(): {
  id: 'permix'
  $InferServerPlugin: PermixPluginInstance<D>
  pathMethods: {
    '/permix/get-permissions': 'GET'
  }
} {
  return {
    id: 'permix',
    $InferServerPlugin: {} as PermixPluginInstance<D>,
    pathMethods: {
      '/permix/get-permissions': 'GET',
    },
  } as const satisfies BetterAuthClientPlugin
}
