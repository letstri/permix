export interface Post {
  id: string
  authorId: string
}

const posts: Post[] = [
  { id: '1', authorId: '1' },
  { id: '2', authorId: '2' },
]

export function usePosts() {
  return posts
}
