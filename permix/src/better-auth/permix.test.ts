import { createAccessControl } from 'better-auth/plugins/access'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { PermixRuleNotDefinedError } from '../core/errors'
import { PermixInvalidAccessControlError, PermixUnknownRoleError } from './errors'
import { createPermix } from './permix'

const statement = {
  project: ['create', 'share', 'update', 'delete'],
  organization: ['update', 'delete'],
} as const

const ac = createAccessControl(statement)

const owner = ac.newRole({
  project: ['create', 'share', 'update', 'delete'],
  organization: ['update', 'delete'],
})

const admin = ac.newRole({
  project: ['create', 'update'],
  organization: ['update'],
})

const member = ac.newRole({
  project: ['create'],
})

const roles = { owner, admin, member }

describe('better-auth createPermix', () => {
  it('mirrors the statement as resources', () => {
    const permix = createPermix({ ac })

    expect(permix.resources).toEqual(['project', 'organization'])
    expect(permix.statements).toBe(statement)
  })

  it('accepts rules for every resource and action', () => {
    const permix = createPermix({ ac })

    permix.setup({
      project: { create: true, share: false, update: true, delete: false },
      organization: { update: true, delete: false },
    })

    expect(permix.check('project.create')).toBe(true)
    expect(permix.check('project.share')).toBe(false)
    expect(permix.check('organization.update')).toBe(true)
    expect(permix.check('organization.delete')).toBe(false)
  })

  it('throws for unknown paths', () => {
    const permix = createPermix({ ac })

    permix.setup({
      project: { create: true, share: false, update: true, delete: false },
      organization: { update: true, delete: false },
    })

    // @ts-expect-error wrong path
    expect(() => permix.check('member.create')).toThrow(PermixRuleNotDefinedError)
  })

  it('converts a role object into rules', () => {
    const permix = createPermix({ ac })

    permix.setup(permix.roleToRules(admin))

    expect(permix.check('project.create')).toBe(true)
    expect(permix.check('project.update')).toBe(true)
    expect(permix.check('project.share')).toBe(false)
    expect(permix.check('project.delete')).toBe(false)
    expect(permix.check('organization.update')).toBe(true)
    expect(permix.check('organization.delete')).toBe(false)
  })

  it('converts a role by name when roles are provided', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.roleToRules('member'))

    expect(permix.check('project.create')).toBe(true)
    expect(permix.check('project.update')).toBe(false)
    expect(permix.check('organization.update')).toBe(false)
  })

  it('unions multiple roles (by name)', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.roleToRules(['member', 'admin']))

    expect(permix.check('project.create')).toBe(true) // both
    expect(permix.check('project.update')).toBe(true) // admin only
    expect(permix.check('project.delete')).toBe(false) // neither
    expect(permix.check('organization.update')).toBe(true) // admin only
  })

  it('unions a mix of role names and role objects', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.roleToRules(['member', owner]))

    expect(permix.check('project.delete')).toBe(true) // owner
    expect(permix.check('organization.delete')).toBe(true) // owner
  })

  it('grants everything for the owner role', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.roleToRules('owner'))

    expect(permix.check('project.delete')).toBe(true)
    expect(permix.check('organization.delete')).toBe(true)
  })

  it('throws for unknown role names', () => {
    const permix = createPermix({ ac, roles })

    // @ts-expect-error unknown role name
    expect(() => permix.roleToRules('ghost')).toThrow(PermixUnknownRoleError)
  })

  it('throws when a role name is passed but no roles were provided', () => {
    const permix = createPermix({ ac })

    // @ts-expect-error roles were not provided, so names are not allowed
    expect(() => permix.roleToRules('admin')).toThrow(PermixUnknownRoleError)
  })

  it('throws when ac is missing', () => {
    // @ts-expect-error ac is required
    expect(() => createPermix({})).toThrow(PermixInvalidAccessControlError)
  })

  it('works with templates', () => {
    const permix = createPermix({ ac, roles })

    const adminTemplate = permix.template(permix.roleToRules('admin'))

    permix.setup(adminTemplate())

    expect(permix.check('project.update')).toBe(true)
    expect(permix.check('project.delete')).toBe(false)
  })

  it('exposes correct types for resources and roles', () => {
    const permix = createPermix({ ac, roles })

    expectTypeOf(permix.resources).toEqualTypeOf<('project' | 'organization')[]>()
    expectTypeOf(permix.roles).toEqualTypeOf<typeof roles>()
  })
})
