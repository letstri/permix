import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { createPermix, PermixRuleNotDefinedError } from '../core'
import { createComponents, PermixHydrate, PermixProvider } from './components'
import { usePermix } from './composables'
import { mountWithPermix } from './test-utils'

describe('components', () => {
  it('should check hydration', () => {
    const permixServer = createPermix<{
      post: ['create', 'read']
    }>()

    permixServer.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const dehydrated = permixServer.dehydrate()

    const permixClient = createPermix<{
      post: ['create', 'read']
    }>()

    const TestComponent = {
      template: "<div>{{ check('post.create') }}</div>",
      setup() {
        const { check } = usePermix(permixClient)
        return { check }
      },
    }

    const wrapper = mount({
      template: `
        <PermixProvider :permix="permix">
          <PermixHydrate :state="dehydrated">
            <TestComponent />
          </PermixHydrate>
        </PermixProvider>
      `,
      components: { PermixProvider, PermixHydrate, TestComponent },
      setup() {
        return { permix: permixClient, dehydrated }
      },
    })

    expect(wrapper.text()).toBe('true')
  })

  it('uses dehydrated rules on the first render', () => {
    const permixServer = createPermix<{
      post: ['create', 'read']
    }>()

    permixServer.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const dehydrated = permixServer.dehydrate()
    const permixClient = createPermix<{
      post: ['create', 'read']
    }>()

    const TestComponent = {
      template: "<div>{{ check('post.create') }}:{{ isReady }}</div>",
      setup() {
        const { check, isReady } = usePermix(permixClient)
        return { check, isReady }
      },
    }

    const wrapper = mount({
      template: `
        <PermixProvider :permix="permix">
          <PermixHydrate :state="dehydrated">
            <TestComponent />
          </PermixHydrate>
        </PermixProvider>
      `,
      components: { PermixProvider, PermixHydrate, TestComponent },
      setup() {
        return { permix: permixClient, dehydrated }
      },
    })

    expect(wrapper.text()).toBe('true:false')
  })

  it('should work with Check component', () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({
      post: {
        create: true,
      },
    })

    const text = 'Post can be created'

    const { Check } = createComponents(permix)

    const TestPost = {
      template: `
        <Check path="post.create">
          <div>{{ text }}</div>
        </Check>
      `,
      components: { Check },
      setup() {
        return { text }
      },
    }

    const wrapper = mountWithPermix(TestPost, permix)

    expect(wrapper.text()).toContain(text)
  })

  it('should work with Check component and data', () => {
    const permix = createPermix<{
      post: [{ name: 'edit'; type: { authorId: string } }]
    }>()

    permix.setup({
      post: {
        edit: (post) => post?.authorId === '1',
      },
    })

    const canText = 'Post can be created'
    const cannotText = 'Post cannot be created'

    const { Check } = createComponents(permix)

    const TestPost1 = {
      template: `
        <Check path="post.edit" :data="{ authorId: '1' }">
          <div data-testid="post-can-be-created">{{ text }}</div>
        </Check>
      `,
      components: { Check },
      setup() {
        return { text: canText }
      },
    }

    const wrapper1 = mountWithPermix(TestPost1, permix)

    expect(wrapper1.html()).toContain(canText)

    const TestPost2 = {
      template: `
        <Check path="post.edit" :data="{ authorId: '2' }">
          <div data-testid="post-can-be-created">{{ canText }}</div>
          <template #otherwise>
            <div data-testid="otherwise">{{ cannotText }}</div>
          </template>
        </Check>
      `,
      components: { Check },
      setup() {
        return { canText, cannotText }
      },
    }

    const wrapper2 = mountWithPermix(TestPost2, permix)

    expect(wrapper2.html()).not.toContain(canText)
    expect(wrapper2.html()).toContain(cannotText)
  })

  it('should work with Check component and DOM rerender', async () => {
    const permix = createPermix<{
      post: ['read']
    }>()

    permix.setup({
      post: {
        read: false,
      },
    })

    const text = 'Post can be read'

    const { Check } = createComponents(permix)

    const TestComponent = {
      template: `
        <Check path="post.read">
          <span data-testid="read">{{ text }}</span>
        </Check>
      `,
      components: { Check },
      setup() {
        return { text }
      },
    }

    const wrapper = mountWithPermix(TestComponent, permix)

    expect(wrapper.html()).not.toContain(text)

    permix.setup({
      post: {
        read: true,
      },
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toContain(text)
  })

  it('should work with reverse prop', async () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({
      post: {
        create: true,
      },
    })

    const defaultText = 'Default slot'
    const otherwiseText = 'Otherwise slot'

    const { Check } = createComponents(permix)

    const TestComponent = {
      template: `
        <Check path="post.create" reverse>
          <div>{{ defaultText }}</div>
          <template #otherwise>
            <div>{{ otherwiseText }}</div>
          </template>
        </Check>
      `,
      components: { Check },
      setup() {
        return { defaultText, otherwiseText }
      },
    }

    const wrapper = mountWithPermix(TestComponent, permix)

    expect(wrapper.html()).not.toContain(defaultText)
    expect(wrapper.html()).toContain(otherwiseText)

    // Update permission to false
    permix.setup({
      post: {
        create: false,
      },
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.html()).toContain(defaultText)
    expect(wrapper.html()).not.toContain(otherwiseText)
  })

  it("shouldn't accept invalid props", () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({
      post: {
        create: true,
      },
    })

    const { Check } = createComponents(permix)

    const TestEntityComponent = {
      template: `
        <Check path="not-exist">
          <div>Entity prop</div>
        </Check>
      `,
      components: { Check },
    }

    const TestActionComponent = {
      template: `
        <Check path="post.not-exist">
          <div>Action prop</div>
        </Check>
      `,
      components: { Check },
    }

    expect(() => mountWithPermix(TestEntityComponent, permix)).toThrow(
      PermixRuleNotDefinedError
    )
    expect(() => mountWithPermix(TestActionComponent, permix)).toThrow(
      PermixRuleNotDefinedError
    )
  })
})
