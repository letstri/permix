import type { PermissionsStatement } from '@/shared/permix'
import { createPermix } from 'permix'

export const permix = createPermix<PermissionsStatement>()
