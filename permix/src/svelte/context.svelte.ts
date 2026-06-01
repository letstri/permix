import type { Definition, Permix, Rules } from '../core'
import { getContext, setContext } from 'svelte'
import { createCheck } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  isReady: boolean
  rules: Rules<T> | null
}

const PERMIX_CONTEXT_KEY = Symbol('svelte-permix')

/**
 * Provides the Permix context to your Svelte components.
 *
 * Must be called during component initialization (e.g. inside `<PermixProvider>`).
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

  $effect(() => {
    const setup = permix.hook('setup', () => {
      context.rules = permix.getRules()
    })
    const ready = permix.hook('ready', () => {
      context.isReady = permix.isReady()
    })

    return () => {
      setup()
      ready()
    }
  })
}

// eslint-disable-next-line react/no-unnecessary-use-prefix
export function usePermixContext<T extends Definition>(): PermixContext<T> {
  const context = getContext<PermixContext<T> | undefined>(PERMIX_CONTEXT_KEY)

  if (!context) {
    throw new Error('[Permix]: Looks like you forgot to wrap your app with <PermixProvider>')
  }

  return context
}

/**
 * Hook that provides the Permix reactive methods to your Svelte components.
 *
 * @link https://permix.letstri.dev/docs/integrations/svelte
 */
export function usePermix<T extends Definition>(permix: Pick<Permix<T>, 'getRules' | 'check'>) {
  const context = usePermixContext<T>()

  const check: Permix<T>['check'] = (...args) => {
    const resolved = (context.rules ?? permix.getRules()) as Rules<T> | null
    if (!resolved)
      return false
    try {
      return createCheck<T>(resolved)(...args)
    }
    catch {
      return false
    }
  }

  return {
    check,
    get isReady() {
      return context.isReady
    },
  }
}
