import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest, RouteHandler } from 'fastify'
import type { Permix, PermixDefinition, PermixRules } from '../core/create-permix'
import type { CheckContext, CheckFunctionParams } from '../core/params'
import type { MaybePromise } from '../core/utils'
import fp from 'fastify-plugin'
import { createPermix as createPermixCore } from '../core/create-permix'
import { createCheckContext } from '../core/params'
import { createTemplate } from '../core/template'
import { pick } from '../utils'

const permixSymbol = Symbol('permix')

export interface MiddlewareContext {
  request: FastifyRequest
  reply: FastifyReply
}

export interface PermixOptions<T extends PermixDefinition> {
  /**
   * Custom error handler
   */
  onForbidden?: (params: CheckContext<T> & MiddlewareContext) => MaybePromise<void>
}

/**
 * Create a middleware function that checks permissions for Fastify routes.
 *
 * @link https://permix.letstri.dev/docs/integrations/fastify
 */
export function createPermix<Definition extends PermixDefinition>(
  {
    onForbidden = ({ reply }) => {
      reply.status(403).send({ error: 'Forbidden' })
    },
  }: PermixOptions<Definition> = {},
) {
  function getPermix(request: FastifyRequest, reply: FastifyReply) {
    try {
      const permix = request.getDecorator(permixSymbol) as Permix<Definition> | undefined

      if (!permix) {
        throw new Error('Not found')
      }

      return pick(permix, ['check', 'dehydrate'])
    }
    catch {
      reply.status(500).send({ error: '[Permix]: Instance not found. Please register the `plugin` function.' })
      return null!
    }
  }

  function plugin(callback: (context: MiddlewareContext) => MaybePromise<PermixRules<Definition>>): FastifyPluginAsync {
    return fp(async (fastify: FastifyInstance) => {
      fastify.decorateRequest(permixSymbol, null)

      fastify.addHook('onRequest', async (request, reply) => {
        const permix = createPermixCore<Definition>(await callback({ request, reply }))
        request.setDecorator(permixSymbol, permix)
      })
    }, {
      fastify: '5.x',
      name: 'permix',
    })
  }

  function checkHandler<K extends keyof Definition>(...params: CheckFunctionParams<Definition, K>): RouteHandler {
    return async (request, reply) => {
      const permix = getPermix(request, reply)

      const hasPermission = permix.check(...params)

      if (!hasPermission) {
        await onForbidden({
          request,
          reply,
          ...createCheckContext(...params),
        })
      }
    }
  }

  function template<T = void>(...params: Parameters<typeof createTemplate<Definition, T>>) {
    return createTemplate<Definition, T>(...params)
  }

  return {
    plugin,
    checkHandler,
    template,
    get: getPermix,
  }
}
