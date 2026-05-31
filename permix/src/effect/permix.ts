import type { PermixNotReadyError, PermixRuleNotDefinedError } from '../core'
import type { CheckArgs } from '../core/check'
import type { DehydratedState, Permix as PermixCore, PermixHooks, Rules, RulesPaths } from '../core/permix'
import type { Statement } from '../core/statements'
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
export function createPermix<D extends Statement>(options: PermixOptions = {}) {
  const id = options.id ?? `permix/effect#${counter++}`

  const Tag = Context.GenericTag<PermixCore<D>>(id)

  /**
   * Create a Layer that provides Permix, optionally pre-configured with rules.
   *
   * Omit `rules` when you intend to call {@link setup} later (e.g. on the
   * client once permissions are fetched).
   */
  function layer(rules?: Rules<D>) {
    return Layer.sync(Tag, () => createPermixCore<D>(rules))
  }

  /**
   * Create a Layer that derives rules from an Effect. The effect can depend on
   * other services (e.g. a `CurrentUser` tag), and those requirements flow
   * through as the Layer's own requirements.
   */
  function layerSetup<E, R>(rules: Effect.Effect<Rules<D>, E, R>) {
    return Layer.effect(Tag, Effect.map(rules, r => createPermixCore<D>(r)))
  }

  /**
   * Provide (or replace) the rules for the current instance. Marks the
   * instance as ready and fires the `setup`/`ready` hooks.
   */
  function setup(rules: Rules<D>) {
    return Effect.map(Tag, instance => instance.setup(rules))
  }

  /**
   * Check a permission. Returns `Effect<boolean>` — you decide how to handle
   * denial.
   */
  function check(...args: CheckArgs<D>) {
    return Effect.flatMap(
      Tag,
      instance => Effect.try({
        try: () => instance.check(...args),
        catch: e => e as PermixNotReadyError | PermixRuleNotDefinedError,
      }),
    )
  }

  /**
   * Serialize the current rules into a JSON-safe object.
   */
  function dehydrate() {
    return Effect.flatMap(
      Tag,
      instance => Effect.try({
        try: () => instance.dehydrate(),
        catch: e => e as PermixNotReadyError,
      }),
    )
  }

  /**
   * Restore rules from a value produced by {@link dehydrate}. Does not mark the
   * instance as ready — call {@link setup} on the client to fully restore
   * function-based rules.
   */
  function hydrate(state: DehydratedState<D>) {
    return Effect.flatMap(
      Tag,
      instance => Effect.try({
        try: () => instance.hydrate(state),
        catch: e => e as PermixNotReadyError,
      }),
    )
  }

  /**
   * Returns `true` if {@link setup} has been called at least once.
   */
  function isReady() {
    return Effect.map(Tag, instance => instance.isReady())
  }

  /**
   * Resolves once the instance is ready (i.e. {@link setup} has run).
   */
  function isReadyAsync() {
    return Effect.flatMap(Tag, instance => Effect.promise(() => instance.isReadyAsync()))
  }

  /**
   * Read the current rules object (or `null` if not set up yet).
   */
  function getRules(): Effect.Effect<Rules<D> | null, never, PermixCore<D>> {
    return Effect.map(Tag, instance => instance.getRules())
  }

  /**
   * Register a hook that fires every time the named event occurs. Yields the
   * function that removes the listener.
   */
  function hook<K extends keyof PermixHooks>(name: K, fn: PermixHooks[K]): Effect.Effect<() => void, never, PermixCore<D>> {
    return Effect.map(Tag, instance => instance.hook(name, fn))
  }

  /**
   * Register a hook that fires only once for the named event.
   */
  function hookOnce<K extends keyof PermixHooks>(name: K, fn: PermixHooks[K]): Effect.Effect<void, never, PermixCore<D>> {
    return Effect.map(Tag, instance => instance.hookOnce(name, fn))
  }

  /**
   * Create a reusable permission template scoped to this factory's Statement.
   */
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
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}

export type EffectPermix<D extends Statement> = ReturnType<typeof createPermix<D>>
