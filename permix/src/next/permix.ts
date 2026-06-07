import type { Permix as PermixCore } from '../core'
import type { Definition } from '../core/definitions'
import type { PermixHooks, Rules, RulesPaths } from '../core/permix'
import type { DehydratedState } from '../core/rules'
import { cache } from 'react'
import { createPermix as createPermixCore, createTemplate } from '../core'

/**
 * Create a per-request Permix instance for Next.js App Router.
 *
 * Backed by React's `cache()`, so all server components, route handlers, and
 * server actions within the same request share one instance while concurrent
 * requests stay fully isolated.
 *
 * @example
 * ```ts
 * // lib/permix.ts
 * import { createPermix } from 'permix/next'
 *
 * export const permix = createPermix<{
 *   post: ['create', 'read', 'update', 'delete']
 * }>()
 * ```
 *
 * ```tsx
 * // app/layout.tsx (server component)
 * import { permix } from '@/lib/permix'
 * import { getSession } from '@/lib/auth'
 *
 * export default async function RootLayout({ children }) {
 *   const session = await getSession()
 *
 *   permix.setup({
 *     post: {
 *       create: !!session,
 *       read: true,
 *       update: session?.role === 'admin',
 *       delete: session?.role === 'admin',
 *     },
 *   })
 *
 *   return <Providers state={permix.dehydrate()}>{children}</Providers>
 * }
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/next
 */
export function createPermix<D extends Definition>() {
  // Per-request isolation: concurrent requests each get their own instance;
  // multiple callers within one request share the same one.
  const getPermix = cache((): PermixCore<D> => createPermixCore<D>())

  function setup(rules: Rules<D>): void {
    getPermix().setup(rules)
  }

  const check: PermixCore<D>['check'] = (...args) => getPermix().check(...args)

  function dehydrate(): DehydratedState<D> {
    return getPermix().dehydrate()
  }

  function get(): PermixCore<D> {
    return getPermix()
  }

  function getRules(): Rules<D> | null {
    return getPermix().getRules()
  }

  function template<T = void>(rules: Rules<D> | ((param: T) => Rules<D>)) {
    return createTemplate<D, T>(rules)
  }

  function hook<K extends keyof PermixHooks<D>>(name: K, fn: PermixHooks<D>[K]) {
    return getPermix().hook(name, fn)
  }

  function hookOnce<K extends keyof PermixHooks<D>>(name: K, fn: PermixHooks<D>[K]) {
    return getPermix().hookOnce(name, fn)
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

export type NextPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
