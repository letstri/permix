export interface ActionSpec {
  name: string
  type?: unknown
  typeRequired?: boolean
}

export type Action = string | ActionSpec

/**
 * The full type of a permissions tree passed to `createPermix<D>()`.
 *
 * @example Flat
 * ```ts
 * type D = ['read', 'write']
 * ```
 *
 * @example One level
 * ```ts
 * type D = {
 *   post: ['create', 'read']
 *   user: ['invite']
 * }
 * ```
 *
 * @example Deeply nested
 * ```ts
 * type D = {
 *   workspace: {
 *     member: ['invite', 'remove']
 *     billing: ['view', 'update']
 *   }
 * }
 * ```
 */
export type Statement = readonly Action[] | { [key: string]: Statement }

export type ValidateStatement<D extends Statement> = D & ([Extract<Statement, string>] extends [never] ? unknown : Extract<Statement, string>)

/**
 * Resolve an {@link Action} to its string name — the bare string for plain
 * actions, or the `name` field for {@link ActionSpec} objects.
 */
export type ActionName<A extends Action>
  = A extends string ? A
    : A extends { name: infer N extends string } ? N
    : never
