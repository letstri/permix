import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { AnalyticsProvider } from '@/components/analytics'
import { appName, siteUrl } from '@/lib/shared'
import appCss from '@/styles/app.css?url'

export const Route = createRootRoute({
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
        title: `${appName} - Type-safe permissions management for JavaScript`,
      },
      {
        name: 'description',
        content: 'A lightweight, framework-agnostic, type-safe permissions management library for client-side and server-side JavaScript applications.',
      },
      {
        name: 'keywords',
        content: 'permissions, authorization, acl, access-control, typescript, react, vue, type-safe, rbac, security, permissions-management, frontend, javascript',
      },
      {
        property: 'og:title',
        content: `${appName} - Type-safe permissions management for TypeScript`,
      },
      {
        property: 'og:description',
        content: 'A lightweight, framework-agnostic, type-safe permissions management library for client-side and server-side TypeScript applications.',
      },
      {
        property: 'og:url',
        content: siteUrl,
      },
      {
        property: 'og:site_name',
        content: appName,
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          {children}
        </RootProvider>
        <AnalyticsProvider />
        <Scripts />
      </body>
    </html>
  )
}
