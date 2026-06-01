import type { PermissionsDefinition } from '@/shared/permix'
import { createPermix } from 'permix'

export const permix = createPermix<PermissionsDefinition>()
