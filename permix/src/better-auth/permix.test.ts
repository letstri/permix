import { createAccessControl } from 'better-auth/plugins/access'
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access'
import { describe, expect, it } from 'vitest'
import { PermixRoleNotFoundError } from './errors'
import { createPermix } from './permix'

export const ac = createAccessControl({
  ...defaultStatements,
  project: ['create', 'read', 'update', 'delete'],
})

const member = ac.newRole({
  ...memberAc.statements,
  project: ['read'],
})

const admin = ac.newRole({
  ...adminAc.statements,
  project: ['create', 'read', 'update'],
})

const owner = ac.newRole({
  ...ownerAc.statements,
  project: ['create', 'read', 'update', 'delete'],
})

export const roles = { member, admin, owner }

describe('better-auth createPermix', () => {
  it('createRules + setup for a single role name', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.createRules('admin'))

    expect(permix.check('project.create')).toBe(true)
    expect(permix.check('project.read')).toBe(true)
    expect(permix.check('project.update')).toBe(true)
    expect(permix.check('project.delete')).toBe(false)

    expect(permix.check('invitation.create')).toBe(true)
    expect(permix.check('invitation.cancel')).toBe(true)
  })

  it('createRules + setup for owner role', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.createRules('owner'))

    expect(permix.check('project.create')).toBe(true)
    expect(permix.check('project.delete')).toBe(true)
    expect(permix.check('organization.delete')).toBe(true)
  })

  it('createRules + setup for member role', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.createRules('member'))

    expect(permix.check('project.read')).toBe(true)
    expect(permix.check('project.create')).toBe(false)
    expect(permix.check('project.update')).toBe(false)
    expect(permix.check('project.delete')).toBe(false)
    expect(permix.check('organization.update')).toBe(false)
  })

  it('unions permissions when multiple role names are passed as an array', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.createRules(['member', 'admin']))

    expect(permix.check('project.read')).toBe(true)
    expect(permix.check('project.create')).toBe(true)
    expect(permix.check('project.update')).toBe(true)
    expect(permix.check('project.delete')).toBe(false)
  })

  it('accepts a Role object directly', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.createRules(admin))

    expect(permix.check('project.create')).toBe(true)
    expect(permix.check('project.update')).toBe(true)
    expect(permix.check('project.delete')).toBe(false)
  })

  it('accepts an array mixing Role objects and name strings', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.createRules([member, 'admin']))

    expect(permix.check('project.read')).toBe(true)
    expect(permix.check('project.create')).toBe(true)
    expect(permix.check('project.delete')).toBe(false)
  })

  it('supports override composition via spread', () => {
    const permix = createPermix({ ac, roles })

    permix.setup({
      ...permix.createRules('member'),
      project: { create: false, read: true, update: false, delete: true },
    })

    expect(permix.check('project.read')).toBe(true)
    expect(permix.check('project.delete')).toBe(true)
    expect(permix.check('project.create')).toBe(false)
  })

  it('throws PermixRoleNotFoundError when an unknown role name is used', () => {
    const permix = createPermix({ ac, roles })

    // @ts-expect-error unknown role
    expect(() => permix.createRules('nonexistent')).toThrow(PermixRoleNotFoundError)
  })

  it('dehydrate/hydrate works with createRules output', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.createRules('admin'))

    const state = permix.dehydrate()

    expect(state.project.create).toBe(true)
    expect(state.project.delete).toBe(false)

    const permix2 = createPermix({ ac, roles })

    permix2.hydrate(state)

    expect(permix2.check('project.create')).toBe(true)
    expect(permix2.check('project.delete')).toBe(false)
  })

  it('template works with createRules output', () => {
    const permix = createPermix({ ac, roles })

    const adminTemplate = permix.template(permix.createRules('admin'))

    permix.setup(adminTemplate())

    expect(permix.check('project.create')).toBe(true)
    expect(permix.check('project.delete')).toBe(false)
  })
})
