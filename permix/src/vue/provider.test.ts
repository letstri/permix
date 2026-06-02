import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createPermix } from '../core'
import { PermixProvider } from './components'

describe('permix vue provider', () => {
  it('should throw an error if permix instance is not provided', () => {
    expect(() => {
      mount(PermixProvider, {
        props: {
          // @ts-expect-error - intentionally passing undefined
          permix: undefined,
        },
      })
    }).toThrow('[Permix]: Looks like you forgot to provide the permix instance to PermixProvider')
  })

  it('should not throw an error when permix instance is provided', () => {
    const permix = createPermix<{ post: ['read'] }>()

    expect(() => {
      mount({
        components: { PermixProvider },
        template: '<PermixProvider :permix="permix"><div /></PermixProvider>',
        setup: () => ({ permix }),
      })
    }).not.toThrow()
  })
})
