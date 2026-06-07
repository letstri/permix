import { useState } from 'react'
import { createPost } from '@/server/posts'

export function CreatePostForm({ canCreate }: { canCreate: boolean }) {
  const [result, setResult] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit() {
    setResult(null)
    setPending(true)

    try {
      const data = await createPost()
      setResult(data.message)
    }
    catch (error) {
      setResult(error instanceof Error ? error.message : 'Request failed')
    }
    finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-medium">Server function check</h2>
      <p className="mt-2 text-sm text-zinc-600">
        createPost uses
        {' '}
        <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">
          permix.checkMiddleware(&apos;post.create&apos;)
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
        disabled={pending}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Call createPost()
      </button>
      {result
        ? (
            <p className="mt-3 text-sm text-zinc-600">{result}</p>
          )
        : null}
    </section>
  )
}
