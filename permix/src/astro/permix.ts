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
import type { MaybePromise } from '../utils'

/**
 * Minimal Astro `locals` bag. Compatible with `App.Locals`.
 */
export type AstroLocals = object

/**
 * Minimal Astro middleware / endpoint context. Compatible with `APIContext`
 * from `astro`.
 */
export interface AstroContext {
  request: Request
  locals: AstroLocals
}

export type MiddlewareNext = () => MaybePromise<Response>

/**
 * Astro middleware: `(context, next) => Response`. Compatible with
 * `defineMiddleware` and `sequence` from `astro:middleware`.
 */
export type AstroMiddleware = (
  context: AstroContext,
  next: MiddlewareNext
) => MaybePromise<Response>

export interface MiddlewareContext {
  context: AstroContext
  request: Request
  locals: AstroLocals
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

function isContext(source: AstroContext | AstroLocals): source is AstroContext {
  return (
    typeof source === 'object' &&
    source !== null &&
    'locals' in source &&
    'request' in source
  )
}

function readLocals(source: AstroContext | AstroLocals): AstroLocals {
  return isContext(source) ? source.locals : source
}

function buildPermix<D extends Definition>(
  resolveKey: () => string | symbol,
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

  function get(source: AstroContext | AstroLocals): PermixCore<D> | null {
    const locals = readLocals(source) as Record<PropertyKey, unknown>
    const instance = locals[resolveKey()] as PermixCore<D> | undefined
    return instance ?? null
  }

  function getOrThrow(source: AstroContext | AstroLocals): PermixCore<D> {
    const instance = get(source)
    if (!instance) {
      throw new PermixNotFoundError(resolveKey())
    }
    return instance
  }

  function setupMiddleware(
    callbackOrRules:
      | ((context: MiddlewareContext) => MaybePromise<Rules<D>>)
      | Rules<D>
  ): AstroMiddleware {
    return async (context, next) => {
      const rules =
        typeof callbackOrRules === 'function'
          ? await callbackOrRules({
              context,
              request: context.request,
              locals: context.locals,
              next,
            })
          : callbackOrRules
      const instance = createPermixCore<D>(rules)
      instance.hook('check', (checkContext) => {
        hooks.callHook('check', checkContext)
      })
      const locals = context.locals as Record<PropertyKey, unknown>
      locals[resolveKey()] = instance
      return await next()
    }
  }

  const checkMiddleware: (...args: CheckArgs<D>) => AstroMiddleware =
    (...args) =>
    async (context, next) => {
      const permix = get(context)

      if (!permix) {
        throw new PermixNotFoundError(resolveKey())
      }

      const allowed = permix.check(...args)

      if (!allowed) {
        return await onForbidden({
          context,
          request: context.request,
          locals: context.locals,
          next,
          ...createCheckContext(...args),
        })
      }

      return await next()
    }

  function getRules(source: AstroContext | AstroLocals): Rules<D> | null {
    return get(source)?.getRules() ?? null
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
 * Create a middleware factory that wires Permix into Astro.
 *
 * The instance is stored on `context.locals`, so middleware, endpoints, and
 * server-rendered pages in the same request share one instance.
 *
 * @example
 * ```ts
 * // src/middleware.ts
 * import { defineMiddleware } from 'astro:middleware'
 * import { createPermix } from 'permix/astro'
 *
 * export const permix = createPermix<{
 *   post: ['create', 'read', 'update', 'delete']
 * }>()
 *
 * export const onRequest = defineMiddleware(
 *   permix.setupMiddleware(({ request }) => ({
 *     post: { create: true, read: true, update: false, delete: false },
 *   })),
 * )
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/astro
 */
export function createPermix<D extends Definition>(
  options: PermixOptions<D> = {}
) {
  let key: string | symbol = Symbol('permix')
  const permix = buildPermix<D>(() => key, options)

  return Object.assign(permix, {
    contextKey(newKey: string | symbol) {
      key = newKey
      return permix
    },
  })
}

export type AstroPermix<D extends Definition> = ReturnType<
  typeof createPermix<D>
>
