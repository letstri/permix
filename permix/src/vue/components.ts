import type { SetupContext, SlotsType, VNode } from 'vue'
import type { CheckArgs, Permix, Statement } from '../core'
import { usePermix } from './composables'

export interface CheckProps<D extends Statement> {
  path: CheckArgs<D>[0]
  data?: CheckArgs<D>[1]
  reverse?: boolean
}

type CheckContext = SetupContext<any, SlotsType<{
  default: void
  otherwise?: void
}>>

export interface PermixComponents<D extends Statement> {
  Check: (
    props: CheckProps<D>,
    context: CheckContext,
  ) => VNode | VNode[] | undefined
}

export function createComponents<D extends Statement>(permix: Permix<D>): PermixComponents<D> {
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
