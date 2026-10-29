import * as React from 'react'

import type { Definition, Permix, Rules } from '../core'
import { createCheck } from '../core'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  isReady: boolean
}

export const Context = React.createContext<PermixContext<any>>(null!)

export function usePermixContext() {
  const context = React.useContext(Context)

  if (!context) {
    throw new Error(
      '[Permix]: Looks like you forgot to wrap your app with <PermixProvider>'
    )
  }

  return context
}

/**
 * Access Permix check and readiness state inside a React component.
 *
 * @link https://permix.letstri.dev/docs/integrations/react
 */
export function usePermix<T extends Definition>(
  permix: Pick<Permix<T>, 'getRules' | 'check'>
) {
  const { permix: instance, isReady } = usePermixContext()

  // `hydrate()` fires `setup` while `PermixHydrate` renders; defer to avoid
  // updating this component during another component's render.
  const subscribe = React.useCallback(
    (onChange: () => void) =>
      instance.hook('setup', () => {
        queueMicrotask(onChange)
      }),
    [instance]
  )
  const getRules = React.useCallback(
    () => (instance.getRules() ?? permix.getRules()) as Rules<T> | null,
    [instance, permix]
  )

  // Read rules from the instance on every render instead of a provider snapshot,
  // so a `PermixHydrate` above this component applies in the same pass (incl. SSR).
  const rules = React.useSyncExternalStore(subscribe, getRules, getRules)

  const check: Permix<T>['check'] = React.useCallback(
    (...args) => createCheck<T>(() => rules)(...args),
    [rules]
  )

  return { check, isReady }
}
