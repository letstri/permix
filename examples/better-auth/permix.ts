import { createPermix } from 'permix/better-auth'
import { ac, roles } from './permissions'

export const permix = createPermix({ ac, roles })
