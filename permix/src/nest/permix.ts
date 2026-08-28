import type {
  CanActivate,
  CustomDecorator,
  ExecutionContext,
} from '@nestjs/common'
import { ForbiddenException, SetMetadata } from '@nestjs/common'

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
 * Compatible with both the Express and Fastify Nest adapters.
 */
export type NestHttpRequest = Record<PropertyKey, unknown>

export interface GuardContext {
  req: NestHttpRequest
  context: ExecutionContext
}

export interface PermixOptions<D extends Definition> {
  /**
   * Called when a `@Check` decorator denies the request. Defaults to throwing
   * a Nest `ForbiddenException` with `{ error: 'Forbidden' }`.
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

  function get(req: NestHttpRequest): PermixCore<D> | null {
    const instance = req[resolveKey()] as PermixCore<D> | undefined
    return instance ?? null
  }

  function getOrThrow(req: NestHttpRequest): PermixCore<D> {
    const instance = get(req)
    if (!instance) {
      throw new PermixNotFoundError(resolveKey())
    }
    return instance
  }

  function attach(req: NestHttpRequest, rules: Rules<D>): PermixCore<D> {
    const instance = createPermixCore<D>(rules)
    instance.hook('check', (context) => {
      hooks.callHook('check', context)
    })
    req[resolveKey()] = instance
    return instance
  }

  /**
   * Nest guard that always sets up a per-request Permix instance, then enforces
   * `@Check(...)` when that decorator is present on the handler or controller.
   *
   * Register globally with `APP_GUARD`, or per-controller / per-route with
   * `@UseGuards`.
   */
  function guard(
    callbackOrRules:
      | ((context: GuardContext) => MaybePromise<Rules<D>>)
      | Rules<D>
  ): CanActivate {
    return {
      async canActivate(context) {
        const req = getRequest(context)
        const rules =
          typeof callbackOrRules === 'function'
            ? await callbackOrRules({ req, context })
            : callbackOrRules
        const instance = attach(req, rules)

        const args = readCheckArgs<D>(checkMetadataKey, context)
        if (!args) {
          return true
        }

        const allowed = instance.check(...args)
        if (allowed) {
          return true
        }

        await onForbidden({
          req,
          context,
          ...createCheckContext(...args),
        })
        return false
      },
    }
  }

  /**
   * Method or class decorator that records the permission check for `guard()`.
   */
  const Check: (...args: CheckArgs<D>) => CustomDecorator<string | symbol> = (
    ...args
  ) => SetMetadata(checkMetadataKey, args)

  function getRules(req: NestHttpRequest): Rules<D> | null {
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
 * @example
 * ```ts
 * import { APP_GUARD } from '@nestjs/core'
 * import { createPermix } from 'permix/nest'
 *
 * const permix = createPermix<{
 *   post: ['create', 'read']
 * }>()
 *
 * @Get()
 * @permix.Check('post.read')
 * findAll() {}
 *
 * // app.module.ts
 * {
 *   provide: APP_GUARD,
 *   useValue: permix.guard(({ req }) => ({
 *     post: { create: !!req.user, read: true },
 *   })),
 * }
 * ```
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
