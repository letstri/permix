import type { Definition, Permix, Rules } from '../core'
import * as React from 'react'
import { createCheck } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  isReady: boolean
  rules: Rules<T> | null
}

export const Context = React.createContext<PermixContext<any>>(null!)

export function usePermixContext() {
  const context = React.useContext(Context)

  if (!context) {
    throw new Error('[Permix]: Looks like you forgot to wrap your app with <PermixProvider>')
  }

  return context
}

/**
 * Hook that provides the Permix reactive methods to your React components.
 *
 * @link https://permix.letstri.dev/docs/integrations/react
 */
export function usePermix<T extends Definition>(permix: Permix<T>) {
  const { isReady, rules } = usePermixContext()

  const check: Permix<T>['check'] = React.useCallback((...args) => {
    const resolved = (rules ?? permix.getRules()) as Rules<T> | null
    if (!resolved)
      return false
    try {
      return createCheck<T>(resolved)(...args)
    }
    catch {
      return false
    }
  }, [rules, permix])

  return { check, isReady }
}
