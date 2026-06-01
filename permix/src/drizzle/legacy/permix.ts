import type { Table } from 'drizzle-orm'
import type { Permix as PermixCore } from '../../core'
import { Table as DrizzleTable, is } from 'drizzle-orm'
import { createPermix as createPermixCore } from '../../core'

/**
 * The default CRUD action set used when no `actions` are provided.
 */
export const DEFAULT_DRIZZLE_ACTIONS = ['create', 'read', 'update', 'delete'] as const

export type DefaultDrizzleAction = (typeof DEFAULT_DRIZZLE_ACTIONS)[number]

/**
 * Picks the keys of `S` whose values are Drizzle tables (`Table` instances).
 *
 * Anything that isn't a table (relations, enums, helpers, etc.) is filtered
 * out so the generated definition only contains real entities.
 */
export type DrizzleTableKeys<S> = {
  [K in keyof S]: S[K] extends Table<any> ? K & string : never
}[keyof S]

/**
 * Builds a Permix {@link Definition} from a Drizzle schema object, assigning
 * the same `actions` tuple to every table that lives in the schema.
 *
 * `[...Actions]` strips the `readonly` modifier from the tuple so the result
 * matches Permix's `Definition` leaf type (a mutable `Action[]`).
 */
export type DrizzleDefinition<
  S,
  Actions extends readonly string[] = readonly DefaultDrizzleAction[],
> = {
  [K in DrizzleTableKeys<S>]: [...Actions]
}

/**
 * A partial map of `{ action: boolean }` used as a shortcut when generating
 * baseline rules with {@link DrizzlePermix.generateRules}. Missing actions
 * default to `false`.
 */
export type ActionMap<Actions extends readonly string[]>
  = Partial<Record<Actions[number], boolean>>

export interface CreateDrizzlePermixOptions<Actions extends readonly string[]> {
  /**
   * Override the actions generated for every table. Pass an `as const` tuple
   * to preserve literal types.
   *
   * @default ['create', 'read', 'update', 'delete']
   */
  actions?: Actions
}

/**
 * The Permix instance returned by {@link createPermix}. Extends the core
 * Permix API with Drizzle-specific helpers for generating rules.
 */
export interface DrizzlePermix<
  S,
  Actions extends readonly string[],
> extends PermixCore<DrizzleDefinition<S, Actions>> {
  /**
   * The list of action names that were generated for every table.
   */
  readonly actions: Actions

  /**
   * The list of table names that were detected in the supplied schema.
   */
  readonly tables: DrizzleTableKeys<S>[]
}

/**
 * Create a type-safe Permix instance whose permission tree mirrors a Drizzle
 * schema. Every exported table becomes a top-level entity with the same set
 * of actions (CRUD by default).
 *
 * Non-table exports such as `relations`, enums, helpers, etc. are skipped at
 * both the type and runtime layers, so you can pass `import * as schema` as-is.
 *
 * @example
 * ```ts
 * import * as schema from './schema'
 * import { createPermix } from 'permix/drizzle'
 *
 * const permix = createPermix(schema)
 *
 * permix.setup({
 *   users: { create: true, read: true, update: false, delete: false },
 *   posts: { create: true, read: true, update: true, delete: false },
 * })
 *
 * permix.check('users.read') // true
 * ```
 *
 * @example Customising actions
 * ```ts
 * const permix = createPermix(schema, {
 *   actions: ['view', 'edit'] as const,
 * })
 * ```
 */
export function createPermix<
  S extends Record<string, unknown>,
  const Actions extends readonly string[] = readonly DefaultDrizzleAction[],
>(
  schema: S,
  options: CreateDrizzlePermixOptions<Actions> = {},
): DrizzlePermix<S, Actions> {
  const actions = (options.actions ?? DEFAULT_DRIZZLE_ACTIONS) as unknown as Actions

  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error('[Permix]: `actions` must be a non-empty array of strings.')
  }

  const tables = Object.entries(schema)
    .filter(([, value]) => is(value as object, DrizzleTable))
    .map(([key]) => key) as DrizzleTableKeys<S>[]

  type D = DrizzleDefinition<S, Actions>

  const permix = createPermixCore<D>()

  return Object.assign(permix, { actions, tables }) as DrizzlePermix<S, Actions>
}

/** Convenience type for the object returned by {@link createPermix}. */
export type DrizzlePermixInstance<
  S extends Record<string, unknown>,
  Actions extends readonly string[] = readonly DefaultDrizzleAction[],
> = ReturnType<typeof createPermix<S, Actions>>
