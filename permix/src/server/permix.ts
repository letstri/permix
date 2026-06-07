import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { PermixHooks, Rules, RulesPaths } from '../core/permix'
import type { MaybePromise } from '../utils'
import { createCheckContext, createHooks, createPermix as createPermixCore, createTemplate, PermixNotFoundError } from '../core'

export type NextFunction = () => MaybePromise<Response>

/**
 * Fetch middleware compatible with [srvx](https://srvx.h3.dev/guide/middleware)
 * and other web-standard server handlers.
 */
export type Middleware = (req: Request, next: NextFunction) => MaybePromise<Response>

export interface MiddlewareContext {
  req: Request
  next: NextFunction
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `checkMiddleware` denies the request. Defaults to a 403 JSON
   * response of `{ error: 'Forbidden' }`.
   */
  onForbidden?: (params: CheckContext<D> & MiddlewareContext) => MaybePromise<Response>
}

function buildPermix<D extends Definition>(
  resolveKey: () => string | symbol,
  options: PermixOptions<D> = {},
) {
  const onForbidden = options.onForbidden ?? (() =>
    new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }))

  const hooks = createHooks<PermixHooks<D>>()

  function get(req: Request): PermixCore<D> | null {
    const instance = (req as any)[resolveKey()] as PermixCore<D> | undefined
    return instance ?? null
  }

  function getOrThrow(req: Request): PermixCore<D> {
    const instance = get(req)
    if (!instance) {
      throw new PermixNotFoundError(resolveKey())
    }
    return instance
  }

  function setupMiddleware(
    callbackOrRules: ((context: MiddlewareContext) => MaybePromise<Rules<D>>) | Rules<D>,
  ): Middleware {
    return async (req, next) => {
      const rules = typeof callbackOrRules === 'function'
        ? await callbackOrRules({ req, next })
        : callbackOrRules
      const instance = createPermixCore<D>(rules)
      instance.hook('check', context => hooks.callHook('check', context))
      ;(req as any)[resolveKey()] = instance
      return next()
    }
  }

  const checkMiddleware: (...args: CheckArgs<D>) => Middleware = (...args) => {
    return async (req, next) => {
      const permix = get(req)

      if (!permix) {
        throw new PermixNotFoundError(resolveKey())
      }

      const allowed = permix.check(...args)

      if (!allowed) {
        return await onForbidden({ req, next, ...createCheckContext(...args) })
      }

      return next()
    }
  }

  function getRules(req: Request): Rules<D> | null {
    return get(req)?.getRules() ?? null
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
    hook: hooks.hook,
    hookOnce: hooks.hookOnce,
    get key() {
      return resolveKey()
    },
    $inferDefinition: undefined as unknown as D,
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

/**
 * Create a middleware factory that wires Permix into fetch-style request handlers.
 *
 * Middleware follows the web-standard `(req, next) => Response` pattern used by
 * [srvx](https://github.com/h3js/srvx) and similar runtimes.
 *
 * Call `.contextKey('name')` to set a custom request key. Omit it to use a
 * fresh `Symbol('permix')` as the default key.
 *
 * @example
 * ```ts
 * import { serve } from 'srvx'
 * import { createPermix } from 'permix/server'
 *
 * const permix = createPermix<Def>()
 *
 * serve({
 *   middleware: [
 *     permix.setupMiddleware(({ req }) => ({
 *       post: { create: true, read: true, update: false, delete: false },
 *     })),
 *   ],
 *   fetch(req) {
 *     return permix.checkMiddleware('post.create')(req, () =>
 *       Response.json({ ok: true }),
 *     )
 *   },
 * })
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/server
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

export type ServerPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
