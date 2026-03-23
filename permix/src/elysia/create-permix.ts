import type { Context } from 'elysia'
import type { Permix, PermixDefinition, PermixRules } from '../core/create-permix'
import type { CheckContext, CheckFunctionParams } from '../core/params'
import type { MaybePromise } from '../core/utils'
import { createPermix as createPermixCore } from '../core/create-permix'
import { createCheckContext } from '../core/params'
import { createTemplate } from '../core/template'
import { pick } from '../utils'

export interface ElysiaContext {
  context: Context
}

export interface PermixOptions<T extends PermixDefinition> {
  /**
   * Custom error handler
   */
  onForbidden?: (params: CheckContext<T> & ElysiaContext) => MaybePromise<any>
}

/**
 * Create a middleware function that checks permissions for Elysia routes.
 *
 * @link https://permix.letstri.dev/docs/integrations/elysia
 */
export function createPermix<Definition extends PermixDefinition>(
  {
    onForbidden = ({ context }) => {
      context.set.status = 403
      return { error: 'Forbidden' }
    },
  }: PermixOptions<Definition> = {},
) {
  const derive = (rules: PermixRules<Definition>) => ({
    permix: pick(createPermixCore<Definition>(rules), ['check', 'dehydrate']),
  })

  const checkHandler = <K extends keyof Definition>(...params: CheckFunctionParams<Definition, K>) => {
    return async (context: Context & { permix: Pick<Permix<Definition>, 'check' | 'dehydrate'> }) => {
      if (!context.permix) {
        throw new Error('[Permix]: Instance not found. Please use the `setupMiddleware` function.')
      }

      const hasPermission = context.permix.check(...params)

      if (!hasPermission) {
        return onForbidden({
          context,
          ...createCheckContext(...params),
        })
      }
    }
  }

  function template<T = void>(...params: Parameters<typeof createTemplate<Definition, T>>) {
    return createTemplate<Definition, T>(...params)
  }

  return {
    derive,
    checkHandler,
    template,
  }
}
