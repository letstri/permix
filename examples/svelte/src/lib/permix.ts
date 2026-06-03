import type { Post } from './posts'
import type { User } from './user.svelte'
import { createPermix } from 'permix'
import { createComponents } from 'permix/svelte'

export const permix = createPermix<{
  post: ['read', { name: 'edit', type: Post }]
}>()

export function setupPermix(user: User) {
  return permix.setup({
    post: {
      read: true,
      edit: post => post?.authorId === user.id,
    },
  })
}

export const { Check } = createComponents(permix)
