import type { PermixDefinition, PermixRules } from './create-permix'
import { isRulesValid } from './utils'

export function createTemplate<Definition extends PermixDefinition, T = void>(rules: PermixRules<Definition> | ((param: T) => PermixRules<Definition>)) {
  function validate(p: PermixRules<Definition>) {
    if (!isRulesValid(p)) {
      throw new Error('[Permix]: Permissions in template are not valid.')
    }
  }

  if (typeof rules === 'function') {
    return (param: T) => {
      const p = rules(param)

      validate(p)

      return p
    }
  }

  validate(rules)

  return () => rules
}
