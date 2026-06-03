'use client'

import { useState } from 'react'

export function CreatePostForm({ canCreate }: { canCreate: boolean }) {
  const [result, setResult] = useState<string | null>(null)

  async function handleSubmit() {
    setResult(null)

    const response = await fetch('/api/posts', { method: 'POST' })
    const data = await response.json()

    setResult(
      response.ok
        ? data.message
        : `${response.status}: ${data.error ?? 'Request failed'}`,
    )
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium">Route handler check</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        POST /api/posts calls
        {' '}
        <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
          permix.check(&apos;post.create&apos;)
        </code>
        {' '}
        on the server. Server says create is
        {' '}
        <strong>{canCreate ? 'allowed' : 'denied'}</strong>
        {' '}
        for this request.
      </p>
      <button
        type="button"
        onClick={handleSubmit}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        POST /api/posts
      </button>
      {result
        ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{result}</p>
          )
        : null}
    </section>
  )
}
