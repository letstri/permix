import { defineRelations } from 'drizzle-orm'
import { integer, pgTable, pgView, serial, text } from 'drizzle-orm/pg-core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { PermixRuleNotDefinedError } from '../core/errors'
import { createPermix } from './permix'

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  invitedBy: integer('invited_by'),
})

const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
})

const activeUsers = pgView('active_users').as(qb => qb.select().from(users))

const relations = defineRelations({ users, posts }, r => ({
  users: { posts: r.many.posts() },
  posts: { author: r.one.users({ from: r.posts.authorId, to: r.users.id }) },
}))

const schema = { users, posts, activeUsers, relations }

describe('drizzle createPermix', () => {
  it('discovers tables and views from the schema and ignores defineRelations', () => {
    const permix = createPermix(schema)

    expect(permix.tables).toEqual(['users', 'posts', 'activeUsers'])
    expect(permix.actions).toEqual(['create', 'read', 'update', 'delete'])
  })

  it('accepts rules for every detected entity (tables + views)', () => {
    const permix = createPermix(schema)

    permix.setup({
      users: { create: true, read: true, update: false, delete: false },
      posts: { create: true, read: true, update: true, delete: false },
      activeUsers: { create: false, read: true, update: false, delete: false },
    })

    expect(permix.check('users.read')).toBe(true)
    expect(permix.check('users.delete')).toBe(false)
    expect(permix.check('posts.update')).toBe(true)
    expect(permix.check('activeUsers.read')).toBe(true)
    expect(permix.check('activeUsers.create')).toBe(false)
  })

  it('infers leaf paths only for schema entries — relations are not part of the type', () => {
    const permix = createPermix(schema)

    permix.setup({
      users: { create: true, read: true, update: false, delete: false },
      posts: { create: true, read: true, update: true, delete: false },
      activeUsers: { create: false, read: true, update: false, delete: false },
    })

    // @ts-expect-error wrong path
    expect(() => permix.check('relations.read')).toThrow(PermixRuleNotDefinedError)
  })

  it('supports a custom action set via the `actions` option', () => {
    const permix = createPermix(schema, { actions: ['view', 'edit'] })

    expect(permix.actions).toEqual(['view', 'edit'])

    permix.setup({
      users: { view: true, edit: false },
      posts: { view: true, edit: true },
      activeUsers: { view: true, edit: false },
    })

    expect(permix.check('users.view')).toBe(true)
    expect(permix.check('posts.edit')).toBe(true)
    // @ts-expect-error 'create' is not in the custom action set
    expect(() => permix.check('users.create')).toThrow(PermixRuleNotDefinedError)
  })

  it('throws when actions is an empty array', () => {
    expect(() => createPermix(schema, { actions: [] })).toThrow(
      '[Permix]: `actions` must be a non-empty array of strings.',
    )
  })

  it('exposes correct types for tables and actions', () => {
    const permix = createPermix(schema)

    expectTypeOf(permix.tables).toEqualTypeOf<('users' | 'posts' | 'activeUsers')[]>()
    expectTypeOf(permix.actions).toEqualTypeOf<readonly ('create' | 'read' | 'update' | 'delete')[]>()
  })
})
