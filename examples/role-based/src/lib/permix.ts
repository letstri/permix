import { createPermix } from 'permix'
import { createComponents } from 'permix/react'
import { getUser } from './user'

// Define permix instance
export const permix = createPermix<{
  post: ['create', 'read', 'update', 'delete']
  user: ['create', 'read', 'update', 'delete']
}>()

// Not necessary, but you can use components to check permissions
export const { Check } = createComponents(permix)

// Define the permissions for each role
export const adminPermissions = permix.template({
  post: {
    create: true,
    read: true,
    update: true,
    delete: true,
  },
  user: {
    create: true,
    read: true,
    update: true,
    delete: true,
  },
})

export const userPermissions = permix.template({
  post: {
    read: true,
    update: true,
    delete: false,
    create: false,
  },
  user: {
    read: true,
    update: true,
    delete: false,
    create: false,
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
