export interface User {
  id: string
  teamIds: string[]
}

export interface Doc {
  id: string
  authorId: string
  teamId: string
}

export type ShareLevel = 'read' | 'write' | 'admin'

// --- In-memory data ---

export const alice: User = { id: 'alice', teamIds: ['team-a'] }
export const bob: User = { id: 'bob', teamIds: ['team-a'] }
export const charlie: User = { id: 'charlie', teamIds: ['team-b'] }

export const doc1: Doc = { id: 'doc-1', authorId: 'alice', teamId: 'team-a' }
export const doc2: Doc = { id: 'doc-2', authorId: 'bob', teamId: 'team-a' }
export const doc3: Doc = { id: 'doc-3', authorId: 'charlie', teamId: 'team-b' }

// shares: docId -> userId -> ShareLevel
export const shares = new Map<string, Map<string, ShareLevel>>([
  ['doc-3', new Map([['alice', 'read']])],
  ['doc-2', new Map([['charlie', 'write']])],
])
