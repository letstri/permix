import Link from 'next/link'
import { notFound } from 'next/navigation'
import { permix } from '@/lib/permix'
import { getPost } from '@/lib/posts'
import { EditButton } from './edit-button'

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getPost(id)

  if (!post || !permix.check('post.read', post)) {
    notFound()
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Back to posts
      </Link>

      <article className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight">
          Post
          {' '}
          {post.id}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          authorId:
          {' '}
          {post.authorId}
        </p>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          This page calls
          {' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
            permix.check(&apos;post.read&apos;, post)
          </code>
          {' '}
          on the server before rendering.
        </p>
        <div className="mt-6">
          <EditButton post={post} />
        </div>
      </article>
    </main>
  )
}
