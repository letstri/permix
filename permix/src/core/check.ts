import type { Definition } from './definitions'
import { PermixNotReadyError, PermixRuleNotDefinedError } from './errors'
import type {
  CheckerFn,
  DataAtPath,
  RulesPaths,
  SpecialPath,
  SpecialSymbol,
} from './permix'
import type { Rules } from './rules'

export type CheckArgs<D extends Definition> =
  | {
      [P in RulesPaths<D>]: [path: P, ...data: DataAtPath<D, P>]
    }[RulesPaths<D>]
  | [special: SpecialPath<D>]
  | [callback: (c: CheckerFn<D>) => boolean]

type Rule = Rules<any> | boolean | ((data?: unknown) => boolean)

function isSpecialSymbol(value: unknown): value is SpecialSymbol {
  return value === '~any' || value === '~all'
}

function pathFromArgs(args: unknown[]): string {
  return args.filter((a): a is string => typeof a === 'string').join('.')
}

/**
 * Invoke a rule with no check data, treating a thrown error as `false`.
 *
 * `~any`/`~all` aggregation and `dehydrate()` evaluate every rule without an
 * entity. Entity-required validators (e.g. `post => post.authorId === id`)
 * throw on `undefined`, so we treat that as a denied permission instead of
 * letting the whole operation crash.
 */
export function callRuleWithoutData(rule: () => unknown): boolean {
  try {
    return Boolean(rule())
  } catch {
    return false
  }
}

// Own-property lookup only, so paths like `post.constructor` or `toString`
// never resolve through the prototype chain.
function ownChild(parent: object, key: string): Rule | undefined {
  return Object.hasOwn(parent, key)
    ? (parent as Record<string, Rule>)[key]
    : undefined
}

function walk(rules: Rules<any>, inputArgs: unknown[]): boolean {
  let args = inputArgs
  const first = args[0]

  if (typeof first === 'string') {
    const parts = first.split('.')
    const last = parts.at(-1)

    if (isSpecialSymbol(last)) {
      let subtree: Rule | undefined = rules
      for (let i = 0; i < parts.length - 1; i++) {
        subtree =
          subtree && typeof subtree === 'object'
            ? ownChild(subtree, parts[i])
            : undefined
      }

      if (subtree === undefined) {
        const path = parts.slice(0, -1).join('.')
        throw new PermixRuleNotDefinedError(path)
      }

      const out: boolean[] = []
      const visit = (rule: Rule) => {
        if (typeof rule === 'boolean') {
          return void out.push(rule)
        }
        if (typeof rule === 'function') {
          return void out.push(callRuleWithoutData(rule))
        }
        for (const key of Object.keys(rule)) {
          visit(rule[key])
        }
      }
      visit(subtree)
      // An empty subtree grants nothing, even for `~all`.
      if (out.length === 0) {
        return false
      }
      return last === '~all' ? out.every(Boolean) : out.some(Boolean)
    }

    if (first.includes('.')) {
      args = [...parts, ...args.slice(1)]
    }
  }

  let rule: Rule | undefined = rules
  let i = 0
  for (; i < args.length && typeof rule === 'object'; i++) {
    rule = ownChild(rule, String(args[i]))
  }

  if (typeof rule === 'boolean') {
    const remainingPath = args.slice(i).some((a) => typeof a === 'string')
    if (remainingPath) {
      throw new PermixRuleNotDefinedError(pathFromArgs(args))
    }
    return rule
  }
  if (typeof rule === 'function') {
    return Boolean(rule(args[i]))
  }

  const path = args.slice(0, i + 1).join('.')
  throw new PermixRuleNotDefinedError(path)
}

export function createCheck<D extends Definition>(
  rules: Rules<D> | null | (() => Rules<D> | null)
) {
  return (...args: CheckArgs<D>): boolean => {
    const r = typeof rules === 'function' ? rules() : rules

    if (!r) {
      throw new PermixNotReadyError()
    }

    if (typeof args[0] === 'function') {
      return Boolean(args[0]((path, ...data) => walk(r, [path, ...data])))
    }

    return walk(r, args)
  }
}

export interface CheckContext<D extends Definition> {
  path: RulesPaths<D> | SpecialPath<D> | null
  data?: unknown
}

export function createCheckContext<D extends Definition>(
  ...params: CheckArgs<D>
): CheckContext<D> {
  const first = params[0]

  if (typeof first === 'function') {
    return { path: null }
  }

  const last = first.split('.').pop()
  if (isSpecialSymbol(last)) {
    return { path: first }
  }

  return { path: first, data: params[1] }
}
