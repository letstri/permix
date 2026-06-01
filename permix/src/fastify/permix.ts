import type { FastifyPluginAsync, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify'
import type { Permix as PermixCore } from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { Rules } from '../core/permix'
import type { MaybePromise } from '../utils'
import fp from 'fastify-plugin'
import { createCheckContext, createPermix as createPermixCore, createTemplate, PermixNotFoundError } from '../core'

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
  const onForbidden = options.onForbidden ?? (({ reply }: CheckContext<D> & MiddlewareContext) => {
    reply.status(403).send({ error: 'Forbidden' })
  })

  const pluginName = `permix-${pluginCounter++}`

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
        request.setDecorator(resolveKey(), createPermixCore<D>(rules))
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

  function template<T = void>(rules: Rules<D> | ((param: T) => Rules<D>)) {
    return createTemplate<D, T>(rules)
  }

  return {
    setupMiddleware,
    checkMiddleware,
    template,
    get,
    getOrThrow,
    get key() {
      return resolveKey()
    },
  }
}

/**
 * Create a plugin factory that wires Permix into Fastify routes.
 *
 * Call `.contextKey('name')` to set a custom request decorator key. Omit it to
 * use a fresh `Symbol('permix')` as the default key.
 *
 * @example
 * ```ts
 * // default symbol key
 * const permix = createPermix<Def>()
 *
 * // custom string key
 * const permix = createPermix<Def>().contextKey('permissions')
 *
 * // with custom forbidden handler
 * const permix = createPermix<Def>({ onForbidden: ... }).contextKey('permissions')
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
