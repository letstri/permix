import type { Post } from '../hooks/posts'
import type { User } from '../hooks/user'
import { createPermix } from 'permix'
import { createComponents } from 'permix/react'

export const permix = createPermix<{
  post: [
    'read',
    { name: 'edit', type: Post },
  ]
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
