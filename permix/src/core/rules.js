import { callRuleWithoutData } from './check'
/**
 * Recursively collapse a rules tree into its JSON-safe {@link DehydratedState}.
 *
 * Function-based rules are invoked once with no data; entity-required
 * validators that throw on `undefined` are treated as `false`.
 */
export function dehydrateRules(node) {
    if (typeof node === 'boolean')
        return node
    if (typeof node === 'function')
        return callRuleWithoutData(node)
    if (node && typeof node === 'object') {
        const result = {}
        for (const key in node)
            result[key] = dehydrateRules(node[key])
        return result
    }
    return node
}
/**
 * Rebuild a {@link Rules} tree from a {@link DehydratedState} produced by
 * {@link dehydrateRules}. Only the serialized booleans are restored.
 */
export function hydrateRules(state) {
    const result = {}
    for (const key in state) {
        const value = state[key]
        result[key] = typeof value === 'boolean' ? value : hydrateRules(value)
    }
    return result
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
export function createRules(rules) {
    return rules
}
