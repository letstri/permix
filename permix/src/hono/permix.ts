import type { Context, MiddlewareHandler } from 'hono'
import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { Rules } from '../core/permix'
import type { MaybePromise } from '../utils'
import { createMiddleware } from 'hono/factory'
import { createCheckContext, createPermix as createPermixCore, createTemplate, PermixNotFoundError } from '../core'

export interface MiddlewareContext {
  c: Context
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `checkMiddleware` denies the request. Defaults to a 403 JSON
   * response of `{ error: 'Forbidden' }`.
   */
  onForbidden?: (params: CheckContext<D> & MiddlewareContext) => MaybePromise<Response>
}

function buildPermix<D extends Definition>(
  resolveKey: () => string,
  options: PermixOptions<D> = {},
) {
  const onForbidden = options.onForbidden ?? (({ c }: CheckContext<D> & MiddlewareContext) => c.json({ error: 'Forbidden' }, 403))

  function get(c: Context): PermixCore<D> | null {
    const instance = c.get(resolveKey()) as PermixCore<D> | undefined
    return instance ?? null
  }

  function getOrThrow(c: Context): PermixCore<D> {
    const instance = get(c)
    if (!instance) {
      throw new PermixNotFoundError(resolveKey())
    }
    return instance
  }

  function setupMiddleware(
    callbackOrRules: ((context: MiddlewareContext) => MaybePromise<Rules<D>>) | Rules<D>,
  ): MiddlewareHandler {
    return createMiddleware(async (c, next) => {
      const rules = typeof callbackOrRules === 'function'
        ? await callbackOrRules({ c })
        : callbackOrRules
      c.set(resolveKey(), createPermixCore<D>(rules))
      await next()
    })
  }

  const checkMiddleware: (...args: CheckArgs<D>) => MiddlewareHandler = (...args) => {
    return createMiddleware(async (c, next) => {
      const permix = get(c)

      if (!permix) {
        throw new PermixNotFoundError(resolveKey())
      }

      const allowed = permix.check(...args)

      if (!allowed) {
        return await onForbidden({ c, ...createCheckContext(...args) })
      }

      await next()
    })
  }

  function getRules(c: Context): Rules<D> | null {
    return get(c)?.getRules() ?? null
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
  }
}

/**
 * Create a middleware factory that wires Permix into Hono routes.
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
 * @link https://permix.letstri.dev/docs/integrations/hono
 */
export function createPermix<D extends Definition>(options: PermixOptions<D> = {}) {
  let key: string = Symbol('permix') as unknown as string
  const permix = buildPermix<D>(() => key, options)

  return Object.assign(permix, {
    contextKey(newKey: string) {
      key = newKey
      return permix
    },
  })
}

/** Convenience type for the object returned by {@link createPermix}. */
export type HonoPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
