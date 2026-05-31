import { PermixNotReadyError, PermixRuleNotDefinedError } from './errors'

function isSpecialSymbol(value) {
    return value === '~any' || value === '~all'
}
/**
 * Invoke a rule with no check data, treating a thrown error as `false`.
 *
 * `~any`/`~all` aggregation and `dehydrate()` evaluate every rule without an
 * entity. Entity-required validators (e.g. `post => post.authorId === id`)
 * throw on `undefined`, so we treat that as a denied permission instead of
 * letting the whole operation crash.
 */
export function callRuleWithoutData(rule) {
    try {
        return Boolean(rule())
    }
    catch {
        return false
    }
}
function walk(rules, args) {
    const first = args[0]
    if (typeof first === 'string') {
        const parts = first.split('.')
        const last = parts[parts.length - 1]
        if (isSpecialSymbol(last)) {
            let subtree = rules
            for (let i = 0; i < parts.length - 1; i++) {
                if (subtree && typeof subtree === 'object')
                    subtree = subtree[parts[i]]
            }
            if (subtree === undefined) {
                const path = parts.slice(0, -1).join('.')
                throw new PermixRuleNotDefinedError(path)
            }
            const out = []
            const visit = (rule) => {
                if (typeof rule === 'boolean')
                    return void out.push(rule)
                if (typeof rule === 'function')
                    return void out.push(callRuleWithoutData(rule))
                for (const key in rule)
                    visit(rule[key])
            }
            visit(subtree)
            return last === '~all' ? out.every(Boolean) : out.some(Boolean)
        }
        if (first.includes('.'))
            args = [...parts, ...args.slice(1)]
    }
    let rule = rules
    let i = 0
    for (; i < args.length && typeof rule === 'object'; i++)
        rule = rule[String(args[i])]
    if (typeof rule === 'boolean')
        return rule
    if (typeof rule === 'function')
        return Boolean(rule(args[i]))
    const path = args.slice(0, i + 1).join('.')
    throw new PermixRuleNotDefinedError(path)
}
export function createCheck(rules) {
    return (...args) => {
        const r = typeof rules === 'function' ? rules() : rules
        if (!r)
            throw new PermixNotReadyError()
        if (typeof args[0] === 'function')
            return Boolean(args[0]((path, ...data) => walk(r, [path, ...data])))
        return walk(r, args)
    }
}
export function createCheckContext(...params) {
    const first = params[0]
    if (typeof first === 'function')
        return { path: null }
    const last = first.split('.').pop()
    if (isSpecialSymbol(last))
        return { path: first }
    return { path: first, data: params[1] }
}
