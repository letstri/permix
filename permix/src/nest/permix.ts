import type { CanActivate, ExecutionContext } from '@nestjs/common'
import {
  applyDecorators,
  ForbiddenException,
  SetMetadata,
  UseGuards,
} from '@nestjs/common'

import type { Permix as PermixCore } from '../core'
import {
  createCheckContext,
  createHooks,
  createPermix as createPermixCore,
  createTemplate,
  PermixNotFoundError,
} from '../core'
import type { CheckArgs, CheckContext } from '../core/check'
import type { Definition } from '../core/definitions'
import type { PermixHooks, Rules, RulesPaths } from '../core/permix'
import type { MaybePromise } from '../utils'

/**
 * HTTP request object from `ExecutionContext.switchToHttp().getRequest()`.
 * Nest supports several HTTP adapters with no request type in common, so this
 * stays `any`; annotate your own `@Req()` parameters to get a typed request.
 */
export type NestHttpRequest = any

export interface GuardContext {
  req: NestHttpRequest
  context: ExecutionContext
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `@Check` decorator denies the request. Defaults to throwing
   * a Nest `ForbiddenException` with `{ error: 'Forbidden' }`. The handler is
   * expected to throw: returning normally lets Nest raise its own
   * `ForbiddenException`.
   */
  onForbidden?: (params: CheckContext<D> & GuardContext) => MaybePromise<void>
}

function getRequest(context: ExecutionContext): NestHttpRequest {
  return context.switchToHttp().getRequest()
}

function readCheckArgs<D extends Definition>(
  metadataKey: string | symbol,
  context: ExecutionContext
): CheckArgs<D> | undefined {
  const handler = context.getHandler()
  const classRef = context.getClass()
  const fromHandler = Reflect.getMetadata(metadataKey, handler) as
    | CheckArgs<D>
    | undefined
  if (fromHandler) {
    return fromHandler
  }
  return Reflect.getMetadata(metadataKey, classRef) as CheckArgs<D> | undefined
}

function buildPermix<D extends Definition>(
  resolveKey: () => string | symbol,
  options: PermixOptions<D> = {}
) {
  const checkMetadataKey = Symbol('permix:check')
  const onForbidden =
    options.onForbidden ??
    (() => {
      throw new ForbiddenException({ error: 'Forbidden' })
    })

  const hooks = createHooks<PermixHooks<D>>()

  function get<R extends object>(req: R): PermixCore<D> | null {
    const instance = (req as any)[resolveKey()] as PermixCore<D> | undefined
    return instance ?? null
  }

  function getOrThrow<R extends object>(req: R): PermixCore<D> {
    const instance = get(req)
    if (!instance) {
      throw new PermixNotFoundError(resolveKey())
    }
    return instance
  }

  function attach<R extends object>(req: R, rules: Rules<D>): PermixCore<D> {
    const instance = createPermixCore<D>(rules)
    instance.hook('check', (context) => {
      hooks.callHook('check', context)
    })
    ;(req as any)[resolveKey()] = instance
    return instance
  }

  /**
   * Nest guard that sets up a per-request Permix instance. Register globally
   * with `APP_GUARD`, or per-controller / per-route with `@UseGuards`.
   *
   * Non-HTTP contexts (RPC, WebSockets, GraphQL) are left untouched.
   */
  function guard(
    callbackOrRules:
      | ((context: GuardContext) => MaybePromise<Rules<D>>)
      | Rules<D>
  ): CanActivate {
    return {
      async canActivate(context) {
        if (context.getType() !== 'http') {
          return true
        }
        const req = getRequest(context)
        attach(
          req,
          typeof callbackOrRules === 'function'
            ? await callbackOrRules({ req, context })
            : callbackOrRules
        )
        return true
      },
    }
  }

  const enforce: CanActivate = {
    async canActivate(context) {
      const args = readCheckArgs<D>(checkMetadataKey, context)
      if (!args) {
        return true
      }
      // `guard()` skips non-HTTP contexts, so there is no instance to check
      // against — fail closed rather than let the `@Check` through.
      if (context.getType() !== 'http') {
        throw new PermixNotFoundError(resolveKey())
      }
      const req = getRequest(context)
      if (getOrThrow(req).check(...args)) {
        return true
      }
      await onForbidden({ req, context, ...createCheckContext(...args) })
      return false
    },
  }

  /**
   * Method or class decorator that enforces a permission. A handler-level
   * `@Check` overrides a controller-level one.
   *
   * Throws `PermixNotFoundError` when `guard()` has not run for the request,
   * so a forgotten setup guard is a loud failure, not an unprotected route.
   */
  const Check: (...args: CheckArgs<D>) => MethodDecorator & ClassDecorator = (
    ...args
  ) => applyDecorators(SetMetadata(checkMetadataKey, args), UseGuards(enforce))

  function getRules<R extends object>(req: R): Rules<D> | null {
    return get(req)?.getRules() ?? null
  }

  function template<T = void>(rules: Rules<D> | ((param: T) => Rules<D>)) {
    return createTemplate<D, T>(rules)
  }

  return {
    guard,
    Check,
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
 * Create a guard factory that wires Permix into NestJS routes.
 *
 * Use `.contextKey('name')` to set a custom request key (defaults to a unique
 * `Symbol('permix')`).
 *
 * @link https://permix.letstri.dev/docs/integrations/nest
 */
export function createPermix<D extends Definition>(
  options: PermixOptions<D> = {}
) {
  let key: string | symbol = Symbol('permix')
  const permix = buildPermix<D>(() => key, options)

  return Object.assign(permix, {
    contextKey(newKey: string | symbol) {
      key = newKey
      return permix
    },
  })
}

/** Return type of {@link createPermix}. */
export type NestPermix<D extends Definition> = ReturnType<
  typeof createPermix<D>
>
