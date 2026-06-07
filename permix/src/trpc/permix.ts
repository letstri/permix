import type { AnyMiddlewareBuilder } from '@trpc/server/unstable-core-do-not-import'
import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { PermixHooks, Rules, RulesPaths } from '../core/permix'
import { initTRPC, TRPCError } from '@trpc/server'
import { createCheckContext, createHooks, createPermix as createPermixCore, createTemplate, PermixNotFoundError } from '../core'

export interface PermixOptions<D extends Definition> {
  onForbidden?: (params: CheckContext<D> & { ctx: Record<string, any>, next: (...args: any[]) => any }) => any
}

function buildPermix<D extends Definition, const Key extends string>(
  resolveKey: () => string,
  options: PermixOptions<D> = {},
) {
  const forbiddenHandler = options.onForbidden ?? (() => {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
    })
  })

  const hooks = createHooks<PermixHooks<D>>()

  const t = initTRPC.context<{ [P in Key]: PermixCore<D> }>().create()

  function setupContext(rules: Rules<D>): { [P in Key]: PermixCore<D> } {
    const instance = createPermixCore<D>(rules)
    instance.hook('check', context => hooks.callHook('check', context))
    return { [resolveKey() as Key]: instance } as { [P in Key]: PermixCore<D> }
  }

  function checkMiddleware(...args: CheckArgs<D>): AnyMiddlewareBuilder {
    return t.middleware(async (opts) => {
      const ctx = opts.ctx as Record<string, PermixCore<D>>
      const instance = ctx[resolveKey()]

      if (!instance) {
        throw new PermixNotFoundError(resolveKey())
      }

      if (instance.check(...args)) {
        return opts.next()
      }

      return forbiddenHandler({ ...opts, ...createCheckContext(...args) })
    })
  }

  function getRules(ctx: Record<string, PermixCore<D> | undefined>): Rules<D> | null {
    return ctx[resolveKey()]?.getRules() ?? null
  }

  function template<T = void>(rules: Rules<D> | ((param: T) => Rules<D>)) {
    return createTemplate<D, T>(rules)
  }

  return {
    setupContext,
    checkMiddleware,
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
 * Create a middleware factory that wires Permix into tRPC procedures.
 *
 * Use `.contextKey('name')` to set a custom context key (its literal type is
 * inferred automatically). Defaults to `'permix'`.
 *
 * @example
 * ```ts
 * import { initTRPC } from '@trpc/server'
 * import { createPermix } from 'permix/trpc'
 *
 * const permix = createPermix<{
 *   post: ['create', 'read']
 * }>()
 *
 * const t = initTRPC.context<Context>().create()
 *
 * const trpc = t.procedure
 *   .use(({ next }) => {
 *     return next({
 *       ctx: permix.setupContext({
 *         post: { create: true },
 *       }),
 *     })
 *   })
 *
 * export const router = trpc.router({
 *   createPost: trpc
 *     .use(permix.checkMiddleware('post.create'))
 *     .mutation(({ ctx }) => { ... }),
 * })
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/trpc
 */
export function createPermix<D extends Definition>(options: PermixOptions<D> = {}) {
  let key: string = 'permix'
  const permix = buildPermix<D, 'permix'>(() => key, options)

  return Object.assign(permix, {
    contextKey<const Key extends string>(newKey: Key) {
      key = newKey
      return permix as unknown as ReturnType<typeof buildPermix<D, Key>>
    },
  })
}

export type TrpcPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
