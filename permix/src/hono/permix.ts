import type { Context, MiddlewareHandler } from 'hono'
import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { PermixHooks, Rules, RulesPaths } from '../core/permix'
import type { MaybePromise } from '../utils'
import { createMiddleware } from 'hono/factory'
import { createCheckContext, createHooks, createPermix as createPermixCore, createTemplate, PermixNotFoundError } from '../core'

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

// Hono's TypeScript types for `c.get`/`c.set` only accept strings, but the
// runtime store handles symbols too — cast here to keep types happy.
function keyToString(key: string | symbol): string {
  return key as string
}

function buildPermix<D extends Definition>(
  resolveKey: () => string | symbol,
  options: PermixOptions<D> = {},
) {
  const onForbidden = options.onForbidden ?? (({ c }) => c.json({ error: 'Forbidden' }, 403))

  const hooks = createHooks<PermixHooks<D>>()

  function get(c: Context): PermixCore<D> | null {
    const instance = c.get(keyToString(resolveKey())) as PermixCore<D> | undefined
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
      const instance = createPermixCore<D>(rules)
      instance.hook('check', context => hooks.callHook('check', context))
      c.set(keyToString(resolveKey()), instance)
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
 * Create a middleware factory that wires Permix into Hono routes.
 *
 * Use `.contextKey('name')` to set a custom context key (defaults to a unique
 * `Symbol('permix')`).
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { createPermix } from 'permix/hono'
 *
 * const permix = createPermix<{
 *   post: ['create', 'read']
 * }>()
 *
 * const app = new Hono()
 * app.use(permix.setupMiddleware(({ c }) => ({
 *   post: { create: true, read: true },
 * })))
 *
 * app.get('/posts', permix.checkMiddleware('post.read'), c => c.json({ ok: true }))
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/hono
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

/** Return type of {@link createPermix}. */
export type HonoPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
