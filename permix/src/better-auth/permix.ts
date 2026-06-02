import type { AccessControl, Role, Statements } from 'better-auth/plugins/access'
import type { Permix as PermixCore, Rules } from '../core'
import { createPermix as createPermixCore } from '../core'
import { PermixInvalidAccessControlError, PermixUnknownRoleError } from './errors'

/**
 * Builds a Permix {@link import('../core/definitions').Definition} from a
 * better-auth access control statement, mapping every resource key to its
 * action tuple.
 *
 * `[...TStatements[K]]` strips the `readonly` modifier from the action tuple
 * so the result matches Permix's `Definition` leaf type (a mutable `Action[]`).
 */
export type BetterAuthDefinition<TStatements extends Statements> = {
  [K in keyof TStatements & string]: [...TStatements[K]]
}

/**
 * A map of role name to better-auth {@link Role}, identical to the `roles`
 * object you pass to better-auth's `organization({ ac, roles })` plugin.
 */
export type BetterAuthRoles = Record<string, Role>

/**
 * Anything {@link BetterAuthPermix.roleToRules} can resolve into rules: a
 * better-auth {@link Role} object or — when `roles` were provided to
 * {@link createPermix} — a role name (`keyof Roles`).
 */
export type RoleResolvable<Roles extends BetterAuthRoles | undefined>
  = Role | (Roles extends BetterAuthRoles ? keyof Roles & string : never)

export interface CreateBetterAuthPermixOptions<
  TStatements extends Statements,
  Roles extends BetterAuthRoles | undefined = undefined,
> {
  /**
   * The better-auth access controller created with `createAccessControl`.
   * Its `statements` drive the generated Permix definition.
   */
  ac: AccessControl<TStatements>

  /**
   * The roles created with `ac.newRole(...)`, identical to the ones you pass
   * to better-auth's `organization({ ac, roles })` plugin. When provided you
   * can resolve rules by role name via {@link BetterAuthPermix.roleToRules}.
   */
  roles?: Roles
}

/**
 * The Permix instance returned by {@link createPermix}. Extends the core
 * Permix API with better-auth-specific metadata and a `roleToRules` helper.
 */
export interface BetterAuthPermix<
  TStatements extends Statements,
  Roles extends BetterAuthRoles | undefined = undefined,
> extends PermixCore<BetterAuthDefinition<TStatements>> {
  /**
   * The original better-auth statement object (`ac.statements`).
   */
  readonly statements: TStatements

  /**
   * The resource names detected in the statement.
   */
  readonly resources: (keyof TStatements & string)[]

  /**
   * The roles provided to {@link createPermix}, or `undefined`.
   */
  readonly roles: Roles

  /**
   * Convert better-auth role(s) into a fully-populated Permix rules object.
   *
   * Each action is `true` if it is granted by **any** of the supplied roles,
   * otherwise `false`. Accepts a single role, a role name (when `roles` were
   * provided), or an array mixing both.
   *
   * @example By role object
   * ```ts
   * permix.setup(permix.roleToRules(admin))
   * ```
   *
   * @example By role name
   * ```ts
   * permix.setup(permix.roleToRules('admin'))
   * permix.setup(permix.roleToRules(['admin', 'member']))
   * ```
   *
   * @example From a comma-separated better-auth session role
   * ```ts
   * permix.setup(permix.roleToRules(member.role.split(',')))
   * ```
   */
  roleToRules: (
    input: RoleResolvable<Roles> | RoleResolvable<Roles>[],
  ) => Rules<BetterAuthDefinition<TStatements>>
}

/**
 * Create a type-safe Permix instance whose permission tree mirrors a
 * better-auth access control statement created with `createAccessControl`.
 * Every resource in the statement becomes a top-level entity with its
 * declared actions.
 *
 * @example
 * ```ts
 * import { createAccessControl } from 'better-auth/plugins/access'
 * import { createPermix } from 'permix/better-auth'
 *
 * const statement = { project: ['create', 'share', 'update', 'delete'] } as const
 * const ac = createAccessControl(statement)
 *
 * const owner = ac.newRole({ project: ['create', 'share', 'update', 'delete'] })
 * const admin = ac.newRole({ project: ['create', 'update'] })
 * const member = ac.newRole({ project: ['create'] })
 *
 * const permix = createPermix({ ac, roles: { owner, admin, member } })
 *
 * permix.setup(permix.roleToRules('admin'))
 *
 * permix.check('project.create') // true
 * permix.check('project.delete') // false
 * ```
 */
export function createPermix<
  const TStatements extends Statements,
  const Roles extends BetterAuthRoles | undefined = undefined,
>(
  options: CreateBetterAuthPermixOptions<TStatements, Roles>,
): BetterAuthPermix<TStatements, Roles> {
  const { ac, roles } = options

  if (!ac || typeof ac !== 'object' || !('statements' in ac)) {
    throw new PermixInvalidAccessControlError()
  }

  const statements = ac.statements
  const resources = Object.keys(statements) as (keyof TStatements & string)[]

  type D = BetterAuthDefinition<TStatements>

  const permix = createPermixCore<D>()

  const resolveRole = (role: RoleResolvable<Roles>): Role => {
    if (typeof role === 'string') {
      const resolved = roles?.[role]

      if (!resolved) {
        throw new PermixUnknownRoleError(role)
      }

      return resolved
    }

    return role
  }

  const roleToRules = (
    input: RoleResolvable<Roles> | RoleResolvable<Roles>[],
  ): Rules<D> => {
    const resolved = (Array.isArray(input) ? input : [input]).map(resolveRole)

    const rules = {} as Record<string, Record<string, boolean>>

    for (const resource of resources) {
      rules[resource] = {}

      for (const action of statements[resource]) {
        rules[resource][action] = resolved.some(
          role => role.statements[resource]?.includes(action) ?? false,
        )
      }
    }

    return rules as Rules<D>
  }

  return Object.assign(permix, {
    statements,
    resources,
    roles: roles as Roles,
    roleToRules,
  }) as BetterAuthPermix<TStatements, Roles>
}

/** Convenience type for the object returned by {@link createPermix}. */
export type BetterAuthPermixInstance<
  TStatements extends Statements,
  Roles extends BetterAuthRoles | undefined = undefined,
> = ReturnType<typeof createPermix<TStatements, Roles>>
