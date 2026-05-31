// `relations` lives under `drizzle-orm/_relations` in drizzle v1, but it still
// produces the same "non-Table object" used here purely to verify filtering.
import { relations } from 'drizzle-orm/_relations'
import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { PermixRuleNotDefinedError } from '../../core/errors'
import { createPermix } from './permix'

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
})

const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
})

const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

const schema = { users, posts, usersRelations }

describe('drizzle createPermix', () => {
  it('discovers only tables from the schema and ignores non-table exports', () => {
    const permix = createPermix(schema)

    expect(permix.tables).toEqual(['users', 'posts'])
    expect(permix.actions).toEqual(['create', 'read', 'update', 'delete'])
  })

  it('produces a Permix instance that accepts rules for every detected table', () => {
    const permix = createPermix(schema)

    permix.setup({
      users: { create: true, read: true, update: false, delete: false },
      posts: { create: true, read: true, update: true, delete: false },
    })

    expect(permix.check('users.read')).toBe(true)
    expect(permix.check('users.delete')).toBe(false)
    expect(permix.check('posts.update')).toBe(true)
    expect(permix.check('posts.delete')).toBe(false)
  })

  it('infers leaf paths only for tables — relations are not part of the type', () => {
    const permix = createPermix(schema)

    permix.setup({
      users: { create: true, read: true, update: false, delete: false },
      posts: { create: true, read: true, update: true, delete: false },
    })

    // @ts-expect-error usersRelations is not a table, so it has no permissions
    expect(() => permix.check('usersRelations.read')).toThrow(PermixRuleNotDefinedError)
  })

  it('exposes correct types for tables and actions', () => {
    const permix = createPermix(schema)

    expectTypeOf(permix.tables).toEqualTypeOf<('users' | 'posts')[]>()
    expectTypeOf(permix.actions).toEqualTypeOf<readonly ('create' | 'read' | 'update' | 'delete')[]>()
  })
})
