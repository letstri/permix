import type { CheckArgs, DataAtPath, Definition, DehydratedState, Permix, RulesPaths } from '../core'
import type { PermixContext } from './hooks'
import * as React from 'react'
import { Context, usePermix, usePermixContext } from './hooks'

/**
 * Provides Permix context to the React component tree.
 *
 * @link https://permix.letstri.dev/docs/integrations/react
 */
export function PermixProvider<D extends Definition>({
  children,
  permix,
}: { children: React.ReactNode, permix: Permix<D> }) {
  const [context, setContext] = React.useState<PermixContext<D>>(() => ({
    permix,
    isReady: permix.isReady(),
    rules: permix.getRules(),
  }))

  React.useEffect(() => {
    const setup = permix.hook('setup', () => setContext(c => ({ ...c, rules: permix.getRules() })))
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

export function PermixHydrate({ children, state }: { children: React.ReactNode, state: DehydratedState<any> }) {
  const { permix } = usePermixContext()

  // eslint-disable-next-line react/use-memo
  React.useMemo(() => permix.hydrate(state), [permix, state])

  return children
}

export interface CheckProps<D extends Definition, P extends RulesPaths<D>> {
  path: P
  data?: DataAtPath<D, P>[0]
  children: React.ReactNode
  otherwise?: React.ReactNode
  reverse?: boolean
}

export interface PermixComponents<D extends Definition> {
  Check: <P extends RulesPaths<D>>(props: CheckProps<D, P>) => React.ReactNode
}

export function createComponents<D extends Definition>(permix: Pick<Permix<D>, 'getRules' | 'check'>): PermixComponents<D> {
  function Check<P extends RulesPaths<D>>({
    children,
    path,
    data,
    otherwise = null,
    reverse = false,
  }: CheckProps<D, P>) {
    const { check } = usePermix(permix)

    const hasPermission = check(...([path, data] as unknown as CheckArgs<D>))
    return reverse
      ? hasPermission ? otherwise : children
      : hasPermission ? children : otherwise
  }

  Check.displayName = 'Check'

  return {
    Check,
  }
}
