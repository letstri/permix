import type { ValidateDefinition } from '../core'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createPermix as createCorePermix } from '../core'
import { PermixHydrate, PermixProvider, usePermix } from '../react'
import { createPermix as createStartPermix } from './permix'
import '@testing-library/jest-dom/vitest'

type PermissionsDefinition = ValidateDefinition<{
  post: ['create', 'read']
}>

describe('tanstack-start → react hydration round-trip', () => {
  it('hydrates dehydrated server state on the client', async () => {
    // Server: run the setup middleware to populate a request-scoped instance,
    // then dehydrate it the way a route loader would before sending to the client.
    const permixServer = createStartPermix<PermissionsDefinition>()

    let context: Record<string, unknown> = {}
    const middleware = permixServer.setupMiddleware({
      post: {
        create: true,
        read: false,
      },
    })

    await middleware.options.server!({
      request: new Request('http://localhost'),
      next: async (arg?: { context?: Record<string, unknown> }) => {
        context = { ...arg?.context }
        return { context }
      },
    } as any)

    const state = permixServer.dehydrate(context)

    // Client: separate singleton + hydrate via the react integration.
    const permixClient = createCorePermix<PermissionsDefinition>()

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
