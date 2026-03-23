import type { Definition } from '@/lib/permix'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createPermix as createPermixCore } from 'permix'
import { auth, permix } from '@/lib/auth'
import { Dashboard } from './_components/dashboard'

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect('/')
  }

  const rules = await permix.rules(session)
  const core = createPermixCore<Definition>(rules)
  const permissions = core.dehydrate()
  core.setup(permissions)

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Dashboard</h1>
      <p>
        Signed in as
        {session.user.name}
      </p>
      <p>
        Role:
        {session.user.role}
      </p>
      <Dashboard permissions={permissions} />
    </main>
  )
}
