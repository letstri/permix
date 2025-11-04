import type { RouterOutput } from '@/shared/trpc'
import { useEffect, useState } from 'react'
import { getRules } from '@/shared/permix'
import { Check } from './components/permix'
import { usePermissions } from './hooks/use-permissions'
import { permix } from './permix'
import { trpc } from './trpc'

export default function App() {
  const { check, isReady } = usePermissions()
  const [users, setUsers] = useState<RouterOutput['userList']>([])

  const canReadUser = check('user', 'read')

  useEffect(() => {
    // Imagine this is a request from the server that gets the user from the request
    const user = {
      role: 'user' as const,
    }

    permix.setup(getRules(user.role))
  }, [])

  useEffect(() => {
    if (canReadUser) {
      trpc.userList.query().then((users) => {
        setUsers(users)
      })
    }
  }, [canReadUser])

  return (
    <>
      Is Permix ready?
      {' '}
      {isReady ? 'Yes' : 'No'}
      <hr />
      Can I read a user?
      {' '}
      {check('user', 'read') ? 'Yes' : 'No'}
      <hr />
      <Check entity="user" action="read" otherwise={<div>You don't have permission to read a user</div>}>
        Can I read a user inside the Check component?
      </Check>
      <hr />
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
      <hr />
      <Check entity="user" action="create" otherwise={<div>You don't have permission to create a user</div>}>
        <button type="button" onClick={() => trpc.userWrite.mutate({ name: 'John Doe', email: 'john.doe@example.com' })}>
          Create user
        </button>
      </Check>
    </>
  )
}
