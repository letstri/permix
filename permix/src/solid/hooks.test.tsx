import { render, renderHook, waitFor } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'

import { createPermix } from '../core'
import { PermixProvider, usePermix } from './index'
import '@testing-library/jest-dom/vitest'

describe('permix solid', () => {
  it('should work with custom hook', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>()

    permix.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const usePermissions = () => usePermix(permix)

    const { result } = renderHook(() => usePermissions(), {
      wrapper: (props) => (
        <PermixProvider permix={permix}>{props.children}</PermixProvider>
      ),
    })

    expect(result.check('post.create')).toBe(true)
    expect(result.check('post.read')).toBe(false)
  })

  it('reads ready state on the first render when setup ran before subscribe', () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({
      post: {
        create: true,
      },
    })

    const TestComponent = () => {
      const { isReady, check } = usePermix(permix)
      return (
        <div>
          {isReady().toString()}:{check('post.create').toString()}
        </div>
      )
    }

    const { container } = render(() => <TestComponent />, {
      wrapper: (props) => (
        <PermixProvider permix={permix}>{props.children}</PermixProvider>
      ),
    })

    expect(container.firstChild).toHaveTextContent('true:true')
  })

  it('should work with DOM rerender', async () => {
    const permix = createPermix<{
      post: [{ name: 'create'; type: { id: string } }, 'read']
    }>()

    permix.setup({
      post: {
        create: (post) => post?.id === '1',
        read: false,
      },
    })

    const TestComponent = () => {
      const { check } = usePermix(permix)

      const post = { id: '1' }

      return (
        <div>
          <span data-testid="create">
            {check('post.create', post).toString()}
          </span>
          <span data-testid="read">{check('post.read').toString()}</span>
        </div>
      )
    }

    const { getByTestId } = render(() => <TestComponent />, {
      wrapper: (props) => (
        <PermixProvider permix={permix}>{props.children}</PermixProvider>
      ),
    })

    expect(getByTestId('create')).toHaveTextContent('true')
    expect(getByTestId('read')).toHaveTextContent('false')

    permix.setup({
      post: {
        create: (post) => post?.id === '2',
        read: true,
      },
    })

    await waitFor(() => {
      expect(getByTestId('create')).toHaveTextContent('false')
      expect(getByTestId('read')).toHaveTextContent('true')
    })
  })

  it('should check isReady', async () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>()

    const TestComponent = () => {
      const { isReady } = usePermix(permix)
      return <div>{isReady().toString()}</div>
    }

    const { container } = render(() => <TestComponent />, {
      wrapper: (props) => (
        <PermixProvider permix={permix}>{props.children}</PermixProvider>
      ),
    })

    expect(container.firstChild).toHaveTextContent('false')

    permix.setup({
      post: {
        create: true,
        read: false,
      },
    })

    await waitFor(() => {
      expect(container.firstChild).toHaveTextContent('true')
    })
  })

  it('should throw error when PermixProvider is missing', () => {
    const permix = createPermix<{
      post: [{ name: 'create'; type: { id: string } }, 'read']
    }>()

    const TestComponent = () => {
      const { check } = usePermix(permix)
      return <div>{check('post.create').toString()}</div>
    }

    expect(() => render(() => <TestComponent />)).toThrow()
  })
})
