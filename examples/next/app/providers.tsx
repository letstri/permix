'use client'

import type { DehydratedState, Permix } from 'permix'
import { createPermix } from 'permix'
import {
  PermixHydrate,
  PermixProvider,
  usePermix as useReactPermix,
} from 'permix/react'
import { createContext, use, useLayoutEffect, useState } from 'react'

import type { Session } from '@/lib/auth'
import type { PermissionsDefinition } from '@/lib/permix'

const ClientPermixContext = createContext<Permix<PermissionsDefinition> | null>(
  null
)

export function usePermix() {
  const permix = use(ClientPermixContext)

  if (!permix) {
    throw new Error('usePermix must be used within <Providers>')
  }

  return useReactPermix(permix)
}

function ClientRulesSetup({
  permix,
  session,
  children,
}: {
  permix: Permix<PermissionsDefinition>
  session: Session | null
  children: React.ReactNode
}) {
  useLayoutEffect(() => {
    permix.setup({
      post: {
        create: !!session,
        read: true,
        update: (post) => post?.authorId === session?.userId,
        delete: session?.role === 'admin',
      },
    })
  }, [permix, session])

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
  // A client component still renders on the server, so a module-level instance
  // would be shared by every request. `useState` gives one instance per request
  // during SSR and one per tab in the browser.
  // eslint-disable-next-line react/hook-use-state
  const [permix] = useState(() => createPermix<PermissionsDefinition>())

  return (
    <ClientPermixContext value={permix}>
      <PermixProvider permix={permix}>
        <PermixHydrate state={state}>
          <ClientRulesSetup permix={permix} session={session}>
            {children}
          </ClientRulesSetup>
        </PermixHydrate>
      </PermixProvider>
    </ClientPermixContext>
  )
}
