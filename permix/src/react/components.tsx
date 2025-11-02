import type { Permix, PermixDefinition } from '../core'
import type { PermixStateJSON } from '../core/create-permix'
import type { CheckFunctionObject } from '../core/params'
import type { PermixContext } from './hooks'
import * as React from 'react'
import { getRules, validatePermix } from '../core/create-permix'
import { Context, usePermix, usePermixContext } from './hooks'

/**
 * Provider that provides the Permix context to your React components.
 *
 * @link https://permix.letstri.dev/docs/integrations/react
 */
export function PermixProvider<Permissions extends PermixDefinition>({
  children,
  permix,
}: { children: React.ReactNode, permix: Permix<Permissions> }) {
  validatePermix(permix)

  const [context, setContext] = React.useState<PermixContext<Permissions>>(() => ({
    permix,
    isReady: permix.isReady(),
    rules: getRules(permix),
  }))

  React.useEffect(() => {
    const setup = permix.hook('setup', () => setContext(c => ({ ...c, rules: getRules(permix) })))
    const ready = permix.hook('ready', () => setContext(c => ({ ...c, isReady: permix.isReady() })))

    return () => {
      setup()
      ready()
    }
  }, [permix])

  return (
    // eslint-disable-next-line react/no-context-provider
    <Context.Provider value={context}>
      {children}
    </Context.Provider>
  )
}

export function PermixHydrate({ children, state }: { children: React.ReactNode, state: PermixStateJSON<any> }) {
  const { permix } = usePermixContext()

  validatePermix(permix)

  React.useMemo(() => permix.hydrate(state), [permix, state])

  return children
}

export type CheckProps<Permissions extends PermixDefinition, K extends keyof Permissions> = CheckFunctionObject<Permissions, K> & {
  children: React.ReactNode
  otherwise?: React.ReactNode
  reverse?: boolean
}

export interface PermixComponents<Permissions extends PermixDefinition> {
  Check: <K extends keyof Permissions>(props: CheckProps<Permissions, K>) => React.ReactNode
}

// eslint-disable-next-line react-refresh/only-export-components
export function createComponents<Permissions extends PermixDefinition>(permix: Permix<Permissions>): PermixComponents<Permissions> {
  function Check<K extends keyof Permissions>({
    children,
    entity,
    action,
    data,
    otherwise = null,
    reverse = false,
  }: CheckProps<Permissions, K>) {
    const { check } = usePermix(permix)

    const hasPermission = check(entity, action, data)
    return reverse
      ? hasPermission ? otherwise : children
      : hasPermission ? children : otherwise
  }

  Check.displayName = 'Check'

  return {
    Check,
  }
}
