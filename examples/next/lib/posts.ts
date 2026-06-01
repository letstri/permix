import type { Post } from '@/lib/permix'

const posts: Post[] = [
  { id: '1', authorId: 'alice' },
  { id: '2', authorId: 'bob' },
]

export async function getPosts(): Promise<Post[]> {
  return posts
}

export async function getPost(id: string): Promise<Post | null> {
  return posts.find(post => post.id === id) ?? null
}
