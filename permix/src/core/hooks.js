export function createHooks() {
    const hooks = new Map()
    function getList(name) {
        let list = hooks.get(name)
        if (!list) {
            list = []
            hooks.set(name, list)
        }
        return list
    }
    const hook = (name, fn) => {
        getList(name).push(fn)
        return () => {
            const list = hooks.get(name)
            if (!list)
                return
            const index = list.indexOf(fn)
            if (index !== -1)
                list.splice(index, 1)
        }
    }
    const hookOnce = (name, fn) => {
        let remove
        const wrapper = (...args) => {
            remove?.()
            fn(...args)
        }
        remove = hook(name, wrapper)
    }
    const removeHook = (name, fn) => {
        const list = hooks.get(name)
        if (!list)
            return
        const index = list.indexOf(fn)
        if (index !== -1)
            list.splice(index, 1)
    }
    const callHook = (name, ...args) => {
        const list = hooks.get(name)
        if (!list)
            return
        for (const fn of [...list]) {
            fn(...args)
        }
    }
    const clearHook = (name) => {
        hooks.delete(name)
    }
    const clearAllHooks = () => {
        hooks.clear()
    }
    return {
        hook,
        hookOnce,
        removeHook,
        callHook,
        clearHook,
        clearAllHooks,
    }
}
