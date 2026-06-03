import type { Component, Snippet } from 'svelte'
import type { DataAtPath, Definition, Permix, RulesPaths } from '../core'
import Check from './Check.svelte'

export interface CheckProps<D extends Definition, P extends RulesPaths<D>> {
  path: P
  data?: DataAtPath<D, P>[0]
  reverse?: boolean
  children: Snippet
  otherwise?: Snippet
}

export interface PermixComponents<D extends Definition> {
  Check: Component<CheckProps<D, RulesPaths<D>>>
}

/**
 * Creates type-safe Permix components for Svelte bound to your instance.
 *
 * @link https://permix.letstri.dev/docs/integrations/svelte
 */
export function createComponents<D extends Definition>(
  // eslint-disable-next-line unused-imports/no-unused-vars
  permix: Pick<Permix<D>, 'getRules' | 'check'>,
): PermixComponents<D> {
  return {
    Check: Check as unknown as PermixComponents<D>['Check'],
  }
}
