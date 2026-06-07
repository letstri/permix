import type { DemoRole } from '@/lib/auth'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { switchRole } from '@/server/auth'

const roles: { value: DemoRole, label: string }[] = [
  { value: 'guest', label: 'Guest' },
  { value: 'alice', label: 'Alice' },
  { value: 'bob', label: 'Bob' },
  { value: 'admin', label: 'Admin' },
]

export function RoleSwitcher({ currentRole }: { currentRole: DemoRole }) {
  const router = useRouter()
  const [role, setRole] = useState(currentRole)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)

    try {
      await switchRole({ data: { role } })
      await router.invalidate()
    }
    finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label htmlFor="role" className="text-sm font-medium">
        Switch role
      </label>
      <select
        id="role"
        name="role"
        value={role}
        onChange={event => setRole(event.target.value as DemoRole)}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm"
      >
        {roles.map(item => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Apply
      </button>
    </form>
  )
}
