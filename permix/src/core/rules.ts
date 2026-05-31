import type { Action, ActionName, Statement } from './statements'
import { callRuleWithoutData } from './check'

type ActionRule<A extends Action>
  = A extends { type: infer T, typeRequired: true } ? (data: T) => boolean
    : A extends { type: infer T } ? (data?: T) => boolean
      : boolean | (() => boolean)

/**
 * The shape of the object passed to `permix.setup()` (and produced by
 * {@link createRules}). It mirrors the `Statement` `D`: every leaf action
 * becomes either a `boolean` or a `(data) => boolean` validator.
 */
export type Rules<D extends Statement>
  = D extends readonly Action[]
    ? { [E in D[number] as ActionName<E>]: ActionRule<E> }
    : { [K in keyof D]: D[K] extends Statement ? Rules<D[K]> : never }

/**
 * The JSON-safe form of {@link Rules}, where every leaf rule has been
 * collapsed to a plain `boolean`. Produced by `permix.dehydrate()` and
 * consumed by `permix.hydrate()`.
 */
export type DehydratedState<D extends Statement>
  = D extends readonly Action[]
    ? { [E in D[number] as ActionName<E>]: boolean }
    : { [K in keyof D & string]: D[K] extends Statement ? DehydratedState<D[K]> : never }

/**
 * Recursively collapse a rules tree into its JSON-safe {@link DehydratedState}.
 *
 * Function-based rules are invoked once with no data; entity-required
 * validators that throw on `undefined` are treated as `false`.
 */
export function dehydrateRules(node: unknown): unknown {
  if (typeof node === 'boolean')
    return node
  if (typeof node === 'function')
    return callRuleWithoutData(node as () => unknown)
  if (node && typeof node === 'object') {
    const result: Record<string, unknown> = {}
    for (const key in node as Record<string, unknown>)
      result[key] = dehydrateRules((node as Record<string, unknown>)[key])
    return result
  }
  return node
}

/**
 * Rebuild a {@link Rules} tree from a {@link DehydratedState} produced by
 * {@link dehydrateRules}. Only the serialized booleans are restored.
 */
export function hydrateRules<D extends Statement>(state: DehydratedState<D>): Rules<D> {
  const result: Record<string, unknown> = {}
  for (const key in state as Record<string, unknown>) {
    const value = (state as Record<string, unknown>)[key]
    result[key] = typeof value === 'boolean' ? value : hydrateRules(value as DehydratedState<Statement>)
  }
  return result as Rules<D>
}

/**
 * Build a type-safe {@link Rules} object for a given {@link Statement}.
 *
 * `createRules` is the canonical way to construct the rules consumed by
 * `permix.setup()`. It returns the rules unchanged, acting as a typed factory
 * so you can declare permission rules in a separate location (with full type
 * inference) and reuse them later.
 *
 * @example
 * ```ts
 * const rules = createRules<{ post: ['create', 'read'] }>({
 *   post: { create: true, read: false },
 * })
 *
 * permix.setup(rules)
 * ```
 */
export function createRules<D extends Statement>(rules: Rules<D>): Rules<D> {
  return rules
}
