import { getContext, onDestroy, setContext } from 'svelte'

import type { Definition, Permix, Rules } from '../core'
import { createCheck } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  isReady: boolean
  rules: Rules<T> | null
}

const PERMIX_CONTEXT_KEY = Symbol('svelte-permix')

/**
 * Provides Permix context to the Svelte component tree.
 *
 * Must be called during component initialization (inside `<PermixProvider>`).
 *
 * @link https://permix.letstri.dev/docs/integrations/svelte
 */
export function providePermix<T extends Definition>(permix: Permix<T>): void {
  const context = $state<PermixContext<T>>({
    permix,
    isReady: permix.isReady(),
    rules: permix.getRules(),
  })

  setContext(PERMIX_CONTEXT_KEY, context)

  const setup = permix.hook('setup', () => {
    context.rules = permix.getRules()
  })
  const ready = permix.hook('ready', () => {
    context.isReady = permix.isReady()
  })

  onDestroy(() => {
    setup()
    ready()
  })
}

export function usePermixContext<T extends Definition>(): PermixContext<T> {
  const context = getContext<PermixContext<T> | undefined>(PERMIX_CONTEXT_KEY)

  if (!context) {
    throw new Error(
      '[Permix]: Looks like you forgot to wrap your app with <PermixProvider>'
    )
  }

  return context
}

/**
 * Access Permix check and readiness state inside a Svelte component.
 *
 * @link https://permix.letstri.dev/docs/integrations/svelte
 */
export function usePermix<T extends Definition>(
  permix: Pick<Permix<T>, 'getRules' | 'check'>
) {
  const context = usePermixContext<T>()

  const check: Permix<T>['check'] = (...args) =>
    createCheck<T>(() => context.rules ?? permix.getRules())(...args)

  return {
    check,
    get isReady() {
      return context.isReady
    },
  }
}
