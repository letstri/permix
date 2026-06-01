import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { getSession } from '@/lib/auth'
import { adminTemplate, guestTemplate, permix } from '@/lib/permix'
import { Providers } from './providers'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Permix Next.js Example',
  description: 'Live example of the permix/next integration',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getSession()

  if (session) {
    permix.setup(session.role === 'admin'
      ? adminTemplate()
      : {
          post: {
            create: true,
            read: true,
            update: post => post?.authorId === session.userId,
            delete: false,
          },
        })
  }
  else {
    permix.setup(guestTemplate())
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <Providers state={permix.dehydrate()} session={session}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
