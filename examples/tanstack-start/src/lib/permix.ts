import type { Permix, ValidateDefinition } from 'permix'
import { createPermix } from 'permix/tanstack-start'

export interface Post {
  id: string
  authorId: string
}

export type PermissionsDefinition = ValidateDefinition<{
  post: [
    { name: 'create', type: Post },
    { name: 'read', type: Post },
    { name: 'update', type: Post },
    { name: 'delete', type: Post },
  ]
}>

export type PermixInstance = Permix<PermissionsDefinition>

export const permix = createPermix<PermissionsDefinition>()

export const adminTemplate = permix.template({
  post: { create: true, read: true, update: true, delete: true },
})

export const guestTemplate = permix.template({
  post: { create: false, read: true, update: false, delete: false },
})
