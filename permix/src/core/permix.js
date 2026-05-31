import { createCheck } from './check'
import { PermixNotReadyError } from './errors'
import { createHooks } from './hooks'
import { createRules, dehydrateRules, hydrateRules } from './rules'
import { createTemplate } from './template'
/**
 * Create a type-safe Permix instance.
 *
 * @template D - A {@link Statement} describing the permission tree.
 *
 * @example Flat statement
 * ```ts
 * const permix = createPermix<['read', 'write']>()
 * permix.setup({ read: true, write: false })
 * permix.check('read') // true
 * ```
 *
 * @example Nested statement
 * ```ts
 * const permix = createPermix<{
 *   post: ['create', 'read']
 *   user: ['invite']
 * }>()
 * permix.setup({
 *   post: { create: true, read: true },
 *   user: { invite: false },
 * })
 * permix.check('post.create') // true
 * permix.check('user.invite') // false
 * ```
 *
 * @example Per-action data types
 * ```ts
 * const permix = createPermix<{
 *   post: [
 *     'create',
 *     'read',
 *     { name: 'edit', type: { authorId: string }, typeRequired: true },
 *   ]
 * }>()
 * permix.setup({
 *   post: {
 *     create: true,
 *     read: true,
 *     edit: post => post.authorId === me.id,
 *   },
 * })
 * permix.check('post.create')                // true
 * permix.check('post.edit', { authorId: '1' }) // true/false
 * ```
 */
export function createPermix(initialRules) {
    let rules = initialRules ?? null
    let ready = !!initialRules
    const hooks = createHooks()
    const { promise: readyPromise, resolve: resolveReady } = ready
        ? { promise: Promise.resolve(), resolve: () => { } }
        : Promise.withResolvers()
    return {
        setup(r) {
            rules = createRules(r)
            hooks.callHook('setup')
            if (!ready) {
                ready = true
                resolveReady()
                hooks.callHook('ready')
            }
        },
        check: createCheck(() => rules),
        dehydrate() {
            if (!rules)
                throw new PermixNotReadyError()
            return dehydrateRules(rules)
        },
        hydrate(state) {
            rules = hydrateRules(state)
            hooks.callHook('setup')
        },
        template(rules) {
            return createTemplate(rules)
        },
        hook: hooks.hook,
        hookOnce: hooks.hookOnce,
        isReady: () => ready,
        isReadyAsync: () => readyPromise,
        getRules: () => rules,
        $inferPath: undefined,
    }
}
