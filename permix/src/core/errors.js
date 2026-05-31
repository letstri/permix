export class PermixError extends Error {
    constructor(message) {
        super(`[Permix]: ${message}`)
        this.name = 'PermixError'
    }
}
export class PermixNotReadyError extends PermixError {
    constructor() {
        super('Call setup() before using check() or dehydrate().')
        this.name = 'PermixNotReadyError'
    }
}
export class PermixRuleNotDefinedError extends PermixError {
    path
    constructor(path) {
        super(`Rule "${path}" is not defined.`)
        this.name = 'PermixRuleNotDefinedError'
        this.path = path
    }
}
export class PermixNotFoundError extends PermixError {
    key
    constructor(key) {
        super('Instance not found. Please use the `setupMiddleware` function.')
        this.name = 'PermixNotFoundError'
        this.key = key
    }
}
