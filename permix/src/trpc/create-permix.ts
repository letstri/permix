import type { Permix, PermixDefinition, PermixRules } from '../core/create-permix'
import type { CheckContext, CheckFunctionParams } from '../core/params'
import { initTRPC, TRPCError } from '@trpc/server'
import { createPermix as createPermixCore } from '../core/create-permix'
import { createCheckContext } from '../core/params'
import { createTemplate } from '../core/template'
import { pick } from '../utils'

export interface PermixOptions<T extends PermixDefinition> {
  /**
   * Custom error to throw when permission is denied
   */
  forbiddenError?: <C = unknown>(params: CheckContext<T> & { ctx: C }) => TRPCError
}

/**
 * Create a middleware function that checks permissions for TRPC routes.
 *
 * @link https://permix.letstri.dev/docs/integrations/trpc
 */
export function createPermix<Definition extends PermixDefinition>(
  {
    forbiddenError = () => new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
    }),
  }: PermixOptions<Definition> = {},
) {
  const plugin = initTRPC.context<{ permix: Pick<Permix<Definition>, 'check' | 'dehydrate'> }>().create()

  function setup(rules: PermixRules<Definition>) {
    return pick(createPermixCore<Definition>(rules), ['check', 'dehydrate'])
  }

  function checkMiddleware<K extends keyof Definition>(...params: CheckFunctionParams<Definition, K>) {
    return plugin.middleware(async ({ ctx, next }) => {
      if (!ctx.permix) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '[Permix] Instance not found. Please use the `setup` function.',
        })
      }

      const hasPermission = ctx.permix.check(...params)

      if (!hasPermission) {
        const error = typeof forbiddenError === 'function'
          ? forbiddenError({
              ...createCheckContext(...params),
              ctx,
            })
          : forbiddenError

        if (!(error instanceof TRPCError)) {
          console.error('[Permix]: forbiddenError is not TRPCError')

          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to perform this action',
          })
        }

        throw error
      }

      return next()
    })
  }

  function template<T = void>(...params: Parameters<typeof createTemplate<Definition, T>>) {
    return createTemplate<Definition, T>(...params)
  }

  return {
    setup,
    checkMiddleware,
    template,
  }
}
