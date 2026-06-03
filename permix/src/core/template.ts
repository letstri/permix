import type { Definition } from './definitions'
import type { Rules } from './rules'

export function createTemplate<D extends Definition, T = void>(
  rules: Rules<D> | ((param: T) => Rules<D>),
) {
  if (typeof rules === 'function') {
    return (param: T) => rules(param)
  }

  return () => rules
}
