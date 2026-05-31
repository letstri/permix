import { describe, expect, it } from 'vitest'
import { permixClient } from './client'
import { createPermix } from './permix'
import { ac, roles } from './permix.test'
import { permixPlugin } from './plugin'

describe('permixPlugin', () => {
  it('returns a plugin with id "permix" and a getPermissions endpoint', () => {
    const permix = createPermix({ ac, roles })

    const plugin = permixPlugin({
      rules: () => permix.createRules('admin'),
    })

    expect(plugin.id).toBe('permix')
    expect(plugin.endpoints).toBeDefined()
    expect(plugin.endpoints.getPermissions).toBeDefined()
  })

  it('admin rules produce correct dehydrated output via setup + dehydrate', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.createRules('admin'))
    const dehydrated = permix.dehydrate()

    expect(dehydrated.project.create).toBe(true)
    expect(dehydrated.project.read).toBe(true)
    expect(dehydrated.project.update).toBe(true)
    expect(dehydrated.project.delete).toBe(false)
  })

  it('rules callback with role-based createRules matches direct setup + dehydrate', () => {
    const permix = createPermix({ ac, roles })
    const permix2 = createPermix({ ac, roles })

    const adminRules = permix.createRules('admin')

    permix.setup(adminRules)
    permix2.setup(adminRules)

    expect(permix.dehydrate()).toEqual(permix2.dehydrate())
  })

  it('owner role produces correct permissions', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.createRules('owner'))
    const dehydrated = permix.dehydrate()

    expect(dehydrated.project.create).toBe(true)
    expect(dehydrated.project.delete).toBe(true)
    expect(dehydrated.organization.delete).toBe(true)
  })

  it('member role produces restricted permissions', () => {
    const permix = createPermix({ ac, roles })

    permix.setup(permix.createRules('member'))
    const dehydrated = permix.dehydrate()

    expect(dehydrated.project.read).toBe(true)
    expect(dehydrated.project.create).toBe(false)
    expect(dehydrated.project.update).toBe(false)
    expect(dehydrated.project.delete).toBe(false)
  })
})

describe('permixClient', () => {
  it('returns a client plugin with id "permix"', () => {
    const client = permixClient()

    expect(client.id).toBe('permix')
  })

  it('has the correct pathMethods shape', () => {
    const client = permixClient()

    expect(client.pathMethods).toEqual({
      '/permix/get-permissions': 'GET',
    })
  })
})
