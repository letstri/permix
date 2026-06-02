import { PermixError } from '../core/errors'

export class PermixInvalidAccessControlError extends PermixError {
  constructor() {
    super('`ac` must be a better-auth access controller created with `createAccessControl`.')
    this.name = 'PermixInvalidAccessControlError'
  }
}

export class PermixUnknownRoleError extends PermixError {
  role: string

  constructor(role: string) {
    super(`Unknown role "${role}". Pass it via the \`roles\` option to resolve roles by name.`)
    this.name = 'PermixUnknownRoleError'
    this.role = role
  }
}
