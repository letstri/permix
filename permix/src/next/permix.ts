import type { Permix as PermixCore } from '../core'
import type { Definition } from '../core/definitions'
import type { Rules, RulesPaths } from '../core/permix'
import type { DehydratedState } from '../core/rules'
import { cache } from 'react'
import { createPermix as createPermixCore, createTemplate } from '../core'

/**
 * Create a per-request Permix instance for Next.js (App Router).
 *
 * The returned helper is backed by React's `cache()`, which scopes memoization
 * to a single request (server components, route handlers, and server actions
 * for the same request all share the same instance, while different requests
 * are fully isolated from each other).
 *
 * Typical flow:
 *
 * 1. Create the helper once in a module (e.g. `lib/permix.ts`).
 * 2. Call `setup()` early in the request (root layout, middleware, or the
 *    first server component that needs permissions).
 * 3. Use `check()`, `get()`, or `dehydrate()` anywhere on the server for the
 *    remainder of that request.
 * 4. Pass `dehydrate()` to the client and hydrate it with `PermixHydrate`
 *    from `permix/react`.
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
  // `cache()` gives us a fresh, request-scoped Permix instance. Concurrent
  // requests get isolated instances; same-request callers share one.
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

  return {
    setup,
    check,
    dehydrate,
    get,
    getRules,
    template,
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

export type NextPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
