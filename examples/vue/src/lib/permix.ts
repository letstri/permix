import type { Post } from '../composables/posts'
import type { User } from '../composables/user'
import { createPermix } from 'permix'
import { createComponents } from 'permix/vue'

export const permix = createPermix<{
  post: {
    dataType: Post
    action: 'read' | 'edit'
  }
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
