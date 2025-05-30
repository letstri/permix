import type { Plugin } from 'vue'
import type { Permix } from '../core'
import { ref } from 'vue'
import { getRules, validatePermix } from '../core/create-permix'

export const PERMIX_CONTEXT_KEY = 'vue-permix'

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
    state: getRules(permix),
    isReady: false,
  })

  app.provide(PERMIX_CONTEXT_KEY, context)

  permix.hook('setup', () => {
    context.value.state = getRules(permix)
  })

  permix.hook('ready', () => {
    context.value.isReady = permix.isReady()
  })
}
