import type { DemoRole } from '@/lib/auth'
import { createServerFn } from '@tanstack/react-start'
import { setCookie } from '@tanstack/react-start/server'

export const switchRole = createServerFn({ method: 'POST' })
  .inputValidator((data: { role: DemoRole }) => data)
  .handler(async ({ data }) => {
    setCookie('demo-role', data.role, { path: '/' })
    return { ok: true as const }
  })
