import { createFileRoute, Link, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context }) => {
    if (!context.permix.check('post.delete')) {
      throw redirect({ to: '/' })
    }
  },
  component: AdminPage,
})

function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <Link
        to="/"
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← Back to posts
      </Link>

      <article className="rounded-xl border border-zinc-200 bg-white p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin area</h1>
        <p className="mt-4 text-sm text-zinc-600">
          This route is guarded by
          {' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">
            context.permix.check(&apos;post.delete&apos;)
          </code>
          {' '}
          inside
          {' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">beforeLoad</code>
          . Any role other than admin is redirected back to the home page.
        </p>
      </article>
    </main>
  )
}
