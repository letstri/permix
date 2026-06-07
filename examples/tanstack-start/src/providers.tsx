import type { DehydratedState } from 'permix'
import type { Session } from '@/lib/auth'
import type { PermissionsDefinition } from '@/lib/permix'
import { createPermix } from 'permix'
import { PermixHydrate, PermixProvider } from 'permix/react'
import { useLayoutEffect } from 'react'

const permix = createPermix<PermissionsDefinition>()

function ClientRulesSetup({
  session,
  children,
}: {
  session: Session | null
  children: React.ReactNode
}) {
  useLayoutEffect(() => {
    permix.setup({
      post: {
        create: !!session,
        read: true,
        update: post => post?.authorId === session?.userId,
        delete: session?.role === 'admin',
      },
    })
  }, [session])

  return children
}

export function Providers({
  state,
  session,
  children,
}: {
  state: DehydratedState<PermissionsDefinition>
  session: Session | null
  children: React.ReactNode
}) {
  return (
    <PermixProvider permix={permix}>
      <PermixHydrate state={state}>
        <ClientRulesSetup session={session}>{children}</ClientRulesSetup>
      </PermixHydrate>
    </PermixProvider>
  )
}

export { permix }
