import { render, renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it } from 'vitest'
import { createPermix } from '../core'
import { PermixProvider, usePermix } from './index'
import '@testing-library/jest-dom/vitest'

describe('permix react', () => {
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
      wrapper: ({ children }) => (
        <PermixProvider permix={permix}>{children}</PermixProvider>
      ),
    })

    expect(result.current.check('post.create')).toBe(true)
    expect(result.current.check('post.read')).toBe(false)
  })

  it('should work with DOM rerender', async () => {
    const permix = createPermix<{
      post: [{ name: 'create', type: { id: string } }, 'read']
    }>()

    permix.setup({
      post: {
        create: post => post?.id === '1',
        read: false,
      },
    })

    const TestComponent = () => {
      const { check } = usePermix(permix)

      const post = { id: '1' }

      return (
        <div>
          <span data-testid="create">{check('post.create', post).toString()}</span>
          <span data-testid="read">{check('post.read').toString()}</span>
        </div>
      )
    }

    const { getByTestId } = render(
      <PermixProvider permix={permix}>
        <TestComponent />
      </PermixProvider>,
    )

    expect(getByTestId('create')).toHaveTextContent('true')
    expect(getByTestId('read')).toHaveTextContent('false')

    permix.setup({
      post: {
        create: post => post?.id === '2',
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
      return <div>{isReady.toString()}</div>
    }

    const { container } = render(
      <PermixProvider permix={permix}>
        <TestComponent />
      </PermixProvider>,
    )

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
      post: [{ name: 'create', type: { id: string } }, 'read']
    }>()

    const TestComponent = () => {
      const { check } = usePermix(permix)
      return <div>{check('post.create').toString()}</div>
    }

    expect(() => render(<TestComponent />)).toThrow()
  })
})
