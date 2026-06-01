import type { Rules, ValidateDefinition } from 'permix'

export type PermissionsDefinition = ValidateDefinition<{
  user: ['read', 'create']
}>

const adminPermissions: Rules<PermissionsDefinition> = {
  user: {
    read: true,
    create: true,
  },
}

const userPermissions: Rules<PermissionsDefinition> = {
  user: {
    read: true,
    create: false,
  },
}

export function getRules(role: 'admin' | 'user') {
  const rolesMap = {
    admin: adminPermissions,
    user: userPermissions,
  }

  return rolesMap[role]
}
