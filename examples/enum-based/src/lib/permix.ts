import { createPermix } from 'permix'
import { createComponents } from 'permix/react'
import { PostPermission, UserPermission } from './permissions'
import { getUser } from './user'

// Define permix instance
export const permix = createPermix<{
  post: [
    PostPermission.Create,
    PostPermission.Read,
    PostPermission.Update,
    PostPermission.Delete,
  ]
  user: [
    UserPermission.Create,
    UserPermission.Read,
    UserPermission.Update,
    UserPermission.Delete,
  ]
}>()

// Not necessary, but you can use components to check permissions
export const { Check } = createComponents(permix)

// Define the permissions for each role
export const adminPermissions = permix.template({
  post: {
    [PostPermission.Create]: true,
    [PostPermission.Read]: true,
    [PostPermission.Update]: true,
    [PostPermission.Delete]: true,
  },
  user: {
    [UserPermission.Create]: true,
    [UserPermission.Read]: true,
    [UserPermission.Update]: true,
    [UserPermission.Delete]: true,
  },
})

// You can also use string literals - TypeScript will infer the enum type
export const userPermissions = permix.template({
  post: {
    create: false,
    read: true,
    update: true,
    delete: false,
  },
  user: {
    create: false,
    read: true,
    update: true,
    delete: false,
  },
})

export async function setupPermissions() {
  const user = await getUser()

  const rolesMap = {
    admin: () => adminPermissions(),
    user: () => userPermissions(),
  }

  permix.setup(rolesMap[user.role]())
}
