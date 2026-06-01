import type { Definition, Permix, Rules } from '../core'
import { computed, inject } from 'vue'
import { createCheck } from '../core'
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
export function usePermix<T extends Definition>(
  permix: Permix<T>,
) {
  const context = usePermixContext()

  const check: Permix<T>['check'] = (...args) => {
    const resolved = (context.value.rules ?? permix.getRules()) as Rules<T> | null
    if (!resolved)
      return false
    try {
      return createCheck<T>(resolved)(...args)
    }
    catch {
      return false
    }
  }

  return { check, isReady: computed(() => context.value.isReady) }
}
