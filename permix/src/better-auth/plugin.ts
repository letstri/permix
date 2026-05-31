import type { BetterAuthPlugin, Session } from 'better-auth'
import type { Rules } from '../core/rules'
import type { Statement } from '../core/statements'
import type { MaybePromise } from '../utils'
import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api'
import { createPermix as createPermixCore } from '../core'

export interface PermixPluginOptions<D extends Statement, S = Session> {
  /**
   * A function that returns the permission rules based on the authenticated session.
   *
   * You can use `permix.createRules(session.user.role)` inside this callback
   * to reuse the role-based access control.
   *
   * @param session - The Better Auth session, typed from your auth instance.
   * @returns The permission rules for the current user.
   */
  rules: (session: S) => MaybePromise<Rules<D>>
}

/**
 * Create a Better Auth server plugin that exposes a
 * `GET /permix/get-permissions` endpoint.
 *
 * The endpoint runs the `rules` callback with the current session,
 * builds a Permix instance, and returns the dehydrated state.
 *
 * @link https://permix.letstri.dev/docs/integrations/better-auth
 *
 * @example
 * ```ts
 * import { betterAuth } from 'better-auth'
 * import { permixPlugin } from 'permix/better-auth'
 *
 * export const auth = betterAuth({
 *   plugins: [
 *     permixPlugin({
 *       rules: ({ user }) => permix.createRules(user.role),
 *     }),
 *   ],
 * })
 * ```
 */
export function permixPlugin<D extends Statement, S = Session>(
  options: PermixPluginOptions<D, S>,
) {
  const plugin = {
    id: 'permix',
    endpoints: {
      getPermissions: createAuthEndpoint('/permix/get-permissions', {
        method: 'GET',
        use: [sessionMiddleware],
      }, async (ctx) => {
        const rules = await options.rules(ctx.context.session as S)
        return ctx.json(createPermixCore<D>(rules).dehydrate())
      }),
    },
  } satisfies BetterAuthPlugin

  return plugin
}

export type PermixPluginInstance<D extends Statement, S = Session> = ReturnType<typeof permixPlugin<D, S>>
