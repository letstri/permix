type HookFn = (...args: any[]) => void

export function createHooks<T extends { [K in keyof T]: HookFn } = Record<string, HookFn>>() {
  const hooks = new Map<keyof T, HookFn[]>()

  function getList(name: keyof T): HookFn[] {
    let list = hooks.get(name)
    if (!list) {
      list = []
      hooks.set(name, list)
    }
    return list
  }

  const hook = <K extends keyof T>(name: K, fn: T[K]): (() => void) => {
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

  const hookOnce = <K extends keyof T>(name: K, fn: T[K]): void => {
    let remove: (() => void) | undefined
    const wrapper: HookFn = (...args) => {
      remove?.()
      fn(...args)
    }
    remove = hook(name, wrapper as T[K])
  }

  const removeHook = <K extends keyof T>(name: K, fn: T[K]): void => {
    const list = hooks.get(name)
    if (!list)
return
    const index = list.indexOf(fn)
    if (index !== -1)
list.splice(index, 1)
  }

  const callHook = <K extends keyof T>(name: K, ...args: Parameters<T[K]>): void => {
    const list = hooks.get(name)
    if (!list)
return
    for (const fn of [...list]) {
      fn(...args)
    }
  }

  const clearHook = <K extends keyof T>(name: K): void => {
    hooks.delete(name)
  }

  const clearAllHooks = (): void => {
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
