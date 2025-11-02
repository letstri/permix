import type { InjectionKey, Plugin, Ref } from 'vue'
import type { Permix, PermixRules } from '../core'
import { ref } from 'vue'
import { getRules, validatePermix } from '../core/create-permix'

export const PERMIX_CONTEXT_KEY = Symbol('vue-permix') as InjectionKey<Ref<{
  permix: Permix<any>
  rules?: PermixRules<any>
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

  validatePermix(permix)

  const context = ref({
    permix,
    rules: getRules(permix),
    isReady: false,
  })

  app.provide(PERMIX_CONTEXT_KEY, context)

  permix.hook('setup', () => {
    context.value.rules = getRules(permix)
  })

  permix.hook('ready', () => {
    context.value.isReady = permix.isReady()
  })
}
