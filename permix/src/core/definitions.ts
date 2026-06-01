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
export type Definition = readonly Action[] | { [key: string]: Definition }

export type ValidateDefinition<D extends Definition> = D & ([Extract<Definition, string>] extends [never] ? unknown : Extract<Definition, string>)

/**
 * Resolve an {@link Action} to its string name — the bare string for plain
 * actions, or the `name` field for {@link ActionSpec} objects.
 */
export type ActionName<A extends Action>
  = A extends string ? A
    : A extends { name: infer N extends string } ? N
      : never
