import { render, renderHook, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import type { DehydratedState } from '../core'
import { createPermix, PermixRuleNotDefinedError } from '../core'
import { createComponents, PermixHydrate, PermixProvider } from './components'
import { usePermix } from './hooks'
import '@testing-library/jest-dom/vitest'

describe('components', () => {
  it('should check hydration', async () => {
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

    const TestComponent = () => {
      const { check } = usePermix(permixClient)
      return <div>{check('post.create').toString()}</div>
    }

    const { container } = render(
      <PermixProvider permix={permixClient}>
        <PermixHydrate state={dehydrated}>
          <TestComponent />
        </PermixHydrate>
      </PermixProvider>
    )

    expect(container.firstChild).toHaveTextContent('true')
  })

  it('should render each hydrated state with a shared instance on the server', () => {
    const permix = createPermix<{
      admin: ['view']
    }>()

    const Probe = () => {
      const { check } = usePermix(permix)
      return <span>{String(check('admin.view'))}</span>
    }

    const App = ({ state }: { state: DehydratedState<any> }) => (
      <PermixProvider permix={permix}>
        <PermixHydrate state={state}>
          <Probe />
        </PermixHydrate>
      </PermixProvider>
    )

    const admin = { admin: { view: true } }
    const regular = { admin: { view: false } }

    expect(renderToString(<App state={admin} />)).toBe('<span>true</span>')
    expect(renderToString(<App state={regular} />)).toBe('<span>false</span>')
    expect(renderToString(<App state={admin} />)).toBe('<span>true</span>')
  })

  it('should prefer hydrated state over rules the instance had at mount', async () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({ post: { create: false } })

    const TestComponent = () => {
      const { check } = usePermix(permix)
      return <div>{check('post.create').toString()}</div>
    }

    const { container } = render(
      <PermixProvider permix={permix}>
        <PermixHydrate state={{ post: { create: true } }}>
          <TestComponent />
        </PermixHydrate>
      </PermixProvider>
    )

    expect(container.firstChild).toHaveTextContent('true')

    permix.setup({ post: { create: false } })

    await waitFor(() => {
      expect(container.firstChild).toHaveTextContent('false')
    })
  })

  it('should apply a new hydrated state on rerender', () => {
    const permix = createPermix<{
      post: ['create']
    }>()
    const consoleError = vi.spyOn(console, 'error')
    onTestFinished(() => {
      consoleError.mockRestore()
    })

    const TestComponent = () => {
      const { check } = usePermix(permix)
      return <div>{check('post.create').toString()}</div>
    }

    const App = ({ state }: { state: DehydratedState<any> }) => (
      <PermixProvider permix={permix}>
        <PermixHydrate state={state}>
          <TestComponent />
        </PermixHydrate>
      </PermixProvider>
    )

    const { container, rerender } = render(
      <App state={{ post: { create: true } }} />
    )

    expect(container.firstChild).toHaveTextContent('true')

    rerender(<App state={{ post: { create: false } }} />)

    expect(container.firstChild).toHaveTextContent('false')
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('should check new rules before the component re-renders', () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({ post: { create: false } })

    const { result } = renderHook(() => usePermix(permix), {
      wrapper: ({ children }) => (
        <PermixProvider permix={permix}>{children}</PermixProvider>
      ),
    })
    const { check } = result.current

    expect(check('post.create')).toBe(false)

    permix.setup({ post: { create: true } })

    expect(check('post.create')).toBe(true)
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

    const TestPost = () => (
      <Check path="post.create">
        <div>{text}</div>
      </Check>
    )

    const { getByText } = render(
      <PermixProvider permix={permix}>
        <TestPost />
      </PermixProvider>
    )

    expect(getByText(text)).toBeInTheDocument()
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

    const TestPost1 = () => (
      <Check path="post.edit" data={{ authorId: '1' }}>
        <div data-testid="post-can-be-created">{canText}</div>
      </Check>
    )

    const { container: container1 } = render(
      <PermixProvider permix={permix}>
        <TestPost1 />
      </PermixProvider>
    )

    expect(container1.innerHTML).toContain(canText)

    const TestPost2 = () => (
      <Check
        path="post.edit"
        data={{ authorId: '2' }}
        otherwise={<div data-testid="otherwise">{cannotText}</div>}
      >
        <div data-testid="post-can-be-created">{canText}</div>
      </Check>
    )

    const { container: container2 } = render(
      <PermixProvider permix={permix}>
        <TestPost2 />
      </PermixProvider>
    )

    expect(container2.innerHTML).not.toContain(canText)
    expect(container2.innerHTML).toContain(cannotText)
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

    const TestComponent = () => (
      <Check path="post.read">
        <span data-testid="read">{text}</span>
      </Check>
    )

    const { container } = render(
      <PermixProvider permix={permix}>
        <TestComponent />
      </PermixProvider>
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

    const TestComponent = () => (
      <Check path="post.create" reverse otherwise={<div>{otherwiseText}</div>}>
        <div>{defaultText}</div>
      </Check>
    )

    const { container } = render(
      <PermixProvider permix={permix}>
        <TestComponent />
      </PermixProvider>
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
      post: ['create']
    }>()

    permix.setup({
      post: {
        create: true,
      },
    })

    const { Check } = createComponents(permix)

    const TestEntityComponent = () => (
      // @ts-expect-error path does not exist
      <Check path="not-exist">
        <div>Entity prop</div>
      </Check>
    )

    const TestActionComponent = () => (
      // @ts-expect-error path does not exist
      <Check path="post.not-exist">
        <div>Action prop</div>
      </Check>
    )

    expect(() =>
      render(
        <PermixProvider permix={permix}>
          <TestEntityComponent />
        </PermixProvider>
      )
    ).toThrow(PermixRuleNotDefinedError)

    expect(() =>
      render(
        <PermixProvider permix={permix}>
          <TestActionComponent />
        </PermixProvider>
      )
    ).toThrow(PermixRuleNotDefinedError)
  })
})
