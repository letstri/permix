import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { Inter } from 'next/font/google'
import './global.css'

const inter = Inter({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Permix - Type-safe permissions management for JavaScript',
  description: 'A lightweight, framework-agnostic, type-safe permissions management library for client-side and server-side JavaScript applications.',
  keywords: ['permissions', 'authorization', 'acl', 'access-control', 'typescript', 'react', 'vue', 'type-safe', 'rbac', 'security', 'permissions-management', 'frontend', 'javascript'],
  openGraph: {
    title: 'Permix - Type-safe permissions management for JavaScript',
    description: 'A lightweight, framework-agnostic, type-safe permissions management library for client-side and server-side JavaScript applications.',
    url: 'https://permix.letstri.dev',
    siteName: 'Permix',
  },
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          {children}
        </RootProvider>
        <Analytics />
      </body>
    </html>
  )
}
