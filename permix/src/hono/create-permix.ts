import type { Context, MiddlewareHandler } from 'hono'
import type { Permix, PermixDefinition, PermixRules } from '../core/create-permix'
import type { CheckContext, CheckFunctionParams } from '../core/params'
import type { MaybePromise } from '../core/utils'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { createPermix as createPermixCore } from '../core/create-permix'
import { createCheckContext } from '../core/params'
import { createTemplate } from '../core/template'
import { pick } from '../utils'

const permixSymbol = Symbol('permix') as unknown as string

export interface MiddlewareContext {
  c: Context
}

export interface PermixOptions<T extends PermixDefinition> {
  /**
   * Custom error handler
   */
  onForbidden?: (params: CheckContext<T> & { c: Context }) => MaybePromise<Response>
}

/**
 * Create a middleware function that checks permissions for Hono routes.
 *
 * @link https://permix.letstri.dev/docs/integrations/hono
 */
export function createPermix<Definition extends PermixDefinition>(
  {
    onForbidden = ({ c }) => c.json({ error: 'Forbidden' }, 403),
  }: PermixOptions<Definition> = {},
) {
  function getPermix(c: Context) {
    try {
      const permix = c.get(permixSymbol) as Permix<Definition> | undefined

      if (!permix) {
        throw new Error('Not found')
      }

      return pick(permix, ['check', 'dehydrate'])
    }
    catch {
      throw new HTTPException(500, {
        message: '[Permix] Instance not found. Please use the `setupMiddleware` function.',
      })
    }
  }

  function setupMiddleware(callback: (context: { c: Context }) => PermixRules<Definition> | Promise<PermixRules<Definition>>): MiddlewareHandler {
    return createMiddleware(async (c, next) => {
      c.set(permixSymbol, createPermixCore<Definition>(await callback({ c })))

      await next()
    })
  }

  function checkMiddleware<K extends keyof Definition>(...params: CheckFunctionParams<Definition, K>): MiddlewareHandler {
    return createMiddleware(async (c, next) => {
      try {
        const permix = getPermix(c)

        const hasPermission = permix.check(...params)

        if (!hasPermission) {
          return await onForbidden({ c, ...createCheckContext(...params) })
        }

        await next()
      }
      catch {
        return await onForbidden({ c, ...createCheckContext(...params) })
      }
    })
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
