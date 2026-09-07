import type { JSX } from 'solid-js'
import { createMemo, createRenderEffect, onCleanup } from 'solid-js'
import { createStore } from 'solid-js/store'

import type {
  CheckArgs,
  DataAtPath,
  Definition,
  DehydratedState,
  Permix,
  RulesPaths,
} from '../core'
import type { PermixContext } from './hooks'
import { Context, usePermix, usePermixContext } from './hooks'

/**
 * Provides Permix context to the Solid component tree.
 *
 * @link https://permix.letstri.dev/docs/integrations/solid
 */
export function PermixProvider<D extends Definition>(props: {
  children: JSX.Element
  permix: Permix<D>
}): JSX.Element {
  const [context, setContext] = createStore<PermixContext<D>>({
    permix: props.permix,
    isReady: props.permix.isReady(),
    rules: props.permix.getRules(),
  })

  createRenderEffect(() => {
    const setup = props.permix.hook('setup', () => {
      setContext('rules', props.permix.getRules())
    })
    const ready = props.permix.hook('ready', () => {
      setContext('isReady', props.permix.isReady())
    })

    onCleanup(() => {
      setup()
      ready()
    })
  })

  return <Context.Provider value={context}>{props.children}</Context.Provider>
}

export function PermixHydrate(props: {
  children: JSX.Element
  state: DehydratedState<any>
}) {
  const context = usePermixContext()

  createRenderEffect(() => {
    context.permix.hydrate(props.state)
  })

  return props.children
}

export interface CheckProps<D extends Definition, P extends RulesPaths<D>> {
  path: P
  data?: DataAtPath<D, P>[0]
  children: JSX.Element
  otherwise?: JSX.Element
  reverse?: boolean
}

export interface PermixComponents<D extends Definition> {
  Check: <P extends RulesPaths<D>>(props: CheckProps<D, P>) => JSX.Element
}

export function createComponents<D extends Definition>(
  permix: Pick<Permix<D>, 'getRules' | 'check'>
): PermixComponents<D> {
  function Check<P extends RulesPaths<D>>(
    props: CheckProps<D, P>
  ): JSX.Element {
    const context = usePermix(permix)
    const hasPermission = createMemo(() =>
      context.check(...([props.path, props.data] as unknown as CheckArgs<D>))
    )

    return (
      <>
        {props.reverse
          ? hasPermission()
            ? props.otherwise || null
            : props.children
          : hasPermission()
            ? props.children
            : props.otherwise || null}
      </>
    )
  }

  return {
    Check,
  }
}
