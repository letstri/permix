import { usePermix } from 'permix/react'
import { permix } from '../permix'

export function usePermissions() {
  return usePermix(permix)
}
