'use client'

import type { DehydratedState } from 'permix'
import type { Definition } from '@/lib/permix'
import { useRouter } from 'next/navigation'
import { createPermix } from 'permix'
import { PermixProvider, usePermix } from 'permix/react'
import { useMemo, useState } from 'react'
import { authClient } from '@/lib/auth-client'

const permix = createPermix<Definition>()

function Permissions() {
  const { check } = usePermix(permix)
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function refreshPermissions() {
    setIsRefreshing(true)
    try {
      const { data } = await authClient.permix.getPermissions()
      if (data) {
        permix.setup(data)
      }
    }
    finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div>
      <h2>Your Permissions</h2>
      <ul>
        <li>
          Create post:
          {check('post', 'create') ? 'Yes' : 'No'}
        </li>
        <li>
          Read post:
          {check('post', 'read') ? 'Yes' : 'No'}
        </li>
        <li>
          Update post:
          {check('post', 'update') ? 'Yes' : 'No'}
        </li>
        <li>
          Delete post:
          {check('post', 'delete') ? 'Yes' : 'No'}
        </li>
      </ul>
      <button type="button" onClick={refreshPermissions} disabled={isRefreshing}>
        {isRefreshing ? 'Refreshing...' : 'Refresh Permissions'}
      </button>
      <button
        type="button"
        onClick={() => authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push('/')
            },
          },
        })}
      >
        Sign out
      </button>
    </div>
  )
}

export function Dashboard({ permissions }: { permissions: DehydratedState<Definition> }) {
  useMemo(() => permix.setup(permissions), [permissions])

  return (
    <PermixProvider permix={permix}>
      <Permissions />
    </PermixProvider>
  )
}
