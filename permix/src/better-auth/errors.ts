import { PermixError } from '../core/errors'

export class PermixRoleNotFoundError extends PermixError {
  role: string

  constructor(role: string) {
    super(`Role "${role}" was not provided. Make sure it is included in the \`roles\` option passed to \`createPermix\`.`)
    this.name = 'PermixRoleNotFoundError'
    this.role = role
  }
}

export class PermixInvalidRoleInputError extends PermixError {
  constructor() {
    super('Invalid role input. Expected a role name string, a Role object, or an array of either.')
    this.name = 'PermixInvalidRoleInputError'
  }
}
