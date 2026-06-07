import type { PermixNotReadyError, PermixRuleNotDefinedError } from '../core'
import type { CheckArgs } from '../core/check'
import type { Definition } from '../core/definitions'
import type { DehydratedState, Permix as PermixCore, PermixHooks, Rules, RulesPaths } from '../core/permix'
import { Context, Effect, Layer } from 'effect'
import { createPermix as createPermixCore, createTemplate } from '../core'

export interface PermixOptions {
  /**
   * Unique identifier for the Effect Context tag. Defaults to a unique string
   * so multiple `createPermix` calls produce isolated instances.
   */
  id?: string
}

let counter = 0

/**
 * Create an Effect-compatible Permix factory.
 *
 * Returns a Context `Tag`, Layer constructors, and Effect-returning helpers
 * that you can use in any Effect program — server or client.
 *
 * @link https://permix.letstri.dev/docs/integrations/effect
 */
export function createPermix<D extends Definition>(options: PermixOptions = {}) {
  const id = options.id ?? `permix/effect#${counter++}`

  const Tag = Context.GenericTag<PermixCore<D>>(id)

  function layer(rules?: Rules<D>) {
    return Layer.sync(Tag, () => createPermixCore<D>(rules))
  }

  function layerSetup<E, R>(rules: Effect.Effect<Rules<D>, E, R>) {
    return Layer.effect(Tag, Effect.map(rules, r => createPermixCore<D>(r)))
  }

  function setup(rules: Rules<D>) {
    return Effect.map(Tag, instance => instance.setup(rules))
  }

  function check(...args: CheckArgs<D>) {
    return Effect.flatMap(
      Tag,
      instance => Effect.try({
        try: () => instance.check(...args),
        catch: e => e as PermixNotReadyError | PermixRuleNotDefinedError,
      }),
    )
  }

  function dehydrate() {
    return Effect.flatMap(
      Tag,
      instance => Effect.try({
        try: () => instance.dehydrate(),
        catch: e => e as PermixNotReadyError,
      }),
    )
  }

  function hydrate(state: DehydratedState<D>) {
    return Effect.flatMap(
      Tag,
      instance => Effect.try({
        try: () => instance.hydrate(state),
        catch: e => e as PermixNotReadyError,
      }),
    )
  }

  function isReady() {
    return Effect.map(Tag, instance => instance.isReady())
  }

  function isReadyAsync() {
    return Effect.flatMap(Tag, instance => Effect.promise(() => instance.isReadyAsync()))
  }

  function getRules(): Effect.Effect<Rules<D> | null, never, PermixCore<D>> {
    return Effect.map(Tag, instance => instance.getRules())
  }

  function hook<K extends keyof PermixHooks<D>>(name: K, fn: PermixHooks<D>[K]): Effect.Effect<() => void, never, PermixCore<D>> {
    return Effect.map(Tag, instance => instance.hook(name, fn))
  }

  function hookOnce<K extends keyof PermixHooks<D>>(name: K, fn: PermixHooks<D>[K]): Effect.Effect<void, never, PermixCore<D>> {
    return Effect.map(Tag, instance => instance.hookOnce(name, fn))
  }

  function template<T = void>(rules: Rules<D> | ((param: T) => Rules<D>)) {
    return createTemplate<D, T>(rules)
  }

  return {
    Tag,
    layer,
    layerSetup,
    setup,
    check,
    dehydrate,
    hydrate,
    isReady,
    isReadyAsync,
    getRules,
    hook,
    hookOnce,
    template,
    id,
    $inferDefinition: undefined as unknown as D,
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

export type EffectPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
