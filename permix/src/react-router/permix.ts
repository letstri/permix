import type { Permix as PermixCore } from '../core'
import {
  createCheckContext,
  createHooks,
  createPermix as createPermixCore,
  createTemplate,
  PermixNotFoundError,
} from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { PermixHooks, Rules, RulesPaths } from '../core/permix'
import type { DehydratedState } from '../core/rules'
import type { MaybePromise } from '../utils'

/**
 * Opaque key used with React Router's `context.set` / `context.get`.
 * Compatible with `RouterContext` from `react-router`.
 */
export interface ReactRouterContextKey<T> {
  readonly __permix?: T
}

/**
 * Structural React Router middleware context. Compatible with
 * `RouterContextProvider` from `react-router`.
 */
export interface ReactRouterContext {
  get: (key: ReactRouterContextKey<any>) => unknown
  set: (key: ReactRouterContextKey<any>, value: unknown) => void
}

export interface MiddlewareArgs {
  request: Request
  context: ReactRouterContext
  params?: Record<string, string | undefined>
}

export type MiddlewareNext = () => MaybePromise<Response>

/**
 * React Router middleware: `(args, next) => Response`. Compatible with
 * `MiddlewareFunction` from `react-router` 7.9+.
 */
export type ReactRouterMiddleware = (
  args: MiddlewareArgs,
  next: MiddlewareNext
) => MaybePromise<Response>

export interface SetupContext {
  request: Request
  /** Middleware context, so rules can read values set by earlier middleware. */
  context: ReactRouterContext
  params?: Record<string, string | undefined>
}

export interface MiddlewareContext {
  request: Request
  context: ReactRouterContext
  next: MiddlewareNext
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `checkMiddleware` denies the request. Defaults to a 403 JSON
   * response of `{ error: 'Forbidden' }`.
   */
  onForbidden?: (
    params: CheckContext<D> & MiddlewareContext
  ) => MaybePromise<Response>
}

function buildPermix<D extends Definition>(
  resolveKey: () => ReactRouterContextKey<PermixCore<D>>,
  options: PermixOptions<D> = {}
) {
  const onForbidden =
    options.onForbidden ??
    (() =>
      new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }))

  const hooks = createHooks<PermixHooks<D>>()

  function get(
    context: ReactRouterContext | null | undefined
  ): PermixCore<D> | null {
    const instance = context?.get(resolveKey()) as PermixCore<D> | undefined
    return instance ?? null
  }

  function getOrThrow(
    context: ReactRouterContext | null | undefined
  ): PermixCore<D> {
    const instance = get(context)
    if (!instance) {
      throw new PermixNotFoundError()
    }
    return instance
  }

  function setupMiddleware(
    callbackOrRules:
      | ((setup: SetupContext) => MaybePromise<Rules<D>>)
      | Rules<D>
  ): ReactRouterMiddleware {
    return async ({ request, context, params }, next) => {
      const rules =
        typeof callbackOrRules === 'function'
          ? await callbackOrRules({ request, context, params })
          : callbackOrRules
      const instance = createPermixCore<D>(rules)
      instance.hook('check', (checkContext) => {
        hooks.callHook('check', checkContext)
      })
      context.set(resolveKey(), instance)
      return await next()
    }
  }

  const checkMiddleware: (...args: CheckArgs<D>) => ReactRouterMiddleware =
    (...args) =>
    async ({ request, context }, next) => {
      const permix = get(context)

      if (!permix) {
        throw new PermixNotFoundError()
      }

      const allowed = permix.check(...args)

      if (!allowed) {
        return await onForbidden({
          request,
          context,
          next,
          ...createCheckContext(...args),
        })
      }

      return await next()
    }

  function dehydrate(
    context: ReactRouterContext | null | undefined
  ): DehydratedState<D> {
    return getOrThrow(context).dehydrate()
  }

  function getRules(
    context: ReactRouterContext | null | undefined
  ): Rules<D> | null {
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
    get context() {
      return resolveKey()
    },
    $inferDefinition: undefined as unknown as D,
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

/**
 * Create a per-request Permix helper for React Router 7 (including Remix).
 *
 * Uses React Router middleware context (`context.set` / `context.get`) so
 * loaders, actions, and middleware share one instance per request. Hydrate
 * the client with `permix/react`.
 *
 * @example
 * ```ts
 * // app/lib/permix.ts
 * import { createPermix } from 'permix/react-router'
 *
 * export const permix = createPermix<{
 *   post: ['create', 'read', 'update', 'delete']
 * }>()
 * ```
 *
 * ```ts
 * // app/root.tsx
 * import { permix } from './lib/permix'
 *
 * export const middleware = [
 *   permix.setupMiddleware(({ request }) => ({
 *     post: { create: true, read: true, update: false, delete: false },
 *   })),
 * ]
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/react-router
 */
export function createPermix<D extends Definition>(
  options: PermixOptions<D> = {}
) {
  const key: ReactRouterContextKey<PermixCore<D>> = {}
  return buildPermix<D>(() => key, options)
}

export type ReactRouterPermix<D extends Definition> = ReturnType<
  typeof createPermix<D>
>
