import type { InjectionKey, Plugin, Ref } from 'vue'
import type { Permix, Rules } from '../core'
import { ref } from 'vue'

export const PERMIX_CONTEXT_KEY = Symbol('vue-permix') as InjectionKey<Ref<{
  permix: Permix<any>
  rules: Rules<any> | null
  isReady: boolean
}>>

/**
 * Vue plugin that provides the Permix context to your application.
 *
 * @link https://permix.letstri.dev/docs/integrations/vue
 */
export const permixPlugin: Plugin<{ permix: Permix<any> }> = (app, { permix }) => {
  if (!permix) {
    throw new Error('[Permix]: Looks like you forgot to provide the permix instance to the plugin')
  }

  const context = ref({
    permix,
    rules: permix.getRules(),
    isReady: permix.isReady(),
  })

  app.provide(PERMIX_CONTEXT_KEY, context)

  permix.hook('setup', () => {
    context.value.rules = permix.getRules()
  })

  permix.hook('ready', () => {
    context.value.isReady = permix.isReady()
  })
}
