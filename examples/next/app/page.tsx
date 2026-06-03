import Link from 'next/link'
import { getDemoRole, getSession } from '@/lib/auth'
import { permix } from '@/lib/permix'
import { getPosts } from '@/lib/posts'
import { CreatePostForm } from './components/create-post-form'
import { PermissionBadge } from './components/permission-badge'
import { RoleSwitcher } from './components/role-switcher'
import { EditButton } from './posts/[id]/edit-button'

export default async function Home() {
  const [session, role, posts] = await Promise.all([
    getSession(),
    getDemoRole(),
    getPosts(),
  ])

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Permix + Next.js App Router
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Per-request permissions demo
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          This example mirrors the
          {' '}
          <a
            href="https://permix.letstri.dev/docs/integrations/next"
            className="font-medium underline underline-offset-4"
          >
            Next.js integration guide
          </a>
          . Rules are set once in the root layout, checked on the server in pages
          and route handlers, then dehydrated for client components.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-medium">Current session</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {session ? session.label : 'Signed out (guest)'}
            </p>
          </div>
          <RoleSwitcher currentRole={role} />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Server checks in this request</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <PermissionBadge
            label="post.create"
            allowed={permix.check('post.create')}
          />
          <PermissionBadge
            label="post.read (any post)"
            allowed={permix.check('post.read', posts[0])}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Posts</h2>
        {posts.map(post => (
          <article
            key={post.id}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h3 className="text-base font-medium">
                  Post
                  {' '}
                  {post.id}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  authorId:
                  {' '}
                  {post.authorId}
                </p>
                <div className="flex flex-wrap gap-2">
                  <PermissionBadge
                    label="server: post.update"
                    allowed={permix.check('post.update', post)}
                  />
                  <PermissionBadge
                    label="server: post.delete"
                    allowed={permix.check('post.delete', post)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/posts/${post.id}`}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Open page
                </Link>
                <EditButton post={post} />
              </div>
            </div>
          </article>
        ))}
      </section>

      <CreatePostForm canCreate={permix.check('post.create')} />
    </main>
  )
}
