import { render, waitFor } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import { createPermix } from '../core'
import CreateApp from './__fixtures__/CreateApp.svelte'
import EditApp from './__fixtures__/EditApp.svelte'
import HydrateApp from './__fixtures__/HydrateApp.svelte'
import ReadApp from './__fixtures__/ReadApp.svelte'
import ReverseApp from './__fixtures__/ReverseApp.svelte'
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

    const { getByTestId } = render(HydrateApp, { props: { permix: permixClient, state: dehydrated } })

    expect(getByTestId('create')).toHaveTextContent('true')
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

    const { getByText } = render(CreateApp, { props: { permix } })

    expect(getByText('Post can be created')).toBeInTheDocument()
  })

  it('should work with Check component and data', () => {
    const permix = createPermix<{
      post: [{ name: 'edit', type: { authorId: string } }]
    }>()

    permix.setup({
      post: {
        edit: post => post?.authorId === '1',
      },
    })

    const { container: container1 } = render(EditApp, { props: { permix, authorId: '1' } })

    expect(container1.innerHTML).toContain('Post can be created')

    const { container: container2 } = render(EditApp, { props: { permix, authorId: '2' } })

    expect(container2.innerHTML).not.toContain('Post can be created')
    expect(container2.innerHTML).toContain('Post cannot be created')
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

    const { container } = render(ReadApp, { props: { permix } })

    expect(container.innerHTML).not.toContain('Post can be read')

    permix.setup({
      post: {
        read: true,
      },
    })

    await waitFor(() => {
      expect(container.innerHTML).toContain('Post can be read')
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

    const { container } = render(ReverseApp, { props: { permix } })

    expect(container.innerHTML).not.toContain('Default slot')
    expect(container.innerHTML).toContain('Otherwise slot')

    permix.setup({
      post: {
        create: false,
      },
    })

    await waitFor(() => {
      expect(container.innerHTML).toContain('Default slot')
      expect(container.innerHTML).not.toContain('Otherwise slot')
    })
  })
})
