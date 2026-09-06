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
 * Minimal h3 / Nitro event shape. Compatible with `H3Event` from `h3` and the
 * value returned by Nuxt's `useRequestEvent()`, so this entry has no runtime
 * dependency on `h3`.
 */
export interface NuxtEvent {
  context: object
}

/**
 * Plain h3 event handler. Wrap it with `defineEventHandler` (or pass it to
 * `onRequest`) in Nuxt server middleware and routes.
 */
export type EventHandler = (event: NuxtEvent) => Promise<void>

export interface MiddlewareContext {
  event: NuxtEvent
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `checkMiddleware` denies the request. Defaults to throwing an
   * error with `statusCode: 403`, which h3 turns into a 403 response. Throw
   * `createError(...)` here to customise the response.
   */
  onForbidden?: (
    params: CheckContext<D> & MiddlewareContext
  ) => MaybePromise<void>
}

function buildPermix<D extends Definition>(
  resolveKey: () => string | symbol,
  options: PermixOptions<D> = {}
) {
  const onForbidden =
    options.onForbidden ??
    (() => {
      // h3 reads statusCode/statusMessage/data off thrown errors.
      throw Object.assign(new Error('Forbidden'), {
        statusCode: 403,
        statusMessage: 'Forbidden',
        data: { error: 'Forbidden' },
      })
    })

  const hooks = createHooks<PermixHooks<D>>()

  function get(event: NuxtEvent): PermixCore<D> | null {
    const instance = (event.context as any)[resolveKey()] as
      | PermixCore<D>
      | undefined
    return instance ?? null
  }

  function getOrThrow(event: NuxtEvent): PermixCore<D> {
    const instance = get(event)
    if (!instance) {
      throw new PermixNotFoundError(resolveKey())
    }
    return instance
  }

  function setupMiddleware(
    callbackOrRules:
      | ((context: MiddlewareContext) => MaybePromise<Rules<D>>)
      | Rules<D>
  ): EventHandler {
    return async (event) => {
      const rules =
        typeof callbackOrRules === 'function'
          ? await callbackOrRules({ event })
          : callbackOrRules
      const instance = createPermixCore<D>(rules)
      instance.hook('check', (context) => {
        hooks.callHook('check', context)
      })
      ;(event.context as any)[resolveKey()] = instance
    }
  }

  const checkMiddleware: (...args: CheckArgs<D>) => EventHandler =
    (...args) =>
    async (event) => {
      const permix = getOrThrow(event)

      if (!permix.check(...args)) {
        await onForbidden({ event, ...createCheckContext(...args) })
      }
    }

  function getRules(event: NuxtEvent): Rules<D> | null {
    return get(event)?.getRules() ?? null
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
 * Create a middleware factory that wires Permix into Nuxt / Nitro (h3) routes.
 *
 * The per-request instance lives on `event.context`, so server middleware,
 * API routes, and SSR rendering of the same request share one instance while
 * concurrent requests stay isolated.
 *
 * Use `.contextKey('name')` to set a custom context key (defaults to a unique
 * `Symbol('permix')`).
 *
 * @example
 * ```ts
 * // server/utils/permix.ts
 * import { createPermix } from 'permix/nuxt'
 *
 * export const permix = createPermix<{
 *   post: ['create', 'read']
 * }>()
 *
 * // server/middleware/permix.ts
 * export default defineEventHandler(
 *   permix.setupMiddleware(({ event }) => ({
 *     post: { create: !!event.context.user, read: true },
 *   })),
 * )
 *
 * // server/api/posts.post.ts
 * export default defineEventHandler({
 *   onRequest: [permix.checkMiddleware('post.create')],
 *   handler: () => ({ ok: true }),
 * })
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/nuxt
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

export type NuxtPermix<D extends Definition> = ReturnType<
  typeof createPermix<D>
>
