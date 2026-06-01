import { usePermix } from 'permix/svelte'
import { permix } from './permix'

export function usePermissions() {
  return usePermix(permix)
}
