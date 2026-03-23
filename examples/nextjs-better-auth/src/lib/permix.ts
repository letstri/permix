import type { PermixDefinition } from 'permix'

interface Post {
  id: string
  authorId: string
  title: string
  content: string
}

export type Definition = PermixDefinition<{
  post: {
    dataType: Post
    action: 'create' | 'read' | 'update' | 'delete'
  }
}>
