import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createPermix as createCorePermix } from '../core'
import { PermixHydrate, PermixProvider, usePermix } from '../react'
import { createPermix as createNextPermix } from './permix'
import '@testing-library/jest-dom/vitest'

// See ./permix.test.ts — outside a Next.js request scope `cache()` does not
// memoize, so we mock it for the test environment.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    cache: <T extends (...args: any[]) => any>(fn: T): T => {
      const store = new Map<string, ReturnType<T>>()
      return ((...args: Parameters<T>) => {
        const key = JSON.stringify(args)
        if (!store.has(key))
          store.set(key, fn(...args))
        return store.get(key)!
      }) as T
    },
  }
})

describe('next → react hydration round-trip', () => {
  it('hydrates dehydrated server state on the client', async () => {
    // Server: setup + dehydrate using the Next.js per-request helper.
    const permixServer = createNextPermix<{
      post: ['create', 'read']
    }>()

    permixServer.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const state = permixServer.dehydrate()

    // Client: separate singleton + hydrate via the react integration.
    const permixClient = createCorePermix<{
      post: ['create', 'read']
    }>()

    function PostStatus() {
      const { check } = usePermix(permixClient)
      return (
        <div>
          <span data-testid="create">{String(check('post.create'))}</span>
          <span data-testid="read">{String(check('post.read'))}</span>
        </div>
      )
    }

    const { getByTestId } = render(
      <PermixProvider permix={permixClient}>
        <PermixHydrate state={state}>
          <PostStatus />
        </PermixHydrate>
      </PermixProvider>,
    )

    expect(getByTestId('create')).toHaveTextContent('true')
    expect(getByTestId('read')).toHaveTextContent('false')
  })
})
