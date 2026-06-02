import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { Rules, RulesPaths } from '../core/permix'
import { ORPCError, os } from '@orpc/server'
import { createCheckContext, createPermix as createPermixCore, createTemplate, PermixNotFoundError } from '../core'

export interface PermixOptions<D extends Definition> {
  onForbidden?: (params: CheckContext<D> & { context: Record<string, any>, next: (...args: any[]) => any }) => any
}

function buildPermix<D extends Definition, const Key extends string>(
  resolveKey: () => string,
  options: PermixOptions<D> = {},
) {
  const forbiddenHandler = options.onForbidden ?? (() => {
    throw new ORPCError('FORBIDDEN', {
      message: 'You do not have permission to perform this action',
    })
  })

  const plugin = os.$context<{ [P in Key]: PermixCore<D> }>()

  function setupContext(rules: Rules<D>): { [P in Key]: PermixCore<D> } {
    return { [resolveKey()]: createPermixCore<D>(rules) } as { [P in Key]: PermixCore<D> }
  }

  function checkMiddleware(...args: CheckArgs<D>) {
    return plugin.middleware(async (opts) => {
      const context = opts.context as Record<string, PermixCore<D>>
      const instance = context[resolveKey()]

      if (!instance) {
        throw new PermixNotFoundError(resolveKey())
      }

      if (instance.check(...args)) {
        return opts.next()
      }

      return forbiddenHandler({ ...opts, ...createCheckContext(...args) }) as any
    })
  }

  function getRules(context: Record<string, PermixCore<D> | undefined>): Rules<D> | null {
    return context[resolveKey()]?.getRules() ?? null
  }

  function template<T = void>(rules: Rules<D> | ((param: T) => Rules<D>)) {
    return createTemplate<D, T>(rules)
  }

  return {
    setupContext,
    checkMiddleware,
    getRules,
    template,
    get key() {
      return resolveKey()
    },
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

/**
 * Create a middleware factory that wires Permix into oRPC procedures.
 *
 * Call `.contextKey('name')` to set a custom context key (its literal type is
 * inferred automatically). Omit it to use the default key `'permix'`.
 *
 * @example
 * ```ts
 * // default key 'permix'
 * const permix = createPermix<Def>()
 *
 * // custom key – type of 'permissions' is inferred
 * const permix = createPermix<Def>().contextKey('permissions')
 *
 * // with custom error handler
 * const permix = createPermix<Def>({ onForbidden: ... }).contextKey('permissions')
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/orpc
 */
export function createPermix<D extends Definition>(options: PermixOptions<D> = {}) {
  let key: string = 'permix'
  const permix = buildPermix<D, 'permix'>(() => key, options)

  return Object.assign(permix, {
    contextKey<const Key extends string>(newKey: Key) {
      key = newKey
      return permix as unknown as ReturnType<typeof buildPermix<D, Key>>
    },
  })
}

export type OrpcPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
