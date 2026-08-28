import * as h3 from 'h3'

import type { Permix as PermixCore } from '../core'
import { createPermix as createPermixCore, createTemplate } from '../core'
import type { Definition } from '../core/definitions'
import type { PermixHooks, Rules, RulesPaths } from '../core/permix'
import type { DehydratedState } from '../core/rules'

/**
 * Minimal Nitro/h3 event shape. Compatible with `H3Event` from `h3` and
 * Nuxt's `useRequestEvent()` return value.
 */
export interface NuxtEvent {
  context: object
}

interface H3RequestEventApi {
  getRequestEvent?: () => NuxtEvent | undefined
  useEvent?: () => NuxtEvent
}

function readCurrentEvent(): NuxtEvent | undefined {
  // h3 1.x has no ALS helper; Nitro/h3 v2 may expose getRequestEvent or useEvent.
  const runtime = h3 as H3RequestEventApi
  if (typeof runtime.getRequestEvent === 'function') {
    return runtime.getRequestEvent()
  }
  if (typeof runtime.useEvent === 'function') {
    try {
      return runtime.useEvent()
    } catch {
      return undefined
    }
  }
  return undefined
}

function resolveEvent(
  event: NuxtEvent | undefined,
  key: string | symbol
): NuxtEvent {
  if (event) {
    return event
  }
  const current = readCurrentEvent()
  if (current) {
    return current
  }
  throw new Error(
    `[Permix]: No request event found for key ${String(key)}. Call setup() inside a Nuxt/Nitro request, or pass the event.`
  )
}

function getOrCreate(
  event: NuxtEvent,
  key: string | symbol,
  create: () => PermixCore<any>
): PermixCore<any> {
  const context = event.context as Record<PropertyKey, unknown>
  const existing = context[key] as PermixCore<any> | undefined
  if (existing) {
    return existing
  }
  const instance = create()
  context[key] = instance
  return instance
}

/**
 * Create a per-request Permix instance for Nuxt / Nitro.
 *
 * The instance is stored on the current request's `event.context`, so server
 * routes, server middleware, and Vue server components in the same request
 * share one instance while concurrent requests stay isolated.
 *
 * @example
 * ```ts
 * // lib/permix.ts
 * import { createPermix } from 'permix/nuxt'
 *
 * export const permix = createPermix<{
 *   post: ['create', 'read', 'update', 'delete']
 * }>()
 * ```
 *
 * ```ts
 * // server/middleware/permix.ts
 * import { permix } from '~/lib/permix'
 *
 * export default defineEventHandler((event) => {
 *   permix.setup({
 *     post: { create: true, read: true, update: false, delete: false },
 *   }, event)
 * })
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/nuxt
 */
export function createPermix<D extends Definition>() {
  const key: symbol = Symbol('permix')

  function getPermix(event?: NuxtEvent): PermixCore<D> {
    const resolved = resolveEvent(event, key)
    return getOrCreate(resolved, key, () => createPermixCore<D>())
  }

  function setup(rules: Rules<D>, event?: NuxtEvent): void {
    getPermix(event).setup(rules)
  }

  const check: PermixCore<D>['check'] = (...args) => getPermix().check(...args)

  function dehydrate(event?: NuxtEvent): DehydratedState<D> {
    return getPermix(event).dehydrate()
  }

  function get(event?: NuxtEvent): PermixCore<D> {
    return getPermix(event)
  }

  function getRules(event?: NuxtEvent): Rules<D> | null {
    return getPermix(event).getRules()
  }

  function template<T = void>(rules: Rules<D> | ((param: T) => Rules<D>)) {
    return createTemplate<D, T>(rules)
  }

  function hook<K extends keyof PermixHooks<D>>(
    name: K,
    fn: PermixHooks<D>[K],
    event?: NuxtEvent
  ) {
    return getPermix(event).hook(name, fn)
  }

  function hookOnce<K extends keyof PermixHooks<D>>(
    name: K,
    fn: PermixHooks<D>[K],
    event?: NuxtEvent
  ) {
    getPermix(event).hookOnce(name, fn)
  }

  return {
    setup,
    check,
    dehydrate,
    get,
    getRules,
    template,
    hook,
    hookOnce,
    $inferDefinition: undefined as unknown as D,
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

export type NuxtPermix<D extends Definition> = ReturnType<
  typeof createPermix<D>
>
