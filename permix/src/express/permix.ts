import type { Handler, NextFunction, Request, Response } from 'express'
import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { Rules, RulesPaths } from '../core/permix'
import type { MaybePromise } from '../utils'
import { createCheckContext, createPermix as createPermixCore, createTemplate, PermixNotFoundError } from '../core'

export interface MiddlewareContext {
  req: Request
  res: Response
  next: NextFunction
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `checkMiddleware` denies the request. Defaults to a 403 JSON
   * response of `{ error: 'Forbidden' }`.
   */
  onForbidden?: (params: CheckContext<D> & MiddlewareContext) => MaybePromise<void>
}

function buildPermix<D extends Definition>(
  resolveKey: () => string | symbol,
  options: PermixOptions<D> = {},
) {
  const onForbidden = options.onForbidden ?? (({ res }: CheckContext<D> & MiddlewareContext) => {
    res.status(403).json({ error: 'Forbidden' })
  })

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
  ): Handler {
    return async (req, res, next) => {
      const rules = typeof callbackOrRules === 'function'
        ? await callbackOrRules({ req, res, next })
        : callbackOrRules
      ;(req as any)[resolveKey()] = createPermixCore<D>(rules)
      return next()
    }
  }

  const checkMiddleware: (...args: CheckArgs<D>) => Handler = (...args) => {
    return async (req, res, next) => {
      const permix = get(req)

      if (!permix) {
        return next(new PermixNotFoundError(resolveKey()))
      }

      const allowed = permix.check(...args)

      if (!allowed) {
        return await onForbidden({ req, res, next, ...createCheckContext(...args) })
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
    get key() {
      return resolveKey()
    },
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

/**
 * Create a middleware factory that wires Permix into Express routes.
 *
 * Call `.contextKey('name')` to set a custom request key. Omit it to use a
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
 * @link https://permix.letstri.dev/docs/integrations/express
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

export type ExpressPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
