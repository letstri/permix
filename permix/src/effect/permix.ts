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

  /**
   * Create a Layer that provides a Permix instance, optionally pre-seeded with
   * rules. Omit `rules` to call {@link setup} later.
   */
  function layer(rules?: Rules<D>) {
    return Layer.sync(Tag, () => createPermixCore<D>(rules))
  }

  /**
   * Create a Layer that derives rules from an Effect. Requirements of that
   * Effect (e.g. a `CurrentUser` tag) become requirements of the Layer.
   */
  function layerSetup<E, R>(rules: Effect.Effect<Rules<D>, E, R>) {
    return Layer.effect(Tag, Effect.map(rules, r => createPermixCore<D>(r)))
  }

  /** Provide (or replace) rules for the current instance. */
  function setup(rules: Rules<D>) {
    return Effect.map(Tag, instance => instance.setup(rules))
  }

  /**
   * Check a permission. Returns `Effect<boolean>` — handle denial as you see fit.
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

  /** Serialize the current rules to a JSON-safe object. */
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
   * Restore rules from a {@link dehydrate} snapshot. Does not mark the
   * instance as ready — call {@link setup} to fully restore function-based rules.
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

  /** Returns `true` once {@link setup} has been called. */
  function isReady() {
    return Effect.map(Tag, instance => instance.isReady())
  }

  /** Resolves once the instance is ready (i.e. {@link setup} has run). */
  function isReadyAsync() {
    return Effect.flatMap(Tag, instance => Effect.promise(() => instance.isReadyAsync()))
  }

  /** Returns the current rules, or `null` if not set up yet. */
  function getRules(): Effect.Effect<Rules<D> | null, never, PermixCore<D>> {
    return Effect.map(Tag, instance => instance.getRules())
  }

  /** Register a hook that fires every time the named event occurs. Yields the remover. */
  function hook<K extends keyof PermixHooks>(name: K, fn: PermixHooks[K]): Effect.Effect<() => void, never, PermixCore<D>> {
    return Effect.map(Tag, instance => instance.hook(name, fn))
  }

  /** Register a hook that fires only once for the named event. */
  function hookOnce<K extends keyof PermixHooks>(name: K, fn: PermixHooks[K]): Effect.Effect<void, never, PermixCore<D>> {
    return Effect.map(Tag, instance => instance.hookOnce(name, fn))
  }

  /** Create a reusable permission template for this Definition. */
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

export type EffectPermix<D extends Definition> = ReturnType<typeof createPermix<D>>
