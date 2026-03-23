import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Permix, PermixDefinition, PermixRules } from '../core/create-permix'
import type { CheckContext, CheckFunctionParams } from '../core/params'
import { createPermix as createPermixCore } from '../core/create-permix'
import { createCheckContext } from '../core/params'
import { createTemplate } from '../core/template'
import { pick } from '../utils'

const permixSymbol = Symbol('permix')

export interface MiddlewareContext {
  req: IncomingMessage
  res: ServerResponse<IncomingMessage>
}

export interface PermixOptions<T extends PermixDefinition> {
  /**
   * Custom error handler
   */
  onForbidden?: (params: CheckContext<T> & MiddlewareContext) => void
}

/**
 * Create a middleware function that checks permissions for Node.js HTTP servers.
 * Compatible with raw Node.js HTTP servers.
 *
 * @link https://permix.letstri.dev/docs/integrations/node
 */
export function createPermix<Definition extends PermixDefinition>(
  {
    onForbidden = ({ res }) => {
      res.statusCode = 403
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Forbidden' }))
    },
  }: PermixOptions<Definition> = {},
) {
  function getPermix(req: IncomingMessage, res: ServerResponse<IncomingMessage>) {
    try {
      const permix = (req as any)[permixSymbol] as Permix<Definition> | undefined

      if (!permix) {
        throw new Error('Not found')
      }

      return pick(permix, ['check', 'dehydrate'])
    }
    catch {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: '[Permix]: Instance not found. Please use the `setupMiddleware` function.' }))
      return null!
    }
  }

  function setupMiddleware(callback: (context: MiddlewareContext) => PermixRules<Definition> | Promise<PermixRules<Definition>>) {
    return async (context: MiddlewareContext) => {
      (context.req as any)[permixSymbol] = createPermixCore<Definition>(await callback(context))
    }
  }

  function checkMiddleware<K extends keyof Definition>(...params: CheckFunctionParams<Definition, K>) {
    return async (context: MiddlewareContext) => {
      const permix = getPermix(context.req, context.res)

      if (!permix)
        return

      const hasPermission = permix.check(...params)

      if (!hasPermission) {
        return onForbidden({
          ...createCheckContext(...params),
          req: context.req,
          res: context.res,
        })
      }
    }
  }

  function template<T = void>(...params: Parameters<typeof createTemplate<Definition, T>>) {
    return createTemplate<Definition, T>(...params)
  }

  return {
    setupMiddleware,
    checkMiddleware,
    template,
    get: getPermix,
  }
}
