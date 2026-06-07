import type { FunctionMiddlewareServerNextFn, FunctionServerResultWithContext } from '@tanstack/react-start'
import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { PermixHooks, Rules, RulesPaths } from '../core/permix'
import type { DehydratedState } from '../core/rules'
import type { MaybePromise } from '../utils'
import { createMiddleware } from '@tanstack/react-start'
import { createCheckContext, createHooks, createPermix as createPermixCore, createTemplate, PermixForbiddenError, PermixNotFoundError } from '../core'

export interface SetupContext {
  request: Request
}

export interface MiddlewareContext {
  // eslint-disable-next-line ts/no-empty-object-type
  next: FunctionMiddlewareServerNextFn<{}, unknown, undefined>
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `checkMiddleware` denies the request. By default a
   * `PermixError` is thrown, which surfaces as a server error to the caller.
   *
   * Throw a `redirect()` / `Response`, or your own error here to customise the
   * behaviour.
   */
  onForbidden?: (params: CheckContext<D> & MiddlewareContext) => MaybePromise<FunctionServerResultWithContext<any, any, any, any, any>>
}

function buildPermix<D extends Definition>(
  resolveKey: () => string | symbol,
  options: PermixOptions<D> = {},
) {
  const onForbidden = options.onForbidden ?? (() => {
    throw new PermixForbiddenError()
  })

  const hooks = createHooks<PermixHooks<D>>()

  /**
   * Returns the request-scoped Permix instance from a TanStack Start context
   * object, or `null` when not set up yet.
   */
  function get(context: Record<string | symbol, unknown> | null | undefined): PermixCore<D> | null {
    const instance = context?.[resolveKey()] as PermixCore<D> | undefined
    return instance ?? null
  }

  /**
   * Like {@link get}, but throws {@link PermixNotFoundError} when the instance
   * is missing.
   */
  function getOrThrow(context: Record<string | symbol, unknown> | null | undefined): PermixCore<D> {
    const instance = get(context)
    if (!instance) {
      throw new PermixNotFoundError(resolveKey())
    }
    return instance
  }

  /**
   * TanStack Start middleware that creates a request-scoped Permix instance,
   * calls `setup()` with the resolved rules, and stores it in the server context.
   *
   * Register it globally via `createStart({ requestMiddleware: [...] })` so it
   * runs for every request, or attach it to specific server routes.
   */
  function setupMiddleware(
    callbackOrRules: ((context: SetupContext) => MaybePromise<Rules<D>>) | Rules<D>,
  ) {
    return createMiddleware().server(async ({ next, request }) => {
      const rules = typeof callbackOrRules === 'function'
        ? await callbackOrRules({ request })
        : callbackOrRules

      const instance = createPermixCore<D>(rules)
      instance.hook('check', context => hooks.callHook('check', context))
      return next({ context: { [resolveKey()]: instance } })
    })
  }

  /**
   * TanStack Start middleware that enforces a permission check before the
   * server function handler runs.
   *
   * @example
   * ```ts
   * export const createPost = createServerFn({ method: 'POST' })
   *   .middleware([permix.checkMiddleware('post.create')])
   *   .handler(() => { ... })
   * ```
   */
  const checkMiddleware: (...args: CheckArgs<D>) => ReturnType<typeof createMiddleware> = (...args) => {
    return createMiddleware({ type: 'function' }).server(async ({ next, context }) => {
      const permix = getOrThrow(context as unknown as Record<string | symbol, unknown>)

      if (permix.check(...args)) {
        return next()
      }
      else {
        return await onForbidden({
          next,
          ...createCheckContext<D>(...args),
        })
      }
    }) as unknown as ReturnType<typeof createMiddleware>
  }

  /**
   * Serialize the request's permission state for client hydration.
   */
  function dehydrate(context: Record<string | symbol, unknown> | null | undefined): DehydratedState<D> {
    return getOrThrow(context).dehydrate()
  }

  function getRules(context: Record<string | symbol, unknown> | null | undefined): Rules<D> | null {
    return get(context)?.getRules() ?? null
  }

  function template<T = void>(rules: Rules<D> | ((param: T) => Rules<D>)) {
    return createTemplate<D, T>(rules)
  }

  return {
    setupMiddleware,
    checkMiddleware,
    get,
    getOrThrow,
    dehydrate,
    getRules,
    template,
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
 * Create a per-request Permix helper for TanStack Start.
 *
 * Uses TanStack Start's per-request server context to share a single Permix
 * instance across global middleware, server routes, server functions, and the
 * router for the lifetime of each request.
 *
 * Use `.contextKey('name')` to set a custom context key (defaults to a unique
 * `Symbol('permix')`).
 *
 * @example
 * ```ts
 * // lib/permix.ts
 * import { createPermix } from 'permix/tanstack-start'
 *
 * export const permix = createPermix<{
 *   post: ['create', 'read', 'update', 'delete']
 * }>()
 * ```
 *
 * ```ts
 * // src/start.ts
 * import { createStart } from '@tanstack/react-start'
 * import { getSession } from './lib/auth'
 * import { permix } from './lib/permix'
 *
 * export const startInstance = createStart(() => ({
 *   requestMiddleware: [
 *     permix.setupMiddleware(async ({ request }) => {
 *       const session = await getSession(request)
 *       return {
 *         post: {
 *           create: !!session,
 *           read: true,
 *           update: session?.role === 'admin',
 *           delete: session?.role === 'admin',
 *         },
 *       }
 *     }),
 *   ],
 * }))
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/tanstack-start
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
export type TanStackStartPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
