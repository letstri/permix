import { cookies } from 'next/headers'

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

export async function getDemoRole(): Promise<DemoRole> {
  const cookieStore = await cookies()
  return (cookieStore.get('demo-role')?.value ?? 'alice') as DemoRole
}

export async function getSession(): Promise<Session | null> {
  return SESSIONS[await getDemoRole()] ?? null
}
