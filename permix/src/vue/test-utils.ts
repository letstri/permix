import type { VueWrapper } from '@vue/test-utils'
import type { Permix } from '../core'
import { mount } from '@vue/test-utils'
import { PermixProvider } from './components'

export function mountWithPermix(
  component: Parameters<typeof mount>[0],
  permix: Permix<any>,
  options?: Parameters<typeof mount>[1],
): VueWrapper {
  return mount({
    components: { PermixProvider, TestComponent: component },
    template: '<PermixProvider :permix="permix"><TestComponent /></PermixProvider>',
    setup: () => ({ permix }),
  }, options)
}
