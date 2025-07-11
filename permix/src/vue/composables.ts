import type { Permix, PermixDefinition } from '../core/create-permix'
import { computed, inject } from 'vue'
import { checkWithRules, validatePermix } from '../core/create-permix'
import { PERMIX_CONTEXT_KEY } from './plugin'

function usePermixContext() {
  const context = inject(PERMIX_CONTEXT_KEY)

  if (!context) {
    throw new Error('[Permix]: Looks like you forgot to install the plugin')
  }

  return context
}

/**
 * Composable that provides the Permix context to your Vue components.
 *
 * @link https://permix.letstri.dev/docs/integrations/vue
 */
export function usePermix<T extends PermixDefinition>(
  permix: Permix<T>,
) {
  validatePermix(permix)

  const context = usePermixContext()

  const check: typeof permix.check = (...args) => {
    validatePermix(context.value.permix)
    return checkWithRules(context.value.state!, ...args)
  }

  return { check, isReady: computed(() => context.value.isReady) }
}
