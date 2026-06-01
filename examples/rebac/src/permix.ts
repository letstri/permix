import type { Doc, ShareLevel, User } from './data.js'
import { createPermix } from 'permix'
import { shares } from './data.js'

export const permix = createPermix<{
  doc: [
    { name: 'read', type: Doc, required: true },
    { name: 'update', type: Doc, required: true },
    { name: 'admin', type: Doc, required: true },
  ]
}>()

function hasShare(docId: string, userId: string, minLevel: ShareLevel): boolean {
  const level = shares.get(docId)?.get(userId)
  if (!level)
    return false

  const rank: Record<ShareLevel, number> = { read: 0, write: 1, admin: 2 }
  return rank[level] >= rank[minLevel]
}

export function setupForUser(me: User) {
  const isOwner = (doc: Doc) => doc.authorId === me.id
  const isTeammate = (doc: Doc) => me.teamIds.includes(doc.teamId)

  permix.setup({
    doc: {
      read: doc => isOwner(doc) || isTeammate(doc) || hasShare(doc.id, me.id, 'read'),
      update: doc => isOwner(doc) || hasShare(doc.id, me.id, 'write'),
      admin: doc => isOwner(doc) || hasShare(doc.id, me.id, 'admin'),
    },
  })
}
