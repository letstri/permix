import type { Context, MiddlewareHandler } from 'hono'
import type { Permix, PermixDefinition } from '../core/createPermix'

export interface PermixHonoOptions<T extends PermixDefinition> {
  /**
   * Custom error handler
   */
  onUnauthorized?: (params: { c: Context, entity: keyof T, actions: T[keyof T]['action'][] }) => Response | Promise<Response>
}

/**
 * Create a middleware function that checks permissions for Hono routes.
 *
 * @link https://permix.letstri.dev/docs/integrations/hono
 */
export function createPermixMiddleware<T extends PermixDefinition>(
  permix: Permix<T>,
  options: PermixHonoOptions<T> = {},
) {
  const {
    onUnauthorized = ({ c }) => c.json({ error: 'Forbidden' }, 403),
  } = options

  const check = <K extends keyof T>(entity: K, action: 'all' | T[K]['action'] | T[K]['action'][]): MiddlewareHandler => {
    return async (c, next) => {
      const hasPermission = permix.check(entity, action)

      if (!hasPermission) {
        return onUnauthorized({ c, entity, actions: Array.isArray(action) ? action : [action] })
      }

      return next()
    }
  }

  return { check }
}
