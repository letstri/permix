import type { PermixDefinition } from './create-permix'

export type CheckFunctionParams<Definition extends PermixDefinition, K extends keyof Definition> = Definition[K]['dataRequired'] extends true
  ? [
      entity: K,
      action: 'all' | 'any' | Definition[K]['action'] | Definition[K]['action'][],
      data: Definition[K]['dataType'],
    ] : [
      entity: K,
      action: 'all' | 'any' | Definition[K]['action'] | Definition[K]['action'][],
      data?: Definition[K]['dataType'],
    ]

export type CheckFunctionObject<Definition extends PermixDefinition, K extends keyof Definition> = Definition[K]['dataRequired'] extends true
  ? {
      entity: K
      action: 'all' | 'any' | Definition[K]['action'] | Definition[K]['action'][]
      data: Definition[K]['dataType']
    }
  : {
      entity: K
      action: 'all' | 'any' | Definition[K]['action'] | Definition[K]['action'][]
      data?: Definition[K]['dataType']
    }

export interface CheckContext<Definition extends PermixDefinition> {
  entity: keyof Definition
  actions: Definition[keyof Definition]['action'][]
}

export function createCheckContext<Definition extends PermixDefinition>(
  ...params: CheckFunctionParams<Definition, keyof Definition>
): CheckContext<Definition> {
  const [entity, action] = params

  return {
    entity,
    actions: Array.isArray(action) ? action : [action],
  }
}
