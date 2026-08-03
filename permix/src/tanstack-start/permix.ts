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

/**
 * The subset of TanStack Start's request middleware server options that
 * {@link createSetupHandler} needs. Kept structural so the handler stays
 * assignable across TanStack Start versions (peer dependency is `>=1`).
 */
export interface SetupHandlerContext {
  request: Request
  next: (options: { context: Record<string | symbol, unknown> }) => any
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
   * Build the server handler used by {@link setupMiddleware}, for passing to
   * your own `createMiddleware().server(...)` call.
   *
   * Prefer `setupMiddleware()` unless the callback reaches for server-only
   * imports (a database client, an auth library, `node:` builtins). TanStack
   * Start strips `.server()` bodies from the client bundle by matching
   * `createMiddleware().server(...)` **in your own source**. It cannot see the
   * `.server()` call hidden inside `setupMiddleware()`, so those imports stay
   * in the client graph and surface as `Buffer is not defined` or externalized
   * `node:` module warnings in the browser.
   *
   * Writing the `.server()` boundary yourself puts the callback where the
   * compiler can strip it.
   *
   * @example
   * ```ts
   * import { createMiddleware } from '@tanstack/react-start'
   * import { auth } from './lib/auth'
   * import { permix } from './lib/permix'
   *
   * export const permixMiddleware = createMiddleware().server(
   *   permix.createSetupHandler(async ({ request }) => {
   *     const session = await auth.api.getSession({ headers: request.headers })
   *     return { post: { create: !!session, read: true } }
   *   }),
   * )
   * ```
   *
   * @link https://permix.letstri.dev/docs/integrations/tanstack-start#server-only-imports-in-the-setup-callback
   */
  function createSetupHandler(
    callbackOrRules: ((context: SetupContext) => MaybePromise<Rules<D>>) | Rules<D>,
  ) {
    return async ({ next, request }: SetupHandlerContext): Promise<any> => {
      const rules = typeof callbackOrRules === 'function'
        ? await callbackOrRules({ request })
        : callbackOrRules

      const instance = createPermixCore<D>(rules)
      instance.hook('check', context => hooks.callHook('check', context))
      return next({ context: { [resolveKey()]: instance } })
    }
  }

  /**
   * TanStack Start middleware that creates a request-scoped Permix instance,
   * calls `setup()` with the resolved rules, and stores it in the server context.
   *
   * Register it globally via `createStart({ requestMiddleware: [...] })` so it
   * runs for every request, or attach it to specific server routes.
   *
   * If the callback imports server-only code, use {@link createSetupHandler}
   * instead so TanStack Start can strip it from the client bundle.
   */
  function setupMiddleware(
    callbackOrRules: ((context: SetupContext) => MaybePromise<Rules<D>>) | Rules<D>,
  ) {
    return createMiddleware().server(createSetupHandler(callbackOrRules))
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
    createSetupHandler,
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
 * Use `.contextKey('name')` to set a custom context key (defaults to
 * `'__permix'`).
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
  let key: string = '__permix'
  const permix = buildPermix<D>(() => key, options)

  const instance = Object.assign(permix, {
    contextKey(newKey: string) {
      key = newKey
      return instance
    },
  })

  return instance
}

/** Return type of {@link createPermix}. */
export type TanStackStartPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
