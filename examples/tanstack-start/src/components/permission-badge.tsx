export function PermissionBadge({
  label,
  allowed,
}: {
  label: string
  allowed: boolean
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        allowed
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-rose-100 text-rose-800'
      }`}
    >
      {label}
      :
      {allowed ? 'allowed' : 'denied'}
    </span>
  )
}
