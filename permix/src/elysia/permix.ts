import type { Context } from 'elysia'
import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { Rules, RulesPaths } from '../core/permix'
import type { MaybePromise } from '../utils'
import { createCheckContext, createPermix as createPermixCore, createTemplate, PermixNotFoundError } from '../core'

export interface MiddlewareContext {
  context: Context
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `checkMiddleware` denies the request. Defaults to a 403 JSON
   * response of `{ error: 'Forbidden' }`.
   */
  onForbidden?: (params: CheckContext<D> & MiddlewareContext) => MaybePromise<any>
}

function buildPermix<D extends Definition>(
  resolveKey: () => string | symbol,
  options: PermixOptions<D> = {},
) {
  const onForbidden = options.onForbidden ?? (({ context }: CheckContext<D> & MiddlewareContext) => {
    context.set.status = 403
    return { error: 'Forbidden' }
  })

  function get(context: Context): PermixCore<D> | null {
    const instance = (context as any)[resolveKey()] as PermixCore<D> | undefined
    return instance ?? null
  }

  function getOrThrow(context: Context): PermixCore<D> {
    const instance = get(context)
    if (!instance) {
      throw new PermixNotFoundError(resolveKey())
    }
    return instance
  }

  function setupMiddleware(
    callbackOrRules: ((context: MiddlewareContext) => MaybePromise<Rules<D>>) | Rules<D>,
  ) {
    return async (context: Context) => {
      const rules = typeof callbackOrRules === 'function'
        ? await callbackOrRules({ context })
        : callbackOrRules
      ;(context as any)[resolveKey()] = createPermixCore<D>(rules)
    }
  }

  const checkMiddleware: (...args: CheckArgs<D>) => (context: Context) => MaybePromise<any> = (...args) => {
    return async (context) => {
      const permix = getOrThrow(context)
      const allowed = permix.check(...args)

      if (!allowed) {
        return await onForbidden({ context, ...createCheckContext(...args) })
      }
    }
  }

  function getRules(context: Context): Rules<D> | null {
    return get(context)?.getRules() ?? null
  }

  function template<T = void>(rules: Rules<D> | ((param: T) => Rules<D>)) {
    return createTemplate<D, T>(rules)
  }

  return {
    setupMiddleware,
    checkMiddleware,
    template,
    get,
    getOrThrow,
    getRules,
    get key() {
      return resolveKey()
    },
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

/**
 * Create a middleware factory that wires Permix into Elysia routes.
 *
 * Call `.contextKey('name')` to set a custom context key. Omit it to use a
 * fresh `Symbol('permix')` as the default key.
 *
 * @example
 * ```ts
 * // default symbol key
 * const permix = createPermix<Def>()
 *
 * // custom string key
 * const permix = createPermix<Def>().contextKey('permissions')
 *
 * // with custom forbidden handler
 * const permix = createPermix<Def>({ onForbidden: ... }).contextKey('permissions')
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/elysia
 */
export function createPermix<D extends Definition>(options: PermixOptions<D> = {}) {
  let key: string | symbol = Symbol('permix')
  const permix = buildPermix<D>(() => key, options)

  return Object.assign(permix, {
    contextKey(newKey: string | symbol) {
      key = newKey
      return permix
    },
  })
}

export type ElysiaPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
