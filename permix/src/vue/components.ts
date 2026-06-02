import type { PropType, SetupContext, SlotsType, VNode } from 'vue'
import type { CheckArgs, Definition, DehydratedState, Permix } from '../core'
import { defineComponent, onUnmounted, watch } from 'vue'
import { usePermix } from './composables'
import { providePermixContext, usePermixContext } from './context'

/**
 * Provider that supplies the Permix context to your Vue components.
 *
 * @link https://permix.letstri.dev/docs/integrations/vue
 */
export const PermixProvider = defineComponent({
  name: 'PermixProvider',
  props: {
    permix: {
      type: Object as PropType<Permix<any>>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const cleanup = providePermixContext(props.permix)

    onUnmounted(cleanup)

    return () => slots.default?.()
  },
})

export interface CheckProps<D extends Definition> {
  path: CheckArgs<D>[0]
  data?: CheckArgs<D>[1]
  reverse?: boolean
}

type CheckContext = SetupContext<any, SlotsType<{
  default: void
  otherwise?: void
}>>

export interface PermixComponents<D extends Definition> {
  Check: (
    props: CheckProps<D>,
    context: CheckContext,
  ) => VNode | VNode[] | undefined
}

/**
 * Restores dehydrated server permissions on the client.
 *
 * @link https://permix.letstri.dev/docs/integrations/vue
 */
export const PermixHydrate = defineComponent({
  name: 'PermixHydrate',
  props: {
    state: {
      type: Object as PropType<DehydratedState<any>>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const context = usePermixContext()

    const hydrate = () => context.value.permix.hydrate(props.state)

    hydrate()
    watch(() => props.state, hydrate)

    return () => slots.default?.()
  },
})

export function createComponents<D extends Definition>(permix: Pick<Permix<D>, 'getRules' | 'check'>): PermixComponents<D> {
  function Check(
    props: CheckProps<D>,
    context: CheckContext,
  ) {
    const { check } = usePermix(permix)

    const hasPermission = check(...([props.path, props.data] as unknown as CheckArgs<D>))
    return props.reverse
      ? (hasPermission ? context.slots.otherwise?.() : context.slots.default?.())
      : (hasPermission ? context.slots.default?.() : context.slots.otherwise?.())
  }

  Check.inheritAttrs = false
  Check.props = {
    path: {
      type: String,
      required: true,
    },
    data: {
      type: Object,
      required: false,
    },
    reverse: {
      type: Boolean,
      required: false,
      default: false,
    },
  }

  return {
    Check,
  }
}
