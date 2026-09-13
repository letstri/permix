import { render, waitFor } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import { createPermix } from '../core'
import HookApp from './__fixtures__/HookApp.svelte'
import HookConsumer from './__fixtures__/HookConsumer.svelte'
import '@testing-library/jest-dom/vitest'

describe('permix svelte', () => {
  it('should work with custom hook', () => {
    const permix = createPermix<{
      post: [{ name: 'create'; type: { id: string } }, 'read']
    }>()

    permix.setup({
      post: {
        create: (post) => post?.id === '1',
        read: false,
      },
    })

    const { getByTestId } = render(HookApp, { props: { permix } })

    expect(getByTestId('create')).toHaveTextContent('true')
    expect(getByTestId('read')).toHaveTextContent('false')
  })

  it('reads ready state on the first render when setup ran before subscribe', () => {
    const permix = createPermix<{
      post: [{ name: 'create'; type: { id: string } }, 'read']
    }>()

    permix.setup({
      post: {
        create: () => true,
        read: true,
      },
    })

    const { getByTestId } = render(HookApp, { props: { permix } })

    expect(getByTestId('ready')).toHaveTextContent('true')
    expect(getByTestId('read')).toHaveTextContent('true')
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

    const { getByTestId } = render(HookApp, { props: { permix } })

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
      post: [{ name: 'create'; type: { id: string } }, 'read']
    }>()

    const { getByTestId } = render(HookApp, { props: { permix } })

    expect(getByTestId('ready')).toHaveTextContent('false')

    permix.setup({
      post: {
        create: false,
        read: false,
      },
    })

    await waitFor(() => {
      expect(getByTestId('ready')).toHaveTextContent('true')
    })
  })

  it('should throw error when PermixProvider is missing', () => {
    const permix = createPermix<{
      post: [{ name: 'create'; type: { id: string } }, 'read']
    }>()

    expect(() => render(HookConsumer, { props: { permix } })).toThrow()
  })
})
