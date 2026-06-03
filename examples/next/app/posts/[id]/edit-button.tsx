'use client'

import type { Post } from '@/lib/permix'
import { usePermix } from 'permix/react'
import { permix } from '@/app/providers'

export function EditButton({ post }: { post: Post }) {
  const { check } = usePermix(permix)

  if (!check('post.update', post)) {
    return null
  }

  return (
    <button
      type="button"
      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      Edit post
    </button>
  )
}
