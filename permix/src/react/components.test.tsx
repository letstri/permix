import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createPermix } from '../core'
import { createComponents, PermixHydrate, PermixProvider } from './components'
import { usePermix } from './hooks'
import '@testing-library/jest-dom/vitest'

describe('components', () => {
  it('should check hydration', async () => {
    const permixServer = createPermix<{
      post: {
        dataType: { id: string }
        action: 'create' | 'read'
      }
    }>()

    permixServer.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const dehydrated = permixServer.dehydrate()

    const permixClient = createPermix<{
      post: {
        dataType: { id: string }
        action: 'create' | 'read'
      }
    }>()

    const TestComponent = () => {
      const { check } = usePermix(permixClient)
      return <div>{check('post', 'create').toString()}</div>
    }

    const { container } = render(
      <PermixProvider permix={permixClient}>
        <PermixHydrate state={dehydrated}>
          <TestComponent />
        </PermixHydrate>
      </PermixProvider>,
    )

    expect(container.firstChild).toHaveTextContent('true')
  })

  it('should work with Check component', () => {
    const permix = createPermix<{
      post: {
        action: 'create'
      }
    }>()

    permix.setup({
      post: {
        create: true,
      },
    })

    const text = 'Post can be created'

    const { Check } = createComponents(permix)

    const TestPost = () => {
      return (
        <Check entity="post" action="create">
          <div>{text}</div>
        </Check>
      )
    }

    const { getByText } = render(
      <PermixProvider permix={permix}>
        <TestPost />
      </PermixProvider>,
    )

    expect(getByText(text)).toBeInTheDocument()
  })

  it('should work with Check component and entity', () => {
    const permix = createPermix<{
      post: {
        dataType: { authorId: string }
        action: 'edit'
      }
    }>()

    permix.setup({
      post: {
        edit: post => post?.authorId === '1',
      },
    })

    const canText = 'Post can be created'
    const cannotText = 'Post cannot be created'

    const { Check } = createComponents(permix)

    const TestPost1 = () => {
      return (
        <Check entity="post" action="edit" data={{ authorId: '1' }}>
          <div data-testid="post-can-be-created">{canText}</div>
        </Check>
      )
    }

    const { container: container1 } = render(
      <PermixProvider permix={permix}>
        <TestPost1 />
      </PermixProvider>,
    )

    expect(container1.innerHTML).toContain(canText)

    const TestPost2 = () => {
      return (
        <Check
          entity="post"
          action="edit"
          data={{ authorId: '2' }}
          otherwise={<div data-testid="otherwise">{cannotText}</div>}
        >
          <div data-testid="post-can-be-created">{canText}</div>
        </Check>
      )
    }

    const { container: container2 } = render(
      <PermixProvider permix={permix}>
        <TestPost2 />
      </PermixProvider>,
    )

    expect(container2.innerHTML).not.toContain(canText)
    expect(container2.innerHTML).toContain(cannotText)
  })

  it('should work with Check component and DOM rerender', async () => {
    const permix = createPermix<{
      post: {
        action: 'read'
      }
    }>()

    permix.setup({
      post: {
        read: false,
      },
    })

    const text = 'Post can be read'

    const { Check } = createComponents(permix)

    const TestComponent = () => {
      return (
        <Check entity="post" action="read">
          <span data-testid="read">{text}</span>
        </Check>
      )
    }

    const { container } = render(
      <PermixProvider permix={permix}>
        <TestComponent />
      </PermixProvider>,
    )

    expect(container.innerHTML).not.toContain(text)

    permix.setup({
      post: {
        read: true,
      },
    })

    await waitFor(() => {
      expect(container.innerHTML).toContain(text)
    })
  })

  it('should work with reverse prop', async () => {
    const permix = createPermix<{
      post: {
        action: 'create'
      }
    }>()

    permix.setup({
      post: {
        create: true,
      },
    })

    const defaultText = 'Default slot'
    const otherwiseText = 'Otherwise slot'

    const { Check } = createComponents(permix)

    const TestComponent = () => {
      return (
        <Check
          entity="post"
          action="create"
          reverse
          otherwise={<div>{otherwiseText}</div>}
        >
          <div>{defaultText}</div>
        </Check>
      )
    }

    const { container } = render(
      <PermixProvider permix={permix}>
        <TestComponent />
      </PermixProvider>,
    )

    expect(container.innerHTML).not.toContain(defaultText)
    expect(container.innerHTML).toContain(otherwiseText)

    permix.setup({
      post: {
        create: false,
      },
    })

    await waitFor(() => {
      expect(container.innerHTML).toContain(defaultText)
      expect(container.innerHTML).not.toContain(otherwiseText)
    })
  })

  it('should validate ts props', () => {
    const permix = createPermix<{
      post: {
        action: 'create'
      }
    }>()

    permix.setup({
      post: {
        create: true,
      },
    })

    const { Check } = createComponents(permix)

    const TestEntityComponent = () => {
      return (
        // @ts-expect-error entity does not exist
        <Check entity="not-exist" action="create">
          <div>Entity prop</div>
        </Check>
      )
    }

    const TestActionComponent = () => {
      return (
        // @ts-expect-error check action does not exist
        <Check entity="post" action="not-exist">
          <div>Action prop</div>
        </Check>
      )
    }

    const { container } = render(
      <PermixProvider permix={permix}>
        <TestEntityComponent />
        <TestActionComponent />
      </PermixProvider>,
    )

    expect(container.innerHTML).not.toContain('Action prop')
    expect(container.innerHTML).not.toContain('Entity prop')
  })
})
