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
  const onForbidden = options.onForbidden ?? (({ context }) => {
    context.set.status = 'Forbidden'
    return { error: 'Forbidden' }
  })

  function get(context: Context): PermixCore<D> | null {
    const instance = (context.store as any)[resolveKey()] as PermixCore<D> | undefined
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
      ;(context.store as any)[resolveKey()] = createPermixCore<D>(rules)
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
    $inferDefinition: undefined as unknown as D,
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

/**
 * Create a middleware factory that wires Permix into Elysia routes.
 *
 * Use `.contextKey('name')` to set a custom context key (defaults to a unique
 * `Symbol('permix')`).
 *
 * @example
 * ```ts
 * import { Elysia } from 'elysia'
 * import { createPermix } from 'permix/elysia'
 *
 * const permix = createPermix<{
 *   post: ['create', 'read']
 * }>()
 *
 * new Elysia()
 *   .onBeforeHandle(permix.setupMiddleware(({ context }) => ({
 *     post: { create: true, read: true },
 *   })))
 *   .onBeforeHandle('/posts', permix.checkMiddleware('post.read'))
 *   .get('/posts', () => ({ ok: true }))
 *   .listen(3000)
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
