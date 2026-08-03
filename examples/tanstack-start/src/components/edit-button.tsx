import type { Post } from '@/lib/permix'
import { usePermix } from '@/lib/use-permix'

export function EditButton({ post }: { post: Post }) {
  const { check } = usePermix()

  if (!check('post.update', post)) {
    return null
  }

  return (
    <button
      type="button"
      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
    >
      Edit post
    </button>
  )
}
