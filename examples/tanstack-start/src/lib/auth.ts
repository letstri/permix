export type DemoRole = 'guest' | 'alice' | 'bob' | 'admin'

export interface Session {
  userId: string
  role?: 'admin'
  label: string
}

const SESSIONS: Record<DemoRole, Session | null> = {
  guest: null,
  alice: { userId: 'alice', label: 'Alice (author of post 1)' },
  bob: { userId: 'bob', label: 'Bob (author of post 2)' },
  admin: { userId: 'admin', role: 'admin', label: 'Admin' },
}

export function getSessionForRole(role: DemoRole): Session | null {
  return SESSIONS[role] ?? null
}

function parseDemoRole(value: string | undefined): DemoRole {
  if (value === 'guest' || value === 'alice' || value === 'bob' || value === 'admin') {
    return value
  }

  return 'alice'
}

export function getDemoRoleFromRequest(request: Request): DemoRole {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)demo-role=([^;]*)/)
  return parseDemoRole(match?.[1])
}

export function getSessionFromRequest(request: Request): Session | null {
  return getSessionForRole(getDemoRoleFromRequest(request))
}
