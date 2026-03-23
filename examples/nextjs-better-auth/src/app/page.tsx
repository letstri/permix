import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: 400, margin: '0 auto' }}>
      <h1>Next.js + Better Auth + Permix</h1>
      <p>A demo showing permissions management with Permix and Better Auth.</p>
      <nav style={{ display: 'flex', gap: '1rem' }}>
        <Link href="/sign-in">Sign In</Link>
        <Link href="/sign-up">Sign Up</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>
    </main>
  )
}
