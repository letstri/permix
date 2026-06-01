import type { Definition, Permix, Rules } from '../core'
import { createContext, useContext } from 'solid-js'
import { createCheck } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  isReady: boolean
  rules: Rules<T> | null
}

export const Context = createContext<PermixContext<any>>(null!)

export function usePermixContext() {
  const context = useContext(Context)

  if (!context) {
    throw new Error('[Permix]: Looks like you forgot to wrap your app with <PermixProvider>')
  }

  return context
}

/**
 * Hook that provides the Permix reactive methods to your Solid components.
 *
 * @link https://permix.letstri.dev/docs/integrations/solid
 */
export function usePermix<T extends Definition>(permix: Pick<Permix<T>, 'getRules' | 'check'>) {
  const context = usePermixContext()

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

  return { check, isReady: () => context.isReady }
}
