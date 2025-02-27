import type { NextFunction, Request, Response } from 'express'
import type { CheckFunctionParams, Permix, PermixDefinition, PermixRules } from '../core/createPermix'
import { createPermix } from '../core/createPermix'
import { createTemplateBuilder } from '../core/template'
import { pick } from '../utils'

const permixSymbol = Symbol('permix')

export interface PermixExpressOptions<T extends PermixDefinition> {
  /**
   * Custom error handler
   */
  onUnauthorized?: (params: { req: Request, res: Response, next: NextFunction, entity: keyof T, actions: T[keyof T]['action'][] }) => void
}

/**
 * Create a middleware function that checks permissions for Express routes.
 *
 * @link https://permix.letstri.dev/docs/integrations/express
 */
export function createPermixExpress<Definition extends PermixDefinition>(
  {
    onUnauthorized = ({ res }) => res.status(403).json({ error: 'Forbidden' }),
  }: PermixExpressOptions<Definition> = {},
) {
  type PermixExpress = Pick<Permix<Definition>, 'check' | 'checkAsync'>
  type PermixRequest = Request & { [permixSymbol]: PermixExpress }

  function getPermix(req: Request) {
    const permix = (req as PermixRequest)[permixSymbol]

    if (!permix) {
      console.error('[Permix]: Permix not found. Please use the `setupPermixMiddleware` function to set the permix.')
      return null!
    }

    return pick(permix, ['check', 'checkAsync'])
  }

  function setupMiddleware(callback: (params: { req: Request, res: Response }) => PermixRules<Definition> | Promise<PermixRules<Definition>>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const permix = createPermix<Definition>()

      ;(req as PermixRequest)[permixSymbol] = permix

      permix.setup(await callback({ req, res }))

      next()
    }
  }

  function checkMiddleware<K extends keyof Definition>(...params: CheckFunctionParams<Definition, K>) {
    return (req: Request, res: Response, next: NextFunction) => {
      const hasPermission = getPermix(req).check(...params)

      if (!hasPermission) {
        return onUnauthorized({ req, res, next, entity: params[0], actions: Array.isArray(params[1]) ? params[1] : [params[1]] })
      }

      next()
    }
  }

  return {
    template: createTemplateBuilder<Definition>(),
    setupMiddleware,
    get: getPermix,
    checkMiddleware,
  }
}
