import { onMount } from 'svelte'

export interface User {
  id: string
  name: string
}

let user = $state<User | null>(null)

export function useUser() {
  onMount(() => {
    new Promise<void>(resolve => setTimeout(resolve, 1000)).then(() => {
      user = {
        id: Math.random() < 0.5 ? '1' : '2',
        name: 'John Doe',
      }
    })
  })

  return {
    get current() {
      return user
    },
  }
}
