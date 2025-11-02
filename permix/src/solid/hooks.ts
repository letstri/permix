import type { Permix, PermixDefinition, PermixRules } from '../core/create-permix'
import { createContext, useContext } from 'solid-js'
import { checkWithRules, getRules, validatePermix } from '../core/create-permix'

export interface PermixContext<T extends PermixDefinition> {
  permix: Permix<T>
  isReady: boolean
  rules?: PermixRules<T>
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

export function usePermix<T extends PermixDefinition>(permix: Permix<T>) {
  validatePermix(permix)

  const context = usePermixContext()

  validatePermix(context.permix)

  const check: typeof permix.check = (...args) => {
    return checkWithRules(context.rules ?? getRules(context.permix), ...args)
  }

  return { check, isReady: () => context.isReady }
}
