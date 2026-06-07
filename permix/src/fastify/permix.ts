import type { FastifyPluginAsync, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify'
import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { PermixHooks, Rules, RulesPaths } from '../core/permix'
import type { MaybePromise } from '../utils'
import fp from 'fastify-plugin'
import { createCheckContext, createHooks, createPermix as createPermixCore, createTemplate, PermixNotFoundError } from '../core'

let pluginCounter = 0

export interface MiddlewareContext {
  request: FastifyRequest
  reply: FastifyReply
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `checkHandler` denies the request. Defaults to a 403 JSON
   * response of `{ error: 'Forbidden' }`.
   */
  onForbidden?: (params: CheckContext<D> & MiddlewareContext) => MaybePromise<void>
}

function buildPermix<D extends Definition>(
  resolveKey: () => string | symbol,
  options: PermixOptions<D> = {},
) {
  const onForbidden = options.onForbidden ?? (({ reply }) => {
    reply.status(403).send({ error: 'Forbidden' })
  })

  const pluginName = `permix-${pluginCounter++}`

  const hooks = createHooks<PermixHooks<D>>()

  function get(request: FastifyRequest): PermixCore<D> | null {
    try {
      const instance = request.getDecorator<PermixCore<D> | undefined>(resolveKey())
      return instance ?? null
    }
    catch {
      return null
    }
  }

  function getOrThrow(request: FastifyRequest): PermixCore<D> {
    const instance = get(request)
    if (!instance) {
      throw new PermixNotFoundError(resolveKey())
    }
    return instance
  }

  function setupMiddleware(
    callbackOrRules: ((context: MiddlewareContext) => MaybePromise<Rules<D>>) | Rules<D>,
  ): FastifyPluginAsync {
    return fp(async (fastify) => {
      fastify.decorateRequest(resolveKey(), null)

      fastify.addHook('onRequest', async (request, reply) => {
        const rules = typeof callbackOrRules === 'function'
          ? await callbackOrRules({ request, reply })
          : callbackOrRules
        const instance = createPermixCore<D>(rules)
        instance.hook('check', context => hooks.callHook('check', context))
        request.setDecorator(resolveKey(), instance)
      })
    }, {
      fastify: '5.x',
      name: pluginName,
    })
  }

  const checkMiddleware: (...args: CheckArgs<D>) => preHandlerHookHandler = (...args) => {
    return async (request, reply) => {
      const permix = get(request)

      if (!permix) {
        throw new PermixNotFoundError(resolveKey())
      }

      const allowed = permix.check(...args)

      if (!allowed) {
        await onForbidden({ request, reply, ...createCheckContext(...args) })
      }
    }
  }

  function getRules(request: FastifyRequest): Rules<D> | null {
    return get(request)?.getRules() ?? null
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
 * Create a plugin factory that wires Permix into Fastify routes.
 *
 * Use `.contextKey('name')` to set a custom request decorator key (defaults to
 * a unique `Symbol('permix')`).
 *
 * @example
 * ```ts
 * import Fastify from 'fastify'
 * import { createPermix } from 'permix/fastify'
 *
 * const permix = createPermix<{
 *   post: ['create', 'read']
 * }>()
 *
 * const app = Fastify()
 * await app.register(permix.setupMiddleware(({ request }) => ({
 *   post: { create: !!request.user, read: true },
 * })))
 *
 * app.get('/posts', {
 *   preHandler: permix.checkMiddleware('post.read'),
 * }, (request, reply) => reply.send({ ok: true }))
 * ```
 *
 * @link https://permix.letstri.dev/docs/integrations/fastify
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

export type FastifyPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
