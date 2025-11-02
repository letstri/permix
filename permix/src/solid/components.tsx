import type { JSX } from 'solid-js'
import type { Permix, PermixDefinition } from '../core'
import type { PermixStateJSON } from '../core/create-permix'
import type { CheckFunctionObject } from '../core/params'
import type { PermixContext } from './hooks'
import { createEffect, createMemo, onCleanup } from 'solid-js'
import { createStore } from 'solid-js/store'
import { getRules, validatePermix } from '../core/create-permix'
import { Context, usePermix, usePermixContext } from './hooks'

/**
 * Provider that provides the Permix context to your Solid components.
 *
 * @link https://permix.letstri.dev/docs/integrations/solid
 */
export function PermixProvider<Permissions extends PermixDefinition>(props: {
  children: JSX.Element
  permix: Permix<Permissions>
}): JSX.Element {
  validatePermix(props.permix)

  const [context, setContext] = createStore<PermixContext<Permissions>>({
    permix: props.permix,
    isReady: props.permix.isReady(),
    rules: getRules(props.permix),
  })

  createEffect(() => {
    const setup = props.permix.hook('setup', () => setContext('rules', getRules(props.permix)))
    const ready = props.permix.hook('ready', () => setContext('isReady', props.permix.isReady()))

    onCleanup(() => {
      setup()
      ready()
    })
  })

  return (
    <Context.Provider value={context}>
      {props.children}
    </Context.Provider>
  )
}

export function PermixHydrate(props: { children: JSX.Element, state: PermixStateJSON<any> }) {
  const context = usePermixContext()

  validatePermix(context.permix)

  context.permix.hydrate(props.state)

  return props.children
}

export type CheckProps<Permissions extends PermixDefinition, K extends keyof Permissions> = CheckFunctionObject<Permissions, K> & {
  children: JSX.Element
  otherwise?: JSX.Element
  reverse?: boolean
}

export interface PermixComponents<Permissions extends PermixDefinition> {
  Check: <K extends keyof Permissions>(props: CheckProps<Permissions, K>) => JSX.Element
}

export function createComponents<Permissions extends PermixDefinition>(permix: Permix<Permissions>): PermixComponents<Permissions> {
  function Check<K extends keyof Permissions>(props: CheckProps<Permissions, K>): JSX.Element {
    const context = usePermix(permix)
    const hasPermission = createMemo(() => context.check(props.entity, props.action, props.data))

    return (
      <>
        {props.reverse
          ? hasPermission() ? (props.otherwise || null) : props.children
          : hasPermission() ? props.children : (props.otherwise || null)}
      </>
    )
  }

  return {
    Check,
  }
}
