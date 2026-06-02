import type { FunctionMiddlewareServerNextFn, FunctionServerResultWithContext } from '@tanstack/react-start'
import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { Rules, RulesPaths } from '../core/permix'
import type { DehydratedState } from '../core/rules'
import type { MaybePromise } from '../utils'
import { createMiddleware } from '@tanstack/react-start'
import { createCheckContext, createPermix as createPermixCore, createTemplate, PermixForbiddenError, PermixNotFoundError } from '../core'

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

  /**
   * Read the request-scoped Permix instance from a TanStack Start context
   * object (the `context` argument of a `beforeLoad`, loader, server route, or
   * server function). Returns `null` when no instance was set up for the
   * request.
   */
  function get(context: Record<string | symbol, unknown> | null | undefined): PermixCore<D> | null {
    const instance = context?.[resolveKey()] as PermixCore<D> | undefined
    return instance ?? null
  }

  /**
   * Like {@link get}, but throws {@link PermixNotFoundError} when the instance
   * is missing — usually a sign that `setupMiddleware` didn't run.
   */
  function getOrThrow(context: Record<string | symbol, unknown> | null | undefined): PermixCore<D> {
    const instance = get(context)
    if (!instance) {
      throw new PermixNotFoundError(resolveKey())
    }
    return instance
  }

  /**
   * A TanStack Start **request** middleware that creates a fresh, request-scoped
   * Permix instance, runs `setup()` with the resolved rules, and exposes the
   * instance on the server request context (under the configured key).
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

      return next({ context: { [resolveKey()]: createPermixCore<D>(rules) } })
    })
  }

  /**
   * A TanStack Start **function** middleware that enforces a permission check
   * before a server function's handler runs. Relies on `setupMiddleware`
   * having populated the request context.
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
   * Serialize the request's permission state. Convenience wrapper around
   * `getOrThrow(context).dehydrate()` for handing rules to the client.
   */
  function dehydrate(context: Record<string | symbol, unknown> | null | undefined): DehydratedState<D> {
    return getOrThrow(context).dehydrate()
  }

  function getRules(context: Record<string | symbol, unknown> | null | undefined): Rules<D> | null {
    return get(context)?.getRules() ?? null
  }

  /** Same as the core `template` helper, re-exposed for convenience. */
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
    get key() {
      return resolveKey()
    },
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

/**
 * Create a per-request Permix helper for TanStack Start.
 *
 * Unlike the Next.js integration (which relies on React's request-scoped
 * `cache()`), TanStack Start exposes a per-request **server context** that is
 * shared across global middleware, server routes, server functions, and the
 * router. This integration leans on that: `setupMiddleware` creates a fresh
 * core instance per request and injects it into the context, and `get()`
 * reads it back anywhere on the server.
 *
 * Call `.contextKey('name')` to set a custom context key. Omit it to use a
 * fresh `Symbol('permix')` as the default key.
 *
 * Typical flow:
 *
 * 1. Create the helper once in a module (e.g. `lib/permix.ts`).
 * 2. Register `setupMiddleware()` as a global request middleware in
 *    `src/start.ts` so every request gets its own instance.
 * 3. Read it with `get(context)` inside `beforeLoad`, loaders, server routes,
 *    or server functions.
 * 4. Guard server functions declaratively with `checkMiddleware(...)`.
 * 5. Send `dehydrate(context)` to the client and hydrate it with
 *    `PermixHydrate` from `permix/react`.
 *
 * @example
 * ```ts
 * // lib/permix.ts
 * import { createPermix } from 'permix/tanstack-start'
 *
 * export const permix = createPermix<{
 *   post: ['create', 'read', 'update', 'delete']
 * }>()
 *
 * // custom string key
 * const permix = createPermix<Def>().contextKey('permissions')
 *
 * // with custom forbidden handler
 * const permix = createPermix<Def>({ onForbidden: ... }).contextKey('permissions')
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

/** Convenience type for the object returned by {@link createPermix}. */
export type TanStackStartPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
