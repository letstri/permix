import type { Permix, PermixDefinition } from '../core/createPermix'
import { TRPCError } from '@trpc/server'

export interface PermixMiddlewareOptions<T extends PermixDefinition> {
  /**
   * Custom error to throw when permission is denied
   */
  unauthorizedError?: TRPCError | ((params: { entity: keyof T, actions: T[keyof T]['action'][] }) => TRPCError)
}

/**
 * Create a middleware function that checks permissions for TRPC routes.
 *
 * @link https://permix.letstri.dev/docs/integrations/trpc
 */
export function createPermixMiddleware<T extends PermixDefinition>(
  permix: Permix<T>,
  options: PermixMiddlewareOptions<T> = {},
) {
  const {
    unauthorizedError = new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You do not have permission to perform this action',
    }),
  } = options

  const check = <K extends keyof T>(entity: K, action: 'all' | T[K]['action'] | T[K]['action'][]) => {
    const middleware = ({ next }: { next: () => Promise<any> }) => {
      const hasPermission = permix.check(entity, action)

      if (!hasPermission) {
        let error: TRPCError

        if (typeof unauthorizedError === 'function') {
          error = unauthorizedError({
            entity,
            actions: Array.isArray(action) ? action : [action],
          })
        }
        else {
          error = unauthorizedError
        }

        if (!(error instanceof TRPCError)) {
          console.error('unauthorizedError is not TRPCError')

          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to perform this action',
          })
        }

        throw error
      }

      return next()
    }

    return middleware
  }

  return { check }
}
