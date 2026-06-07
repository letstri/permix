import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { permix } from '@/lib/permix'
import { getPost, getPosts } from '@/lib/posts'

export const getHomePageData = createServerFn().handler(async ({ context }) => {
  const instance = permix.getOrThrow(context)
  const posts = await getPosts()

  return {
    posts,
    canCreate: instance.check('post.create'),
    canReadFirst: instance.check('post.read', posts[0]),
    postChecks: posts.map(post => ({
      id: post.id,
      canUpdate: instance.check('post.update', post),
      canDelete: instance.check('post.delete', post),
    })),
  }
})

export const getPostPageData = createServerFn()
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const post = await getPost(data.id)

    if (!post || !permix.getOrThrow(context).check('post.read', post)) {
      throw notFound()
    }

    return { post }
  })

export const createPost = createServerFn({ method: 'POST' })
  .middleware([permix.checkMiddleware('post.create')])
  .handler(async () => {
    return { ok: true as const, message: 'Post created (demo)' }
  })
