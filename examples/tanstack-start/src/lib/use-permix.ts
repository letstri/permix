import { useRouteContext } from '@tanstack/react-router'
import { usePermix as useReactPermix } from 'permix/react'

export function usePermix() {
  const { permix } = useRouteContext({ from: '__root__' })

  return useReactPermix(permix)
}
