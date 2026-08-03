import type { RouterContext } from '@/lib/permix'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { Providers } from '@/providers'
import { getRootLoaderData } from '@/server/permix'

import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Permix TanStack Start Example',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const data = await getRootLoaderData()

    context.permix.hydrate(data.state)

    return data
  },
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  const { permix, state, session } = Route.useRouteContext()

  return (
    <Providers permix={permix} state={state} session={session}>
      <Outlet />
    </Providers>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full bg-zinc-50 text-zinc-900 antialiased">
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
