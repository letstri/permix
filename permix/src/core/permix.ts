import type { CheckArgs } from './check'
import type { DehydratedState, Rules } from './rules'
import type { Action, ActionName, Statement } from './statements'
import { createCheck } from './check'
import { PermixNotReadyError } from './errors'
import { createHooks } from './hooks'
import { createRules, dehydrateRules, hydrateRules } from './rules'
import { createTemplate } from './template'

export type { DehydratedState, Rules } from './rules'

type ActionArgs<A extends Action>
  = A extends { type: infer T, typeRequired: true } ? [T]
    : A extends { type: infer T } ? [T?]
    : []

type ActionByName<A extends Action, N extends string>
  = A extends unknown ? ActionName<A> extends N ? A : never : never

// This is a hack to limit the depth because of TypeScript's recursive type limits
type Depth = [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]

export type RulesPaths<D, Prefix extends string = '', N extends unknown[] = Depth>
  = N extends [unknown, ...infer Rest]
    ? D extends readonly Action[]
      ? `${Prefix}${ActionName<D[number]>}`
      : { [K in keyof D & string]: D[K] extends Statement ? RulesPaths<D[K], `${Prefix}${K}.`, Rest> : never }[keyof D & string]
    : never

export type SpecialSymbol = '~any' | '~all'

export type SpecialPath<D, Prefix extends string = '', N extends unknown[] = Depth>
  = N extends [unknown, ...infer Rest]
  ? `${Prefix}${SpecialSymbol}` | (D extends readonly Action[]
        ? never
        : { [K in keyof D & string]: D[K] extends Statement ? SpecialPath<D[K], `${Prefix}${K}.`, Rest> : never }[keyof D & string])
    : never

export type DataAtPath<D, P extends string, N extends unknown[] = Depth>
  = N extends [unknown, ...infer Rest]
    ? D extends readonly Action[]
      ? ActionArgs<ActionByName<D[number], P>>
      : P extends `${infer K}.${infer Tail}`
        ? K extends keyof D ? DataAtPath<D[K], Tail, Rest> : never
        : never
    : never

export type CheckerFn<D extends Statement>
  = <P extends RulesPaths<D>>(path: P, ...data: DataAtPath<D, P>) => boolean

export interface PermixHooks {
  setup: () => void
  ready: () => void
}

export interface Permix<D extends Statement> {
  /**
   * Provide the rules for this Permix instance. Must be called before `check()`.
   *
   * The rules object mirrors the shape of `D`: every leaf action becomes either
   * a `boolean` or a `(data) => boolean` validator.
   *
   * @example
   * ```ts
   * permix.setup({
   *   post: {
   *     create: true,
   *     edit: (post) => post.authorId === currentUserId,
   *   },
   * })
   * ```
   */
  setup: (rules: Rules<D>) => void

  /**
   * Evaluate the current rules. Accepts one of three calling forms:
   *
   * - **Dot-path** — check a single action at a leaf path. Pass extra
   *   arguments after the path when the matched action declares `type`
   *   (required when `typeRequired: true`, optional otherwise).
   * - **Special token** — `'~any'` returns `true` if **any** rule in the tree
   *   (including dynamic ones called with no data) is truthy; `'~all'` returns
   *   `true` only if **every** rule is truthy. Prefix with a dot-path to scope
   *   the aggregation to a subtree, e.g. `'post.~all'` or
   *   `'workspace.customer.~any'`.
   * - **Callback** — compose multiple checks. `c` eagerly evaluates a rule and
   *   returns a plain boolean, so combine with `&&`, `||`, `!`, ternaries, or
   *   any custom logic.
   *
   * @example
   * ```ts
   * permix.check('post.create')
   * permix.check('post.edit', { authorId })
   * permix.check('~any')
   * permix.check('~all')
   * permix.check('post.~all')
   * permix.check('workspace.customer.~any')
   * permix.check(c => c('post.read') && c('post.edit'))
   * permix.check(c => !c('post.read'))
   * ```
   */
  check: (...args: CheckArgs<D>) => boolean

  /**
   * Serialize the current rules into a JSON-safe object.
   *
   * Function-based rules are invoked once (with no check data) and their
   * boolean result is stored. Re-run `setup()` on the client if you need
   * dynamic rules that depend on check-time data.
   *
   * @example
   * ```ts
   * const state = permix.dehydrate()
   * // { post: { create: true, edit: false } }
   * ```
   */
  dehydrate: () => DehydratedState<D>

  /**
   * Restore rules from a value produced by `dehydrate()`.
   *
   * Hydration restores only the serialized booleans and **does not** mark the
   * instance as ready: `isReady()` stays `false` and `isReadyAsync()` stays
   * pending until `setup()` is called. This is deliberate — dehydrated state
   * loses function-based rules, so you must re-run `setup()` on the client to
   * fully restore them. Gating on readiness surfaces a forgotten `setup()`
   * instead of silently serving collapsed permissions.
   *
   * @example
   * ```ts
   * permix.hydrate(serverState) // isReady() === false
   * permix.setup(clientRules)   // isReady() === true
   * ```
   */
  hydrate: (state: DehydratedState<D>) => void

  /**
   * Define reusable permission rules separate from `setup()`.
   *
   * Static templates return a zero-arg function; dynamic templates accept
   * runtime parameters and return rules for `setup()`.
   *
   * @example
   * ```ts
   * const adminPermissions = permix.template({
   *   post: { create: true, read: true },
   * })
   * permix.setup(adminPermissions())
   * ```
   */
  template: <T = void>(
    rules: Rules<D> | ((param: T) => Rules<D>),
  ) => (() => Rules<D>) | ((param: T) => Rules<D>)

  /**
   * Register a hook that fires every time the named event occurs.
   * Returns a function that removes the listener.
   *
   * @example
   * ```ts
   * const remove = permix.hook('setup', () => {
   *   console.log('Permissions were updated')
   * })
   * ```
   */
  hook: <K extends keyof PermixHooks>(name: K, fn: PermixHooks[K]) => () => void

  /**
   * Register a hook that fires only once for the named event.
   *
   * @example
   * ```ts
   * permix.hookOnce('setup', () => {
   *   console.log('Permissions were updated once')
   * })
   * ```
   */
  hookOnce: <K extends keyof PermixHooks>(name: K, fn: PermixHooks[K]) => void

  /**
   * Returns `true` if `setup()` has been called at least once (or initial
   * rules were passed to `createPermix`). `hydrate()` alone does **not** make
   * the instance ready.
   */
  isReady: () => boolean

  /**
   * Returns a promise that resolves once the instance is ready — i.e. once
   * `setup()` has been called, or initial rules were provided. `hydrate()`
   * does **not** resolve it. Resolves immediately if already ready.
   *
   * @example
   * ```ts
   * await permix.isReadyAsync()
   * permix.check('post.create')
   * ```
   */
  isReadyAsync: () => Promise<void>

  /**
   * Returns the current rules object.
   */
  getRules: () => Rules<D> | null

  /**
   * Type-only helper that resolves to the union of every valid permission path
   * for this Permix instance (e.g. `'user.create' | 'post.read'`). Use it with
   * `typeof` to derive permission-path types without restating the statement.
   *
   * @example Single path
   * ```ts
   * const path: typeof permix.$inferPath = 'user.create'
   * ```
   *
   * @example Array of paths
   * ```ts
   * const permix = createPermix<{
   *   user: ['create']
   *   job: ['remove']
   * }>()
   *
   * const AVAILABLE_PERMISSIONS = ['user.create', 'job.remove']
   *   satisfies (typeof permix.$inferPath)[]
   * ```
   *
   * @remarks
   * Has no runtime value (it is `undefined`); exists purely as a type carrier
   * and is not intended to be read at runtime.
   */
  readonly $inferPath: RulesPaths<D>
}

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
export function createPermix<D extends Statement>(initialRules?: Rules<D>): Permix<D> {
  let rules: Rules<D> | null = initialRules ?? null
  let ready = !!initialRules
  const hooks = createHooks<PermixHooks>()

  const { promise: readyPromise, resolve: resolveReady } = ready
    ? { promise: Promise.resolve(), resolve: () => {} }
    : Promise.withResolvers<void>()

  return {
    setup(r) {
      rules = createRules<D>(r)
      hooks.callHook('setup')
      if (!ready) {
        ready = true
        resolveReady()
        hooks.callHook('ready')
      }
    },
    check: createCheck<D>(() => rules),
    dehydrate() {
      if (!rules)
        throw new PermixNotReadyError()
      return dehydrateRules(rules) as DehydratedState<D>
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
    $inferPath: undefined as unknown as RulesPaths<D>,
  }
}
