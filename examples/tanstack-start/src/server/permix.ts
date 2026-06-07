import type { DemoRole, Session } from '@/lib/auth'
import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { getSessionForRole } from '@/lib/auth'
import { permix } from '@/lib/permix'

export interface RootLoaderData {
  state: ReturnType<typeof permix.dehydrate>
  session: Session | null
  role: DemoRole
}

export const getRootLoaderData = createServerFn().handler(async ({ context }) => {
  const role = (getCookie('demo-role') ?? 'alice') as DemoRole

  return {
    state: permix.dehydrate(context),
    session: getSessionForRole(role),
    role,
  } satisfies RootLoaderData
})
