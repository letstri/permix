import type { Permix, PermixDefinition, PermixRules } from '../core/create-permix'
import type { CheckContext, CheckFunctionParams } from '../core/params'
import { ORPCError, os } from '@orpc/server'
import { createPermix as createPermixCore } from '../core/create-permix'
import { createCheckContext } from '../core/params'
import { createTemplate } from '../core/template'
import { pick } from '../utils'

type PermixInstance<Definition extends PermixDefinition> = Pick<Permix<Definition>, 'check' | 'dehydrate'>

export interface PermixOrpc<
  Definition extends PermixDefinition,
> {
  setup: (rules: PermixRules<Definition>) => PermixInstance<Definition>
  checkMiddleware: <EntityKey extends keyof Definition>(...params: CheckFunctionParams<Definition, EntityKey>) => any
  template: <T = void>(
    ...params: Parameters<typeof createTemplate<Definition, T>>
  ) => ReturnType<typeof createTemplate<Definition, T>>
}

export interface PermixOptions<T extends PermixDefinition, ContextKey extends string = string> {
  /**
   * The key in the context object where the permix instance is stored.
   * @default 'permix'
   */
  contextKey?: ContextKey
  /**
   * Custom error to throw when permission is denied
   */
  forbiddenError?: <C = unknown>(params: CheckContext<T> & { context: C }) => ORPCError<any, any>
}

/**
 * Create a middleware function that checks permissions for ORPC routes.
 *
 * @link https://permix.letstri.dev/docs/integrations/orpc
 */
export function createPermix<
  Definition extends PermixDefinition,
  ContextKey extends string = string,
>(
  {
    contextKey = 'permix' as ContextKey,
    forbiddenError = () => new ORPCError('FORBIDDEN', {
      message: 'You do not have permission to perform this action',
    }),
  }: PermixOptions<Definition, ContextKey> = {},
): PermixOrpc<Definition> {
  const plugin = os.$context<Record<ContextKey, PermixInstance<Definition>>>()

  function setup(rules: PermixRules<Definition>) {
    return pick(createPermixCore<Definition>(rules), ['check', 'dehydrate'])
  }

  function checkMiddleware<K extends keyof Definition>(...params: CheckFunctionParams<Definition, K>) {
    return plugin.middleware(async ({ context, next }) => {
      if (!context[contextKey]) {
        throw new Error('[Permix] Instance not found. Please use the `setupMiddleware` function.')
      }

      const hasPermission = context[contextKey].check(...params)

      if (!hasPermission) {
        const error = typeof forbiddenError === 'function'
          ? forbiddenError({
              ...createCheckContext(...params),
              context,
            })
          : forbiddenError

        if (!(error instanceof ORPCError)) {
          console.error('[Permix]: forbiddenError is not ORPCError')

          throw new ORPCError('FORBIDDEN', {
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
