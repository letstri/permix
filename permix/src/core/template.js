export function createTemplate(rules) {
    if (typeof rules === 'function') {
        return param => rules(param)
    }
    return () => rules
}
