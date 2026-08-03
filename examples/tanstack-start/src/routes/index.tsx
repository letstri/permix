import { createFileRoute, Link } from '@tanstack/react-router'
import { CreatePostForm } from '@/components/create-post-form'
import { EditButton } from '@/components/edit-button'
import { PermissionBadge } from '@/components/permission-badge'
import { RoleSwitcher } from '@/components/role-switcher'
import { usePermix } from '@/lib/use-permix'
import { getHomePageData } from '@/server/posts'

export const Route = createFileRoute('/')({
  loader: () => getHomePageData(),
  component: Home,
})

function Home() {
  const { session, role } = Route.useRouteContext()
  const { posts, canCreate, canReadFirst, postChecks } = Route.useLoaderData()
  const { check } = usePermix()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Permix + TanStack Start
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Per-request permissions demo
        </h1>
        <p className="max-w-2xl text-zinc-600">
          This example mirrors the
          {' '}
          <a
            href="https://permix.letstri.dev/docs/integrations/tanstack-start"
            className="font-medium underline underline-offset-4"
          >
            TanStack Start integration guide
          </a>
          . Rules are set once per request in
          {' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">start.ts</code>
          , checked on the server in loaders and server functions, then dehydrated for client components.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-medium">Current session</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {session ? session.label : 'Signed out (guest)'}
            </p>
          </div>
          <RoleSwitcher currentRole={role} />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium">Server checks in this request</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <PermissionBadge
            label="post.create"
            allowed={canCreate}
          />
          <PermissionBadge
            label="post.read (any post)"
            allowed={canReadFirst}
          />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium">Route guard in beforeLoad</h2>
        <p className="mt-2 text-sm text-zinc-600">
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">/admin</code>
          {' '}
          calls
          {' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">
            context.permix.check(&apos;post.delete&apos;)
          </code>
          {' '}
          in
          {' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">beforeLoad</code>
          {' '}
          — no server function involved. Only the admin role gets in.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PermissionBadge label="post.delete" allowed={check('post.delete')} />
          <Link
            to="/admin"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100"
          >
            Open /admin
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Posts</h2>
        {posts.map((post) => {
          const checks = postChecks.find(item => item.id === post.id)

          return (
            <article
              key={post.id}
              className="rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h3 className="text-base font-medium">
                    Post
                    {' '}
                    {post.id}
                  </h3>
                  <p className="text-sm text-zinc-600">
                    authorId:
                    {' '}
                    {post.authorId}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <PermissionBadge
                      label="server: post.update"
                      allowed={checks?.canUpdate ?? false}
                    />
                    <PermissionBadge
                      label="server: post.delete"
                      allowed={checks?.canDelete ?? false}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/posts/$id"
                    params={{ id: post.id }}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100"
                  >
                    Open page
                  </Link>
                  <EditButton post={post} />
                </div>
              </div>
            </article>
          )
        })}
      </section>

      <CreatePostForm canCreate={canCreate} />
    </main>
  )
}
