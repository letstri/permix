import type { AccessControl, Role, Statements } from 'better-auth/plugins/access'
import type { Permix as PermixCore } from '../core'
import type { Rules } from '../core/rules'
import type { MaybeArray } from '../utils'
import { createPermix as createPermixCore } from '../core'
import { PermixInvalidRoleInputError, PermixRoleNotFoundError } from './errors'

export type BetterAuthStatement<S extends Statements> = {
  [R in keyof S & string]: [...S[R]]
}

type RolesInput<Roles extends Record<string, Role<any>>> = MaybeArray<keyof Roles | Role<any>>

/**
 * The Permix instance returned by {@link createPermix}. Extends the core
 * Permix API with a better-auth-specific `createRules` builder.
 */
export interface BetterAuthPermix<
  S extends Statements,
  Roles extends Record<string, Role<any>> = Record<string, Role<any>>,
> extends PermixCore<BetterAuthStatement<S>> {
  /**
   * Build a typed `Rules` object from one or more better-auth roles.
   *
   * Accepts role objects, role name strings (looked up in the `roles` map),
   * or an array mixing any of the above.
   * When multiple roles are provided, their permissions are **unioned** —
   * an action is allowed if **any** role grants it.
   *
   * The returned object is a plain `Rules<D>` (all booleans) that you
   * compose freely with `setup()`, `template()`, spread overrides, etc.
   *
   * @example
   * ```ts
   * permix.setup(permix.createRules('admin'))
   * permix.setup(permix.createRules(['member', 'admin']))
   * permix.setup({ ...permix.createRules('member'), project: { delete: true } })
   * ```
   */
  createRules: (roles: RolesInput<Roles>) => Rules<BetterAuthStatement<S>>
}

function isRole(value: unknown): value is Role {
  return (
    typeof value === 'object'
    && value !== null
    && 'statements' in value
    && 'authorize' in value
  )
}

function isAccessControl<S extends Statements>(ac: AccessControl<S> | S): ac is AccessControl<S> {
  return 'newRole' in ac
}

function resolveRoles<Roles extends Record<string, Role<any>>>(
  input: RolesInput<Roles>,
  roles: Roles,
): Role<any>[] {
  if (isRole(input))
    return [input]

  if (typeof input === 'string') {
    const role = roles[input]
    if (!role) {
      throw new PermixRoleNotFoundError(input)
    }
    return [role]
  }

  if (Array.isArray(input))
    return input.flatMap(item => resolveRoles(item, roles))

  throw new PermixInvalidRoleInputError()
}

/**
 * Create a type-safe Permix instance whose permission tree is derived from
 * a better-auth access-control instance (or raw statements object).
 *
 * Works uniformly with the **organization** plugin, the **admin** plugin,
 * and any custom `createAccessControl(...)` — they all share the same
 * underlying `Statements` / `Role` primitives.
 *
 * @param options - Optional configuration.
 * @param options.ac - An access-control instance (`createAccessControl(s)`) or a
 *   raw statements object (`{ resource: readonly string[] }`).
 * @param options.roles - A named map of roles for string-based lookups in
 *   `createRules()`.
 *
 * @example
 * ```ts
 * import { createAccessControl } from 'better-auth/plugins/access'
 * import { createPermix } from 'permix/better-auth'
 *
 * const ac = createAccessControl({ project: ['create', 'read', 'update', 'delete'] } as const)
 * const admin = ac.newRole({ project: ['create', 'read', 'update'] })
 * const member = ac.newRole({ project: ['read'] })
 *
 * const permix = createPermix({ ac, roles: { admin, member } })
 *
 * permix.setup(permix.createRules('admin'))
 * permix.check('project.update') // true
 * permix.check('project.delete') // false
 * ```
 */
export function createPermix<
  const S extends Statements,
  Roles extends Record<string, Role<any>>,
>(
  options: {
    ac: AccessControl<S> | S
    roles: Roles
  },
): BetterAuthPermix<S, Roles> {
  const statements = isAccessControl(options.ac) ? options.ac.statements : options.ac

  type D = BetterAuthStatement<S>

  const permix = createPermixCore<D>()

  function buildRules(input: RolesInput<Roles>): Rules<D> {
    const resolved = resolveRoles(input, options.roles)
    const obj: Record<string, Record<string, boolean>> = {}

    for (const [resource, actions] of Object.entries(statements)) {
      obj[resource] = {}
      for (const action of actions) {
        // Delegate the membership check to better-auth's own `authorize`
        // instead of reimplementing it, so the semantics stay in sync.
        obj[resource][action] = resolved.some(
          r => r.authorize({ [resource]: [action] }).success,
        )
      }
    }

    return obj as Rules<D>
  }

  return Object.assign(permix, {
    createRules: buildRules,
  })
}

/** Convenience type for the object returned by {@link createPermix}. */
export type BetterAuthPermixInstance<
  S extends Statements,
  Roles extends Record<string, Role<any>> = Record<string, Role<any>>,
> = ReturnType<typeof createPermix<S, Roles>>
