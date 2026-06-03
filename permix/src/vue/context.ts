import type { InjectionKey, Ref } from 'vue'
import type { Definition, Permix, Rules } from '../core'
import { inject, provide, ref } from 'vue'

export interface PermixContext<T extends Definition> {
  permix: Permix<T>
  isReady: boolean
  rules: Rules<T> | null
}

export const PERMIX_CONTEXT_KEY = Symbol('vue-permix') as InjectionKey<Ref<PermixContext<any>>>

export function providePermixContext(permix: Permix<any>) {
  if (!permix) {
    throw new Error('[Permix]: Looks like you forgot to provide the permix instance to PermixProvider')
  }

  const context = ref({
    permix,
    rules: permix.getRules(),
    isReady: permix.isReady(),
  })

  provide(PERMIX_CONTEXT_KEY, context)

  const setup = permix.hook('setup', () => {
    context.value.rules = permix.getRules()
  })

  const ready = permix.hook('ready', () => {
    context.value.isReady = permix.isReady()
  })

  return () => {
    setup()
    ready()
  }
}

export function usePermixContext<T extends Definition = any>() {
  const context = inject(PERMIX_CONTEXT_KEY)

  if (!context) {
    throw new Error('[Permix]: Looks like you forgot to wrap your app with <PermixProvider>')
  }

  return context as Ref<PermixContext<T>>
}
