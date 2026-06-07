import { createFileRoute, Link } from '@tanstack/react-router'
import { EditButton } from '@/components/edit-button'
import { getPostPageData } from '@/server/posts'

export const Route = createFileRoute('/posts/$id')({
  loader: ({ params }) => getPostPageData({ data: { id: params.id } }),
  component: PostPage,
})

function PostPage() {
  const { post } = Route.useLoaderData()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <Link
        to="/"
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← Back to posts
      </Link>

      <article className="rounded-xl border border-zinc-200 bg-white p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Post
          {' '}
          {post.id}
        </h1>
        <p className="mt-2 text-zinc-600">
          authorId:
          {' '}
          {post.authorId}
        </p>
        <p className="mt-4 text-sm text-zinc-600">
          This page calls
          {' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">
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
