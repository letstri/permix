import type { Action } from './definitions'
import type { Permix } from './permix'

type AsDefinition<T> = T extends Permix<infer D> ? D : T

type Merge2<A, B>
  = A extends readonly Action[]
    ? B extends readonly Action[]
      ? readonly [...A, ...B]
      : B
    : B extends readonly Action[]
      ? B
      : {
          [K in keyof A | keyof B]:
          K extends keyof A
            ? K extends keyof B
              ? Merge2<A[K], B[K]>
              : A[K]
            : K extends keyof B ? B[K] : never
        }

export type MergePermix<A, B> = Merge2<AsDefinition<A>, AsDefinition<B>>
