import type { Handler, NextFunction, Request, Response } from 'express'
import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { PermixHooks, Rules, RulesPaths } from '../core/permix'
import type { MaybePromise } from '../utils'
import { createCheckContext, createHooks, createPermix as createPermixCore, createTemplate, PermixNotFoundError } from '../core'

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
  const onForbidden = options.onForbidden ?? (({ res }) => {
    res.status(403).json({ error: 'Forbidden' })
  })

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
  ): Handler {
    return async (req, res, next) => {
      const rules = typeof callbackOrRules === 'function'
        ? await callbackOrRules({ req, res, next })
        : callbackOrRules
      const instance = createPermixCore<D>(rules)
      instance.hook('check', context => hooks.callHook('check', context))
      ;(req as any)[resolveKey()] = instance
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
 * Create a middleware factory that wires Permix into Express routes.
 *
 * Use `.contextKey('name')` to set a custom request key (defaults to a unique
 * `Symbol('permix')`).
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { createPermix } from 'permix/express'
 *
 * const permix = createPermix<{
 *   post: ['create', 'read']
 * }>()
 *
 * const app = express()
 * app.use(permix.setupMiddleware(({ req }) => ({
 *   post: { create: !!req.user, read: true },
 * })))
 *
 * app.get('/posts', permix.checkMiddleware('post.read'), (req, res) => {
 *   res.json({ ok: true })
 * })
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
