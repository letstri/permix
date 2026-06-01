import type { MergePermix } from './merge'
import type { Permix, RulesPaths } from './permix'
import { describe, expectTypeOf, it } from 'vitest'

describe('mergePermix', () => {
  it('should merge two disjoint raw definitions', () => {
    interface A { post: ['create', 'read'] }
    interface B { comment: ['write', 'delete'] }

    type Merged = MergePermix<A, B>

    expectTypeOf<Merged>().toEqualTypeOf<{
      post: ['create', 'read']
      comment: ['write', 'delete']
    }>()
  })

  it('should concatenate actions when leaves overlap', () => {
    interface A { post: ['create'] }
    interface B { post: ['read', 'update'] }

    type Merged = MergePermix<A, B>

    type Paths = RulesPaths<Merged>
    expectTypeOf<Paths>().toEqualTypeOf<'post.create' | 'post.read' | 'post.update'>()
  })

  it('should extract definition from Permix instances', () => {
    type P1 = Permix<{ user: ['invite'] }>
    type P2 = Permix<{ post: ['create'] }>

    type Merged = MergePermix<P1, P2>

    type Paths = RulesPaths<Merged>
    expectTypeOf<Paths>().toEqualTypeOf<'user.invite' | 'post.create'>()
  })

  it('should mix Permix instances and raw definitions', () => {
    type P = Permix<{ user: ['invite'] }>
    interface D { post: ['create'] }

    type Merged = MergePermix<P, D>

    type Paths = RulesPaths<Merged>
    expectTypeOf<Paths>().toEqualTypeOf<'user.invite' | 'post.create'>()
  })

  it('should nest for 3+ definitions', () => {
    interface A { post: ['create'] }
    interface B { comment: ['write'] }
    interface C { user: ['invite'] }

    type Merged = MergePermix<MergePermix<A, B>, C>

    type Paths = RulesPaths<Merged>
    expectTypeOf<Paths>().toEqualTypeOf<'post.create' | 'comment.write' | 'user.invite'>()
  })

  it('should let right-hand side win on shape conflicts (leaf vs branch)', () => {
    interface A { post: ['create'] }
    interface B { post: { nested: ['read'] } }

    type Merged = MergePermix<A, B>

    type Paths = RulesPaths<Merged>
    expectTypeOf<Paths>().toEqualTypeOf<'post.nested.read'>()
  })

  it('should merge deeply nested branches', () => {
    interface A {
      workspace: {
        billing: ['view']
      }
    }
    interface B {
      workspace: {
        member: ['invite']
      }
    }

    type Merged = MergePermix<A, B>

    type Paths = RulesPaths<Merged>
    expectTypeOf<Paths>().toEqualTypeOf<'workspace.billing.view' | 'workspace.member.invite'>()
  })
})
