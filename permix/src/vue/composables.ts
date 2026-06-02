import type { Definition, Permix, Rules } from '../core'
import { computed } from 'vue'
import { createCheck } from '../core'
import { usePermixContext } from './context'

/**
 * Composable that provides the Permix context to your Vue components.
 *
 * @link https://permix.letstri.dev/docs/integrations/vue
 */
export function usePermix<T extends Definition>(permix: Pick<Permix<T>, 'getRules' | 'check'>) {
  const context = usePermixContext()

  const check: Permix<T>['check'] = (...args) =>
    createCheck<T>(() => (context.value.rules ?? permix.getRules()) as Rules<T> | null)(...args)

  return { check, isReady: computed(() => context.value.isReady) }
}
