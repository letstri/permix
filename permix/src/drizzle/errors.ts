import { PermixError } from '../core/errors'

export class PermixInvalidActionsError extends PermixError {
  constructor() {
    super('`actions` must be a non-empty array of strings.')
    this.name = 'PermixInvalidActionsError'
  }
}
