import type { DemoRole } from '@/lib/auth'
import { switchRole } from '@/app/actions'

const roles: { value: DemoRole, label: string }[] = [
  { value: 'guest', label: 'Guest' },
  { value: 'alice', label: 'Alice' },
  { value: 'bob', label: 'Bob' },
  { value: 'admin', label: 'Admin' },
]

export function RoleSwitcher({ currentRole }: { currentRole: DemoRole }) {
  return (
    <form action={switchRole} className="flex items-center gap-2">
      <label htmlFor="role" className="text-sm font-medium">
        Switch role
      </label>
      <select
        id="role"
        name="role"
        defaultValue={currentRole}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      >
        {roles.map(role => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Apply
      </button>
    </form>
  )
}
