import type { DehydratedState } from 'permix'
import type { Session } from '@/lib/auth'
import type { PermissionsDefinition, PermixInstance } from '@/lib/permix'
import { PermixHydrate, PermixProvider } from 'permix/react'
import { useLayoutEffect } from 'react'
import { createClientRules } from '@/lib/permix'

function ClientRulesSetup({
  permix,
  session,
  children,
}: {
  permix: PermixInstance
  session: Session | null
  children: React.ReactNode
}) {
  // `hydrate()` only restores booleans — `setup()` brings back the
  // function-based `post.update` rule and flips `isReady()`.
  useLayoutEffect(() => {
    permix.setup(createClientRules(session))
  }, [permix, session])

  return children
}

export function Providers({
  permix,
  state,
  session,
  children,
}: {
  permix: PermixInstance
  state: DehydratedState<PermissionsDefinition>
  session: Session | null
  children: React.ReactNode
}) {
  return (
    <PermixProvider permix={permix}>
      <PermixHydrate state={state}>
        <ClientRulesSetup permix={permix} session={session}>
          {children}
        </ClientRulesSetup>
      </PermixHydrate>
    </PermixProvider>
  )
}
