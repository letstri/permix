import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Next.js + Better Auth + Permix',
  description: 'Example of Permix with Better Auth in Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
