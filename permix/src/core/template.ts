import type { Rules } from './rules'
import type { Statement } from './statements'

export function createTemplate<D extends Statement, T = void>(
  rules: Rules<D> | ((param: T) => Rules<D>),
) {
  if (typeof rules === 'function') {
    return (param: T) => rules(param)
  }

  return () => rules
}
