import { permix } from '@/lib/permix'

export async function POST() {
  if (!permix.check('post.create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  return Response.json({ ok: true, message: 'Post created (demo)' })
}
