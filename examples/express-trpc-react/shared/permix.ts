import type { Rules, ValidateStatement } from 'permix'

export type PermissionsStatement = ValidateStatement<{
  user: ['read', 'create']
}>

const adminPermissions: Rules<PermissionsStatement> = {
  user: {
    read: true,
    create: true,
  },
}

const userPermissions: Rules<PermissionsStatement> = {
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
