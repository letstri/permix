import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { createPermix } from '../core'
import { permixPlugin } from './plugin'

describe('permixPlugin', () => {
  it('should throw an error if permix instance is not provided', () => {
    const app = createApp({})

    // Test that the plugin throws an error when no permix instance is provided
    expect(() => {
      // @ts-expect-error - intentionally passing undefined
      app.use(permixPlugin, {})
    }).toThrow('[Permix]: Looks like you forgot to provide the permix instance to the plugin')
  })

  it('should not throw an error when permix instance is provided', () => {
    const app = createApp({})
    const permix = createPermix<{ post: ['read'] }>()

    // Test that the plugin does not throw an error when permix instance is provided
    expect(() => {
      app.use(permixPlugin, { permix })
    }).not.toThrow()
  })
})
